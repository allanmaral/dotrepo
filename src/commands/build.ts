import ora from "ora";
import { runScriptStreaming } from "../utils";

// import { saveLock } from "../lock";
import { loadWorkspaceProjects, prepareProjects, prepareProjectsToBuild } from "../projects";

import { createCommand, prepare } from "./base";

export const buildCommand = createCommand({
  command: "build",
  describe: "Build projects",
  handler: async (args) => {
    const { projects, path, config, dependencyGraph } = await prepare(args);
    let buildError = null;

    const prepareSpinner = ora("Preparing projects for build").start();
    await prepareProjectsToBuild(projects, path)
    prepareSpinner.succeed();

    const buildSpinner = ora("Building projects").start();
    try {
      const sortedProjects = dependencyGraph.getTopologicalOrder().map(node => node.value!);
      for(const project of sortedProjects) {
        await runScriptStreaming("list", {
          args: [],
          project,
          prefix: true
        })
      }
      buildSpinner.succeed();
    } catch (error) {
      buildError = error;
      buildSpinner.fail()
    }

    const restoreSpinner = ora("Preparing projects for build").start();
    const modifiedProjects = await loadWorkspaceProjects(path, config);
    await prepareProjects(modifiedProjects, path)
    restoreSpinner.succeed("Done");

    if (buildError) {
      throw buildError;
    }
    
    // delete lock.inDevelopment;
    // await saveLock(path, lock);
  },
});
