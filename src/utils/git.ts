import { EOL } from "os";
import * as log from "npmlog";
import tempWrite from "temp-write";
import { exec, execSync, SpawnOptions, SyncOptions } from "./child-process";

export interface GitOptions {
  amend?: boolean;
  commitHooks?: boolean;
  signGitCommit?: boolean;
  forceGitTag?: boolean;
  signGitTag?: boolean;
}

export function isAnythingCommitted(opts?: SyncOptions) {
  log.silly("dotrepo", "isAnythingCommitted");

  const revListOutput = execSync(
    "git",
    ["rev-list", "--count", "--all", "--max-count=1"],
    opts
  );

  const anyCommit = Boolean(parseInt(revListOutput, 10));
  log.verbose("dotrepo", "isAnythingCommitted", String(anyCommit));

  return anyCommit;
}

export function getCurrentBranch(opts?: SyncOptions) {
  log.silly("dotrepo", "getCurrentBranch");

  const branch = execSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], opts);
  log.verbose("dotrepo", "currentBranch", branch);

  return branch;
}

export function remoteBranchExists(
  gitRemote: string,
  branch: string,
  opts?: SyncOptions
) {
  log.silly("dotrepo", "remoteBranchExists");

  const remoteBranch = `${gitRemote}/${branch}`;

  try {
    execSync(
      "git",
      ["show-ref", "--verify", `refs/remotes/${remoteBranch}`],
      opts
    );
    return true;
  } catch (e) {
    return false;
  }
}

function updateRemote(opts?: SyncOptions) {
  execSync("git", ["remote", "update"], opts);
}

function countLeftRight(symmetricDifference: string, opts?: SyncOptions) {
  const output = execSync(
    "git",
    ["rev-list", "--left-right", "--count", symmetricDifference],
    opts
  );

  return output.split("\t").map((val) => parseInt(val, 10));
}

export function isBehindUpstream(
  gitRemote: string,
  branch: string,
  opts?: SyncOptions
) {
  log.silly("dotrepo", "isBehindUpstream");

  updateRemote(opts);

  const remoteBranch = `${gitRemote}/${branch}`;
  const [behind, ahead] = countLeftRight(`${remoteBranch}...${branch}`, opts);

  log.silly(
    "dotrepo",
    "isBehindUpstream",
    `${branch} is behind ${remoteBranch} by ${behind} commit(s) and ahead by ${ahead}`
  );

  return !!behind;
}

export async function gitAdd(execOpts?: SpawnOptions) {
  // TODO: add support for granular paths
  const files = ".";

  log.silly("dotrepo", "gitAdd", files);

  await exec("git", ["add", "--", ...files], execOpts);
}

export async function gitCommit(
  message: string,
  { amend = false, commitHooks = true, signGitCommit = false }: GitOptions = {},
  opts?: SyncOptions
) {
  log.silly("dotrepo", "gitCommit", message);

  const args = ["commit"];

  if (commitHooks === false) {
    args.push("--no-verify");
  }

  if (signGitCommit) {
    args.push("--gpg-sign");
  }

  if (amend) {
    args.push("--amend", "--no-edit");
  } else if (message.indexOf(EOL) > -1) {
    args.push("-F", tempWrite.sync(message, "lerna-commit.txt"));
  } else {
    args.push("-m", message);
  }

  log.verbose("dotrepo", "git", args);
  await exec("git", args, opts);
}

export async function gitTag(
  tag: string,
  { forceGitTag = false, signGitTag = false }: GitOptions = {},
  opts?: SyncOptions
) {
  log.silly("dotrepo", "gitTag", tag);

  const args = ["tag", tag, "-m", tag];

  if (forceGitTag) {
    args.push("--force");
  }

  if (signGitTag) {
    args.push("--sign");
  }

  log.verbose("dotrepo", "git", args);
  await exec("git", args, opts);
}

export async function gitPush(
  remote: string,
  branch: string,
  opts?: SpawnOptions
) {
  log.silly("dotrepo", "gitPush", remote, branch);

  await exec(
    "git",
    ["push", "--follow-tags", "--no-verify", "--atomic", remote, branch],
    opts
  );
}
