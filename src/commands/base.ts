import { ArgumentsCamelCase, CommandModule, CommandBuilder } from "yargs";
import ora from "ora";

import { Configuration, loadConfiguration } from "../config";
import { createLock, LockFile, readLock } from "../lock";
import { Project } from "../projects/project";
import { createDependencyGraph, loadWorkspaceProjects } from "../projects";
import { Solution } from "../solutions/solution";
import { loadWorkspaceSolutions } from "../solutions";
import { Graph } from "../graph";

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
  builder?: CommandBuilder<T, U> | undefined;

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
  return command;
}

export interface CommandBaseData {
  lock: LockFile;
  path: string;
  config: Configuration;
  projects: Record<string, Project>;
  solutions: Record<string, Solution>;
  dependencyGraph: Graph;
}

export interface BaseArguments {
  workspace: string;
}

export function prepare<T extends BaseArguments = BaseArguments>(
  args: ArgumentsCamelCase<T>
): CommandBaseData {
  const spinner = ora("Preparing workspace").start();

  const path = args.workspace || process.cwd();
  const config = loadConfiguration(path);
  let projects = loadWorkspaceProjects(path, config);
  let solutions = loadWorkspaceSolutions(path, projects, config);
  let lock = readLock(path);
  if (lock && lock.inDevelopment) {
    projects = lock.projects;
    solutions = lock.solutions;
  } else {
    lock = createLock(path, config, projects, solutions);
  }
  const dependencyGraph = createDependencyGraph(projects);

  spinner.succeed();

  return {
    lock,
    path,
    config,
    projects,
    solutions,
    dependencyGraph,
  };
}
