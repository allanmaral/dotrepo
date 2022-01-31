import ora from 'ora'

import { saveLock } from "../lock";
import { restoreProjectsToRelease } from "../projects";
import { restoreSolutionsToRelease } from "../solutions";

import { createCommand, prepare } from "./base";

export const stopDevelopmentCommand = createCommand({
  command: "stop-development",
  aliases: ['stop'],
  describe: "Exit development mode",
  handler: async (args) => {
    const { projects, path, lock, solutions, dependencyGraph } = prepare(args);

    const spinner = ora("Setting up projects to development mode").start();
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
    saveLock(path, lock);
    spinner.succeed('Done');
  },
});
