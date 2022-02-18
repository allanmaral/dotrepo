import { mkdir, readFile, writeFile } from "fs/promises";
// import log from "npmlog";
import { dirname, relative, resolve } from "path";

import { Configuration } from "../config";
import { glob } from "../utils";
import { grammar } from "../grammar";

/**
 * Load all projects from a workspace.
 *
 * @param path Path to the workspace.
 * @param config Configuration for the workspace.
 */
export async function prepareWorkspaceNugetConfigs(
  path: string,
  config?: Configuration
): Promise<void> {
  const configFileNames: Set<string> = new Set();

  if (config?.packages) {
    for (const pkg of config.packages) {
      const nugetFiles = await glob(`${path}/${pkg}/**/nuget.config`);
      nugetFiles.forEach((filename) => configFileNames.add(filename));
    }
  } else {
    const nugetFiles = await glob(`${path}/**/nuget.config`);
    nugetFiles.forEach((filename) => configFileNames.add(filename));
  }

  await mkdir(resolve(path, ".repo", "pkg"), { recursive: true });
  await Promise.all(
    Array.from(configFileNames).map((fileName) => prepareConfig(fileName, path))
  );
}

/**
 * Prepare a nuget.config file to look for local packages.
 * @param path Path to the nuget.file file.
 */
export async function prepareConfig(
  path: string,
  workspace: string
): Promise<void> {
  const fileContent = await readFile(path, "utf8");

  const newContent = fileContent.replace(
    grammar.config.packageSource,
    (match, spacing) => {
      return (
        match +
        `<add key="Local" value="${relative(
          dirname(path),
          resolve(workspace, ".repo", "pkg")
        )}" />` +
        spacing
      );
    }
  );

  await writeFile(path, newContent);
}
