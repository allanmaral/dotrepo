import { createSpinner } from "../utils/spinner";

import {
  buildWorkspaceProjects,
  loadWorkspaceProjects,
  prepareProjects,
  prepareProjectsToBuild,
} from "../projects";

import { createCommand, prepare } from "./base";

export const buildCommand = createCommand({
  command: "build",
  describe: "Run the build command in each project.",
  handler: async (args) => {
    const { projects, path, config, dependencyGraph } = await prepare(args);
    let buildError = null;

    const prepareSpinner = createSpinner("Preparing projects for build");
    await prepareProjectsToBuild(projects, path);
    prepareSpinner.succeed();

    try {
      await buildWorkspaceProjects(dependencyGraph, path);
    } catch (error) {
      buildError = error;
    }

    const restoreSpinner = createSpinner("Preparing projects for build");
    const modifiedProjects = await loadWorkspaceProjects(path, config);
    await prepareProjects(modifiedProjects, path);
    
    if (buildError) {
      restoreSpinner.fail("Build failed");
      throw buildError;
    } else {
      restoreSpinner.succeed("Done");
    }
  },
});
