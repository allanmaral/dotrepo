import { readFileSync } from "fs";
import { resolve } from "path";

export interface Configuration {
  version: string;
  packages: string[]
}

export function loadConfiguration(path: string): Configuration {
  const fileContent = readFileSync(resolve(path, "workspace.json"));
  const config = JSON.parse(fileContent.toString()) as Configuration;
  return config
}