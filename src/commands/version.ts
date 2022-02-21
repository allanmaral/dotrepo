import * as log from "npmlog";
import * as semver from "semver";
import { readFile, writeFile } from "fs/promises";
import { createPromptModule } from "inquirer";

import { grammar } from '../grammar';

import { createCommand, prepare } from "./base";

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
    const prompt = createPromptModule();
    const { config, projects } = await prepare(args);
    const { bump } = args;

    const nextVersion = semver.inc(config.version, bump as semver.ReleaseType);
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

    await Promise.all(Object.keys(projects).map(async (projectId) => {
      const project = projects[projectId];
      const fileContent = await readFile(project.path, "utf8");
      const updatedFile = fileContent.replace(
        grammar.project.version,
        `<Version>${nextVersion}</Version>`
      )
      await writeFile(project.path, updatedFile);
    }))
  },
});
