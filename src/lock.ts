import { readFile, writeFile } from "fs/promises";
import { resolve } from "path";
import { Project } from "./projects/project";
import { Solution } from "./solutions/solution";

const LockFileName = "workspace-lock.json";

export interface LockFile {
  inDevelopment?: boolean;
  projects: Record<string, Project>;
  solutions: Record<string, Solution>;
}

export async function createLock(
  path: string,
  projects: Record<string, Project>,
  solutions: Record<string, Solution>
): Promise<LockFile> {
  const lock: LockFile = {
    solutions: solutions,
    projects: projects,
  };

  await saveLock(path, lock);

  return lock;
}

export async function saveLock(path: string, lock: LockFile): Promise<void> {
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

  await writeFile(resolve(path, LockFileName), JSON.stringify(_lock, null, 2));
}

export async function readLock(path: string): Promise<LockFile | undefined> {
  try {
    const fileContent = await readFile(resolve(path, LockFileName));
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
