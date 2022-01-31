import glob from "glob";
import log from "npmlog";
import { relative, resolve } from "path";

import { Configuration } from "../config";
import { grammar } from "../grammar";
import { execSync, exec } from "../child-process";
import { Project } from "../projects/project";
import { Solution } from "./solution";
import { LockFile } from "../lock";
import { Graph } from "../graph";

// async function exec(command: string, args: Array<string>): Promise<string> {
//   return new Promise((resolve, reject) => {
//     try {
//       const result = execSync(command, args);
//       resolve(result);
//     } catch (err) {
//       reject(err);
//     }
//   });
// }

/**
 * Load all solutions from a workspace.
 *
 * @param path Path to the workspace.
 * @param projects Projects in the workspace.
 * @param config Configuration for the workspace.
 * @returns A list of solution description objects.
 */
export function loadWorkspaceSolutions(
  path: string,
  projects: Record<string, Project>,
  config?: Configuration
): Record<string, Solution> {
  const soluitionFileNames: Set<string> = new Set();

  if (config?.packages) {
    config.packages.forEach((pkg) => {
      const projectFiles = glob.sync(`${path}/${pkg}/**/*.sln`);
      projectFiles.forEach((filename) => soluitionFileNames.add(filename));
    });
  } else {
    const projectFiles = glob.sync(`${path}/**/*.sln`);
    projectFiles.forEach((filename) => soluitionFileNames.add(filename));
  }

  const solutions = Array.from(soluitionFileNames).map((solutionPath) =>
    loadSolution(solutionPath, projects)
  );

  return solutions.reduce<Record<string, Solution>>((acc, solution) => {
    solution.path = relative(path, solution.path);
    acc[solution.id] = solution;
    return acc;
  }, {});
}

/**
 * Load a single project from a .csproj file.
 * @param path Path to the .csproj file.
 * @param projects Projects in the workspace.
 * @returns A project description object.
 */
export function loadSolution(
  path: string,
  projects: Record<string, Project>
): Solution {
  log.silly("DotRepo", "Loading solution %s", path);
  const id = path.match(grammar.solution.id)?.[1];
  if (!id) throw new Error(`Invalid solution path "${path}"`);

  const output = execSync("dotnet", ["sln", path, "list"]);
  const projectsOutput = output.split(grammar.solution.listOutput)[1] || "";
  const projectsIds = projectsOutput
    .split("\n")
    .map((line) => line.trim())
    .map((projectPath) => projectPath.match(grammar.project.id)?.[1] as string)
    .filter((line) => !!line);
  const projectList = projectsIds
    .map((id) => projects[id])
    .filter((project) => !!project);

  return {
    id,
    path,
    projects: projectList,
  };
}

// ##########################
// #### Development Mode ####
// ##########################
function getMissingTransitiveDependencies(
  solution: Solution,
  dependencyGraph: Graph
) {
  const allDependencies = Array.from(
    solution.projects.reduce((acc, project) => {
      const projectNode = dependencyGraph.getNode(project.id)!;
      projectNode
        .transitiveDependencies()
        .map((n) => n.id)
        .forEach((id) => {
          acc.add(id);
        });
      return acc;
    }, new Set<string>())
  );

  return allDependencies.filter(
    (dep) => !solution.projects.find((p) => p.id === dep)
  );
}

export async function setupSolutionsToDevelopment(
  solutions: Record<string, Solution>,
  projects: Record<string, Project>,
  dependencyGraph: Graph,
  path: string,
  lock: LockFile
): Promise<void> {
  if (lock.inDevelopment) {
    throw new Error("Already in development mode, aborting.");
  }

  const solutionIds = Object.keys(solutions);
  for (let slnIndex = 0; slnIndex < solutionIds.length; slnIndex++) {
    const solutionId = solutionIds[slnIndex];
    log.silly(
      "DotRepo",
      `Setting up solution "%s" to development mode`,
      solutionId
    );
    const solution = solutions[solutionId];
    const fullPath = resolve(path, solution.path);

    const dependencyIds = getMissingTransitiveDependencies(
      solution,
      dependencyGraph
    );

    for(let depIndex = 0; depIndex < dependencyIds.length; depIndex++) {
      const depId = dependencyIds[depIndex];
      await exec("dotnet", [
        "sln",
        fullPath,
        "add",
        "-s",
        "_Dependencies",
        resolve(path, projects[depId].path),
      ]);
    }
  }
}

export async function restoreSolutionsToRelease(
  solutions: Record<string, Solution>,
  projects: Record<string, Project>,
  dependencyGraph: Graph,
  path: string,
  lock: LockFile
): Promise<void> {
  if (!lock.inDevelopment) {
    throw new Error("Not in development mode, aborting.");
  }

  const solutionIds = Object.keys(solutions);
  for (let slnIndex = 0; slnIndex < solutionIds.length; slnIndex++) {
    const solutionId = solutionIds[slnIndex];
    log.silly("DotRepo", `Restoring solution "%s" to release mode`, solutionId);
    const solution = solutions[solutionId];
    const fullPath = resolve(path, solution.path);

    const dependencyIds = getMissingTransitiveDependencies(
      solution,
      dependencyGraph
    );

    for (let projIndex = 0; projIndex < dependencyIds.length; projIndex++) {
      const projectId = dependencyIds[projIndex];
      await exec("dotnet", [
        "sln",
        fullPath,
        "remove",
        resolve(path, projects[projectId].path),
      ]);
    }

    await exec("dotnet", ["sln", fullPath, "remove", "_Dependencies"]);
  }
}