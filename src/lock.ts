import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { Configuration } from "./config";
import { Project } from "./projects/project";
import { Solution } from "./solutions/solution";

const LockFileName = "workspace-lock.json";

export interface LockFile {
  version: string;
  inDevelopment?: boolean;
  projects: Record<string, Project>;
  solutions: Record<string, Solution>;
}

export function createLock(
  path: string,
  config: Configuration,
  projects: Record<string, Project>,
  solutions: Record<string, Solution>
): LockFile {
  const lock: LockFile = {
    version: config.version,
    solutions: solutions,
    projects: projects,
  };

  saveLock(path, lock);

  return lock;
}

export function saveLock(path: string, lock: LockFile): void {
  const _lock: LockFile = {
    ...lock,
    projects: Object.keys(lock.projects).reduce<Record<string, Project>>(
      (acc, projectId) => {
        const { id, ...project } = lock.projects[projectId];
        acc[projectId] = project as Project;
        return acc;
      },
      {}
    ),
    solutions: Object.keys(lock.solutions).reduce<Record<string, Solution>>(
      (acc, solutionId) => {
        const { id, ...solution } = lock.solutions[solutionId];
        solution.projects = solution.projects.map(project => {
          const projectId = project.id;
          return projectId as unknown as Project;
        })
        acc[solutionId] = solution as Solution;
        return acc;
      },
      {}
    ),
  };

  writeFileSync(resolve(path, LockFileName), JSON.stringify(_lock, null, 2));
}

export function readLock(path: string): LockFile | undefined {
  try {
    const fileContent = readFileSync(resolve(path, LockFileName));
    const lock = JSON.parse(fileContent.toString()) as LockFile;
    const projects = Object.keys(lock.projects).reduce<Record<string, Project>>(
      (acc, projectKey) => {
        const project = lock.projects[projectKey];
        project.id = projectKey;
        acc[projectKey] = project;
        return acc;
      },
      {}
    )
    const solutions = Object.keys(lock.solutions).reduce<Record<string, Solution>>(
      (acc, solutionKey) => {
        const solution = lock.solutions[solutionKey];
        solution.id = solutionKey;
        solution.projects = solution.projects.map(project => {
          const projectId = project as unknown as string;
          return projects[projectId];
        })
        acc[solutionKey] = solution;
        return acc;
      },
      {}
    )

    return {
      ...lock,
      projects,
      solutions,
    };
  } catch {
    return undefined;
  }
}
