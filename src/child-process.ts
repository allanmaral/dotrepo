import execa, { SyncOptions, Options, ExecaChildProcess } from "execa";

// bookkeeping for spawned processes
const children = new Set<ExecaChildProcess<string>>();

/**
 * Execute a command asynchronously, piping stdio by default.
 * @param command Command to execute.
 * @param args Arguments to pass to the command.
 * @param opts Execa options.
 */
export function exec(command: string, args: Array<string>, opts?: Options) {
  const options = Object.assign({ stdio: "pipe" }, opts);
  const spawned = spawnProcess(command, args, options);

  return spawned;
}

/**
 * Execute a command asynchronously, and read its output.
 * @param command Command to execute.
 * @param args Arguments to pass to the command.
 * @param opts Execa options.
 */
 export async function execAndRead(command: string, args: Array<string>, opts?: Options) {
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

function spawnProcess(command: string, args: Array<string>, opts: Options) {
  const child = execa(command, args, opts);
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

  children.add(child);

  return child;
}
