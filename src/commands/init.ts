import ora from "ora";
// import { prepareWorkspaceNugetConfigs } from "../nuget";

// import { saveLock } from "../lock";
import { prepareProjects } from "../projects";
import { prepareSolutions } from "../solutions";

import { createCommand, prepare } from "./base";

export const initCommand = createCommand({
  command: "init",
  describe: "Prepare monorepo environment",
  handler: async (args) => {
    const { projects, path, solutions, dependencyGraph } = await prepare(
      args
    );
    
    const spinner = ora("Preparing projects and solutions").start();
    await Promise.all([
      prepareProjects(projects, path),
      // prepareWorkspaceNugetConfigs(path),
      prepareSolutions(
        solutions,
        projects,
        dependencyGraph,
        path
      ),
    ]);
    // lock.inDevelopment = true;
    // await saveLock(path, lock);
    spinner.succeed("Done");
  },
});
