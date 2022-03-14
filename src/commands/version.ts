import * as log from "npmlog";
import * as semver from "semver";
import { readFile, writeFile } from "fs/promises";
import { createPromptModule } from "inquirer";

import { grammar } from "../grammar";
import { Configuration, saveConfiguration } from "../config";
import {
  isAnythingCommitted,
  getCurrentBranch,
  remoteBranchExists,
  dedent,
  isBehindUpstream,
  gitCommit,
  gitTag,
  gitPush,
  gitAdd,
} from "../utils";
import { AppError } from "../error";

import { createCommand, prepare } from "./base";
import { Project } from "src/projects/project";

export const versionCommand = createCommand({
  command: "version [bump]",
  describe: "Bump version of packages changed since the last release.",
  builder: (yargs) => {
    const semverKeywords = [
      "major",
      "premajor",
      "minor",
      "preminor",
      "patch",
      "prepatch",
      "prerelease",
    ];
    const bumpOptionList = `'${semverKeywords
      .slice(0, -1)
      .join("', '")}', or '${semverKeywords[semverKeywords.length - 1]}'.`;

    yargs.positional("bump", {
      describe: `Increment version(s) by explicit version _or_ semver keyword,\n${bumpOptionList}`,
      type: "string",
      coerce: (choice: string) => {
        if (!semver.valid(choice) && semverKeywords.indexOf(choice) === -1) {
          throw new Error(
            `bump must be an explicit version string _or_ one of: ${bumpOptionList}`
          );
        }
        return choice;
      },
    });

    return yargs;
  },
  handler: async (args) => {
    const { config, projects, path } = await prepare(args);
    const { bump } = args;

    const ci = false;
    const commitAndTag = true;
    const pushToRemote = true;
    const gitRemote = "origin";
    const message = "";

    const currentBranch = getCurrentBranch();
    console.log('Current branch:', currentBranch);
    if (
      !isGitReady({ ci, pushToRemote, commitAndTag, gitRemote, currentBranch })
    ) {
      return;
    }

    await upgradePackages(bump as string, path, projects, config);

    if (commitAndTag) {
      await commitAndTagUpdates(message, config);
    } else {
      log.info("dotrepo", "Skipping git tag/commit");
    }

    if (pushToRemote) {
      await pushUpdatesToRemote(gitRemote, currentBranch);
    } else {
      log.info("dotrepo", "Skipping git push");
    }
  },
});

function isGitReady({
  ci,
  pushToRemote,
  commitAndTag,
  gitRemote,
  currentBranch,
}: {
  ci: boolean;
  pushToRemote: boolean;
  commitAndTag: boolean;
  gitRemote: string;
  currentBranch: string;
}): boolean {
  if (!isAnythingCommitted()) {
    throw new AppError(
      "ENOCOMMIT",
      "No commits in this repository. Please commit something before using version.",
      1
    );
  }

  if (currentBranch === "HEAD") {
    throw new AppError(
      "ENOGIT",
      "Detached git HEAD, please checkout a branch to choose versions.",
      1
    );
  }

  if (pushToRemote && !remoteBranchExists(gitRemote, currentBranch)) {
    throw new AppError(
      "ENOREMOTEBRANCH",
      `Branch '${currentBranch}' doesn't exist in remote '${gitRemote}'.\n` +
      `If this is a new branch, please make sure you push it to the remote first.`,
      1
    );
  }

  if (
    commitAndTag &&
    pushToRemote &&
    isBehindUpstream(gitRemote, currentBranch)
  ) {
    const message = `Local branch '${currentBranch}' is behind remote upstream ${gitRemote}/${currentBranch}`;

    if (!ci) {
      throw new AppError(
        "EBEHIND",
        dedent`
          ${message}
          Please merge remote changes into '${currentBranch}' with 'git pull'
        `,
        1
      );
    }

    // CI execution should not error, but warn & exit
    log.warn("dotrepo", "EBEHIND", `${message}, exiting`);

    // still exits zero, aka "ok"
    return false;
  }

  return true;
}

async function upgradePackages(
  bump: string,
  path: string,
  projects: Record<string, Project>,
  config: Configuration
) {
  const prompt = createPromptModule();

  const nextVersion = semver.valid(bump) 
    ? bump 
    : semver.inc(config.version, bump as semver.ReleaseType);

  log.info("dotrepo", "current version", config.version);
  console.log("");
  console.log("Changes:");
  console.log(
    Object.keys(projects)
      .map(
        (projectId) =>
          ` - ${projectId}: ${projects[projectId].version} => ${nextVersion}`
      )
      .join("\n")
  );
  console.log("");

  const confirm = await prompt([
    {
      type: "expand",
      message: "Are you sure you want to create these versions?",
      name: "confirm",
      choices: [
        {
          key: "y",
          name: "Yes",
          value: "yes",
        },
        {
          key: "n",
          name: "No",
          value: "no",
        },
      ],
    },
  ]);

  if (confirm.confirm === "no") {
    log.info("dotrepo", "Aborted");
    return;
  }

  await Promise.all(
    Object.keys(projects).map(async (projectId) => {
      const project = projects[projectId];
      const fileContent = await readFile(project.path, "utf8");
      const updatedFile = fileContent.replace(
        grammar.project.version,
        `<Version>${nextVersion}</Version>`
      );
      await writeFile(project.path, updatedFile);
    })
  );

  config.version = nextVersion!;
  await saveConfiguration(path, config);
}

async function commitAndTagUpdates(message: string, config: Configuration) {
  const version = config.version;
  const tag = `v${version}`;
  const commitMessage = message
    ? message.replace(/%s/g, tag).replace(/%v/g, version)
    : tag;

  await gitAdd();
  await gitCommit(commitMessage);
  await gitTag(tag);

  // TODO: run the postversion script
}

async function pushUpdatesToRemote(gitRemote: string, currentBranch: string) {
  log.info("dotrepo", "Pushing tags...");

  await gitPush(gitRemote, currentBranch);
}
