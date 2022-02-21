import ora from "ora";
import { runMultipleScriptsStreaming } from "../utils";

import {
  loadWorkspaceProjects,
  prepareProjects,
  prepareProjectsToBuild,
} from "../projects";

import { createCommand, prepare } from "./base";
import { dirname, relative, resolve } from "path";

export const buildCommand = createCommand({
  command: "build",
  describe: "Build projects",
  handler: async (args) => {
    const { projects, path, config, dependencyGraph } = await prepare(args);
    let buildError = null;

    const prepareSpinner = ora("Preparing projects for build").start();
    await prepareProjectsToBuild(projects, path);
    prepareSpinner.succeed();

    try {
      const sortedProjects = dependencyGraph
        .getTopologicalOrder()
        .map((node) => node.value!);
      for (const project of sortedProjects) {
        const relativeOutputPath = relative(dirname(project.path), resolve(path, ".repo", "pkg"))
        await runMultipleScriptsStreaming(
          [
            {
              script: "build",
              args: [
                "-c", "Release",
                "--source", relativeOutputPath,
                "--source", '"https://api.nuget.org/v3/index.json"',
              ],
            },
            {
              script: "pack",
              args: ["--no-build", "-o", relativeOutputPath],
            },
          ],
          {
            project,
            prefix: true,
          }
        );
      }
    } catch (error) {
      buildError = error;
    }

    const restoreSpinner = ora("Preparing projects for build").start();
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
