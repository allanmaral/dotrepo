import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { resolve } from "path";
import * as log from "npmlog";

export interface Configuration {
  version: string;
  packages: string[];
  sources?: string[];
}

export async function loadConfiguration(path: string): Promise<Configuration> {
  const configFilePath = resolve(path, "dotrepo.json");
  if (!existsSync(configFilePath)) {
    throw new Error(`Configuration file not found at ${configFilePath}`);
  }

  const fileContent = await readFile(resolve(path, "dotrepo.json"));
  const config = JSON.parse(fileContent.toString()) as Configuration;
  return config;
}

export async function createSampleConfiguration(path: string): Promise<void> {
  const configFilePath = resolve(path, "dotrepo.json");
  if (existsSync(configFilePath)) {
    log.info(
      "dotrepo",
      'The file "dotrepo.json" already exists, skipping creation'
    );
    return
  }

  const sampleConfig = {
    version: "0.0.0",
    packages: ["packages/*"],
  };

  await writeFile(configFilePath, JSON.stringify(sampleConfig, null, 2));
}
