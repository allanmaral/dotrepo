import { readFile, writeFile } from 'fs/promises'
import log from "npmlog";
import { relative, resolve } from "path";

import { Graph } from "../graph/index";
import { Configuration } from "../config";
import {
  calculateRelativePathBetweenFiles,
  cleanStringForRegex,
  glob
} from "../utils";
import { grammar } from "../grammar";
import { LockFile } from '../lock';

import { Project, Dependency, DependencyType } from "./project";

/**
 * Load a single project from a .csproj file.
 * @param path Path to the .csproj file.
 * @returns A project description object.
 */
export async function loadProject(path: string): Promise<Project> {
  const id = path.match(grammar.project.id)?.[1];
  if (!id) throw new Error(`Invalid project path "${path}"`);

  const fileContent = await readFile(path, "utf8");

  const version = fileContent.match(grammar.project.version)?.[1].trim() || "";
  const referenceTags = fileContent.match(grammar.project.reference.tag) || [];
  const dependencies = referenceTags.map<Dependency>((tag) => {
    const dependencyInclude =
      tag.match(grammar.project.reference.include)?.[1] || "";
    const dependencyVersion =
      tag.match(grammar.project.reference.version)?.[1] || "";
    const dependencyType = tag.startsWith("<Package")
      ? DependencyType.Package
      : DependencyType.Project;

    if (dependencyType === DependencyType.Project) {
      const projectId = dependencyInclude.match(grammar.project.id)?.[1] || "";
      if (!projectId || !dependencyInclude)
        throw new Error(`Failed to pase reference tag: "${tag}"`);

      return {
        id: projectId,
        path: dependencyInclude,
        type: dependencyType,
      };
    } else {
      if (!dependencyInclude || !dependencyVersion)
        throw new Error(`Failed to pase reference tag: "${tag}"`);

      return {
        id: dependencyInclude,
        version: dependencyVersion,
        type: dependencyType,
      };
    }
  });

  return {
    id,
    version,
    dependencies,
    path,
  };
}

/**
 * Remove all dependencies that are not local to the repository.
 * @param project Project to remove external dependencies from.
 * @param localProjectsSet List of local projects.
 * @returns A copy of the project with all external dependencies removed.
 */
function removeExternalDependencies(
  project: Project,
  localProjectsSet: Set<string>
): Project {
  const dependencies = project.dependencies.filter((dependency) =>
    localProjectsSet.has(dependency.id)
  );
  return {
    ...project,
    dependencies,
  };
}

/**
 * Load all projects from a workspace.
 *
 * @param path Path to the workspace.
 * @param config Configuration for the workspace.
 * @returns A list of project description objects.
 */
export async function loadWorkspaceProjects(
  path: string,
  config?: Configuration
): Promise<Record<string, Project>> {
  const projectFileNames: Set<string> = new Set();

  if (config?.packages) {
    for(const pkg of config.packages) {
      const projectFiles = await glob(`${path}/${pkg}/**/*.csproj`);
      projectFiles.forEach((filename) => projectFileNames.add(filename));
    };
  } else {
    const projectFiles = await glob(`${path}/**/*.csproj`);
    projectFiles.forEach((filename) => projectFileNames.add(filename));
  }

  const projectsWithExternalDeps = await Promise.all(Array.from(projectFileNames).map(
    (fileName) => loadProject(fileName)
  ));
  const worskspaceProjectIds = new Set(
    projectsWithExternalDeps.map((p) => p.id)
  );
  const projects = projectsWithExternalDeps
    .map((p) => removeExternalDependencies(p, worskspaceProjectIds))
    .filter((p) => p.version || p.dependencies.length > 0);

  return projects.reduce<Record<string, Project>>((acc, project) => {
    project.path = relative(path, project.path);
    acc[project.id] = project;
    return acc;
  }, {});
}

/**
 * Create a dependency graph from a list of projects.
 * @param projects Projects to be included in the graph.
 * @returns A graph of the projects and their dependencies.
 */
export function createDependencyGraph(
  projects: Record<string, Project>
): Graph {
  const graph = new Graph();
  const projectIds = Object.keys(projects);
  projectIds.forEach((projectId) => {
    const project = projects[projectId];
    graph.addNode(project.id, project);
  });
  projectIds.forEach((projectId) => {
    const project = projects[projectId];
    project.dependencies.forEach((dependency) => {
      graph.addEdge(project.id, dependency.id);
    });
  });

  return graph;
}

// ##########################
// #### Development Mode ####
// ##########################

/**
 * Create a Regular Expression to find a package reference of a given package.
 *
 * @param packageId Package ID to find.
 * @returns A Regular Expression to find the package reference.
 */
function getPackageReferenceExpression(packageId: string): RegExp {
  const packageIdExp = cleanStringForRegex(packageId);
  const regExp = `<PackageReference Include="${packageIdExp}"[^\/>]+\/>`;
  return new RegExp(regExp, "i");
}

/**
 * Create a Regular Expression to find a project reference of a given project.
 *
 * @param projectPath Project path to find.
 * @returns A Regular Expression to find the project reference.
 */
function getProjectReferenceExpression(projectPath: string): RegExp {
  const packageIdExp = cleanStringForRegex(projectPath);
  const regExp = `<ProjectReference Include="${packageIdExp}"[^\/>]+\/>`;
  return new RegExp(regExp, "i");
}

export async function setupProjectsToDevelopment(
  projects: Record<string, Project>,
  path: string,
  lock: LockFile
): Promise<void> {
  if (lock.inDevelopment) {
    throw new Error("Already in development mode, aborting.");
  }

  await Promise.all(Object.keys(projects).map(async (projectId) => {
    log.silly(
      "DotRepo",
      `Setting up project "%s" to development mode`,
      projectId
    );
    const project = projects[projectId];
    const fullPath = resolve(path, project.path);

    let projectFile = await readFile(fullPath, "utf8");
    project.dependencies.forEach((dependency) => {
      const dependencyId = dependency.id;
      const dependencyProject = projects[dependencyId];
      if (dependency.type === DependencyType.Package) {
        const relativePathToDependency = calculateRelativePathBetweenFiles(
          project.path,
          dependencyProject.path
        );
        const packageReferenceExp = getPackageReferenceExpression(dependencyId);
        projectFile = projectFile.replace(
          packageReferenceExp,
          `<ProjectReference Include="${relativePathToDependency}" />`
        );
      }
    });

    await writeFile(fullPath, projectFile);
  }));
}

export async function restoreProjectsToRelease(
  projects: Record<string, Project>,
  path: string,
  lock: LockFile
): Promise<void> {
  if (!lock.inDevelopment) {
    throw new Error("Not in development mode, aborting.");
  }

  await Promise.all(Object.keys(projects).map(async (projectId) => {
    log.silly("DotRepo", `Restoring project "%s" to release mode`, projectId);
    const project = projects[projectId];
    const fullPath = resolve(path, project.path);

    let projectFile = await readFile(fullPath, "utf-8");
    project.dependencies.forEach((dependency) => {
      const dependencyId = dependency.id;
      const dependencyProject = projects[dependencyId];
      if (dependency.type === DependencyType.Package) {
        const relativePathToDependency = calculateRelativePathBetweenFiles(
          project.path,
          dependencyProject.path
        );
        const packageReferenceExp = getProjectReferenceExpression(
          relativePathToDependency
        );
        projectFile = projectFile.replace(
          packageReferenceExp,
          `<PackageReference Include="${dependencyProject.id}" Version="${dependencyProject.version}" />`
        );
      }
    });

    await writeFile(fullPath, projectFile);
  }));
}
