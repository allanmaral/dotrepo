import ora from 'ora'

import { saveLock } from "../lock";
import { restoreProjectsToRelease } from "../projects";
import { restoreSolutionsToRelease } from "../solutions";

import { createCommand, prepare } from "./base";

export const stopDevelopmentCommand = createCommand({
  command: "restore",
  describe: "Restore monorepo environment",
  handler: async (args) => {
    const { projects, path, lock, solutions, dependencyGraph } = await prepare(args);

    const spinner = ora("Restoring projects and solutions").start();
    await Promise.all([
      restoreProjectsToRelease(projects, path, lock),
      restoreSolutionsToRelease(
        solutions,
        projects,
        dependencyGraph,
        path,
        lock
      ),
    ]);
    delete lock.inDevelopment;
    await saveLock(path, lock);
    spinner.succeed('Done');
  },
});
