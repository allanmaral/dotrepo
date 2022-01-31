import ora from 'ora'

import { saveLock } from "../lock";
import { setupProjectsToDevelopment } from "../projects";
import { setupSolutionsToDevelopment } from "../solutions";

import { createCommand, prepare } from "./base";

export const startDevelopmentCommand = createCommand({
  command: "start-development",
  aliases: ["start", 'dev'],
  describe: "Start development mode",
  handler: async (args) => {
    const { projects, path, lock, solutions, dependencyGraph } = prepare(args);

    const spinner = ora("Setting up projects to development mode").start();
    await Promise.all([
      setupProjectsToDevelopment(projects, path, lock),
      setupSolutionsToDevelopment(
        solutions,
        projects,
        dependencyGraph,
        path,
        lock
      ),
    ]);
    lock.inDevelopment = true;
    saveLock(path, lock);
    spinner.succeed('Done');
  },
});
