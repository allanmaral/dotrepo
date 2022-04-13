import {
  ArgumentsCamelCase,
  CommandModule,
  CommandBuilder,
  BuilderCallback,
} from "yargs";

import { Graph } from "../graph";
import { Project } from "../projects/project";
import { Solution } from "../solutions/solution";
import { loadWorkspaceSolutions } from "../solutions";
import { createDependencyGraph, loadWorkspaceProjects } from "../projects";
import {
  Configuration,
  createSampleConfiguration,
  loadConfiguration,
} from "../config";
import * as log from "npmlog";
import { disableProgress, createSpinner } from "../utils/spinner";

export interface CommandOptions<T = {}, U = {}> {
  /**
   * Array of strings (or a single string) representing aliases
   * of `exports.command`, positional args defined in an alias are ignored
   */
  aliases?: ReadonlyArray<string> | string | undefined;

  /**
   * Object declaring the options the command accepts,
   * or a function accepting and returning a yargs instance
   */
  builder?: CommandBuilder<T, U> | BuilderCallback<T, U> | undefined;

  /**
   * String (or array of strings) that executes this command when given on the
   * command line, first string may contain positional args
   */
  command?: ReadonlyArray<string> | string | undefined;

  /**
   * Boolean (or string) to show deprecation notice
   */
  deprecated?: boolean | string | undefined;

  /**
   * String used as the description for the command in help text,
   * use `false` for a hidden command
   */
  describe?: string | false | undefined;

  /**
   * A function which will be passed the parsed argv.
   */
  handler: (args: ArgumentsCamelCase<U>) => void | Promise<void>;
}

/**
 * Simple wrapper only to type the command declaration
 *
 * @param command
 * @returns A command module object
 */
export function createCommand<T = {}, U extends BaseArguments = BaseArguments>(
  command: CommandOptions<T, U>
): CommandModule<T, U> {
  return command as CommandModule<T, U>;
}

export interface CommandBaseData {
  ci: boolean;
  path: string;
  config: Configuration;
  projects: Record<string, Project>;
  dependencyGraph: Graph;
  solutions: Record<string, Solution>;
}

export interface BaseArguments {
  workspace: string;
}

export async function prepare<T extends BaseArguments = BaseArguments>(
  args: ArgumentsCamelCase<T>,
  createConfig: boolean = false
): Promise<CommandBaseData> {
  const ci = (await require("is-ci")) || !!args.ci;
  if (ci) {
    disableProgress();
    log.disableColor();
    log.info("dotrepo", "Running in CI environment");
  }

  const spinner = createSpinner("Preparing workspace");

  try {
    const path = args.workspace || process.cwd();
    if (createConfig) {
      await createSampleConfiguration(path);
    }
    const config = await loadConfiguration(path);
    const projects = await loadWorkspaceProjects(path, config);
    const solutions = await loadWorkspaceSolutions(path, projects, config);
    const dependencyGraph = createDependencyGraph(projects);

    spinner.succeed();

    return {
      path,
      config,
      projects,
      solutions,
      dependencyGraph,
      ci: !!ci,
    };
  } catch (err) {
    spinner.fail("Failed to prepare workspace");
    throw err;
  }
}
