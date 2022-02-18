import { constants } from "os";
import execa, { SyncOptions, Options, ExecaChildProcess } from "execa";
import chalk, { ForegroundColor } from "chalk";
import logTransformer from "strong-log-transformer";

import { Project } from "../projects/project";
import { dirname } from "path";

type SpawnOptions = Options & { project?: Project };
type ChildProcess = ExecaChildProcess<string> & { project?: Project };

// bookkeeping for spawned processes
const children = new Set<ExecaChildProcess<string>>();

// when streaming processes are spawned, use this color for prefix
const colorWheel = [
  "cyan",
  "magenta",
  "blue",
  "yellow",
  "green",
  "red",
] as typeof ForegroundColor[];
const NUM_COLORS = colorWheel.length;

// ever-increasing index ensures colors are always sequential
let currentColor = 0;

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
    const colorName = colorWheel[currentColor % NUM_COLORS];
    const color = chalk[colorName];

    currentColor += 1;

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
    return spawned.catch((err: any) => {
      // ensure exit code is always a number
      err.exitCode = getExitCode(err);

      // log non-lerna error cleanly
      err.project = spawned.project;

      throw err;
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

export function getExecutionOptions(
  project: Project,
  reject?: boolean
): SpawnOptions {
  return {
    cwd: dirname(project.path),
    env: {},
    project,
    reject,
  };
}

export interface ScriptStreamingOptions {
  args: Array<string>;
  project: Project;
  prefix?: boolean;
  reject?: boolean;
}

export function runScriptStreaming(
  script: string,
  { args, project, prefix, reject = true }: ScriptStreamingOptions
) {
  const argv = [script, ...args];
  const options = getExecutionOptions(project, reject);
  const prefixText = prefix ? project.id : undefined;

  return spawnStreaming("dotnet", argv, options, prefixText);
}
