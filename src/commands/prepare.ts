import ora from "ora";

import { saveLock } from "../lock";
import { setupProjectsToDevelopment } from "../projects";
import { setupSolutionsToDevelopment } from "../solutions";

import { createCommand, prepare } from "./base";

export const startDevelopmentCommand = createCommand({
  command: "prepare",
  describe: "Prepare monorepo environment",
  handler: async (args) => {
    const { projects, path, lock, solutions, dependencyGraph } = await prepare(
      args
    );

    const spinner = ora("Preparing projects and solutions").start();
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
    await saveLock(path, lock);
    spinner.succeed("Done");
  },
});
