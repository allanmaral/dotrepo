import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { resolve } from "path";
import * as log from "npmlog";

export interface Configuration {
  version: string;
  packages: string[];
  sources?: string[];
}

function getConfigurationPath(cwd: string): string {
  return resolve(cwd, "dotrepo.json");
}

function configurationExists(path: string): boolean {
  const configFilePath = getConfigurationPath(path);
  return existsSync(configFilePath)
}

export async function loadConfiguration(path: string): Promise<Configuration> {
  const configFilePath = getConfigurationPath(path);
  if (!configurationExists(path)) {
    throw new Error(`Configuration file not found at ${configFilePath}`);
  }

  const fileContent = await readFile(configFilePath);
  const config = JSON.parse(fileContent.toString()) as Configuration;
  return config;
}

export async function saveConfiguration(
  path: string,
  config: Configuration
): Promise<void> {
  const configFilePath = getConfigurationPath(path);
  await writeFile(configFilePath, JSON.stringify(config, null, 2));
}

export async function createSampleConfiguration(path: string): Promise<void> {
  if (configurationExists(path)) {
    log.info(
      "dotrepo",
      'The file "dotrepo.json" already exists, skipping creation'
    );
    return;
  }

  const sampleConfig = {
    version: "0.0.0",
    packages: ["packages/*"],
  };

  await saveConfiguration(path, sampleConfig);
}
