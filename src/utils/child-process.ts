import { constants } from "os";
import execa, { SyncOptions, Options, ExecaChildProcess } from "execa";
import { Chalk } from "chalk";
import logTransformer from "strong-log-transformer";

import { Project } from "../projects/project";
import { AppError } from "../error";
import { getColor } from "./colors";

export type SpawnOptions = Options & { 
  project?: Project,
  color?: Chalk
};
export type ChildProcess = ExecaChildProcess<string> & { project?: Project };

// bookkeeping for spawned processes
const children = new Set<ExecaChildProcess<string>>();

/**
 * Execute a command asynchronously, piping stdio by default.
 * @param command Command to execute.
 * @param args Arguments to pass to the command.
 * @param opts Execa options.
 */
export function exec(
  command: string,
  args: Array<string>,
  opts?: SpawnOptions
) {
  const options = Object.assign({ stdio: "pipe" }, opts);
  const spawned = spawnProcess(command, args, options);

  return wrapError(spawned);
}

/**
 * Spawn a command asynchronously, streaming stdio with optional prefix.
 * @param {string} command
 * @param {string[]} args
 * @param {import("execa").Options} [opts]
 * @param {string} [prefix]
 */
export function spawnStreaming(
  command: string,
  args: Array<string>,
  opts?: SpawnOptions,
  prefix?: string
) {
  const options: SpawnOptions = Object.assign({}, opts, {
    stdio: ["ignore", "pipe", "pipe"],
  });

  const spawned = spawnProcess(command, args, options);

  const stdoutOpts: any = {};
  const stderrOpts: any = {};

  if (prefix) {
    const color = options.color || getColor()

    stdoutOpts.tag = `${color.bold(prefix)}:`;
    stderrOpts.tag = `${color(prefix)}:`;
  }

  // Avoid "Possible EventEmitter memory leak detected" warning due to piped stdio
  if (children.size > process.stdout.listenerCount("close")) {
    process.stdout.setMaxListeners(children.size);
    process.stderr.setMaxListeners(children.size);
  }

  spawned.stdout?.pipe(logTransformer(stdoutOpts)).pipe(process.stdout);
  spawned.stderr?.pipe(logTransformer(stderrOpts)).pipe(process.stderr);

  return wrapError(spawned);
}

/**
 * Execute a command asynchronously, and read its output.
 * @param command Command to execute.
 * @param args Arguments to pass to the command.
 * @param opts Execa options.
 */
export async function execAndRead(
  command: string,
  args: Array<string>,
  opts?: Options
) {
  const { stdout } = await exec(command, args, opts);
  return stdout;
}

/**
 * Execute a command synchronously.
 *
 * @param command Command to execute.
 * @param args Arguments to pass to the command.
 * @param opts Execa options.
 */
export function execSync(
  command: string,
  args: Array<string>,
  opts?: SyncOptions
) {
  return execa.sync(command, args, opts).stdout;
}

function spawnProcess(
  command: string,
  args: Array<string>,
  opts: SpawnOptions
): ChildProcess {
  const child: ChildProcess = execa(command, args, opts);
  const drain = (exitCode: number, signal?: NodeJS.Signals) => {
    children.delete(child);

    // don't run repeatedly if this is the error event
    if (signal === undefined) {
      child.removeListener("exit", drain);
    }

    // propagate exit code, if any
    if (exitCode) {
      process.exitCode = exitCode;
    }
  };

  child.once("exit", drain);
  child.once("error", drain);

  if (opts.project) {
    child.project = opts.project;
  }

  children.add(child);

  return child;
}

function wrapError(spawned: ChildProcess): ChildProcess {
  if (spawned.project) {
    return spawned.catch((err: Error) => {
      const exitCode = getExitCode(err);
      const error = new AppError(err, exitCode, spawned.project);
      throw error;
    }) as ChildProcess;
  }

  return spawned;
}

function getExitCode(error: any) {
  if (error.exitCode) {
    return error.exitCode;
  }

  // https://nodejs.org/docs/latest-v6.x/api/child_process.html#child_process_event_close
  if (typeof error.code === "number") {
    return error.code;
  }

  // https://nodejs.org/docs/latest-v6.x/api/errors.html#errors_error_code
  if (typeof error.code === "string") {
    // @ts-ignore
    return constants.errno[error.code];
  }

  // we tried
  return process.exitCode;
}
