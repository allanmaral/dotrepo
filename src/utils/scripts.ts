import { Project } from "../projects/project";

import { dirname } from "path";
import { SpawnOptions, spawnStreaming } from "./child-process";
import { Chalk } from "chalk";
import { getColor } from "./colors";

export interface ScriptStreamingOptions {
  args: Array<string>;
  project: Project;
  prefix?: boolean;
  reject?: boolean;
  color?: Chalk;
}

export interface MultipleScriptStreamingOptions {
  project: Project;
  prefix?: boolean;
  reject?: boolean;
  color?: Chalk;
}

export function getExecutionOptions(
  project: Project,
  reject?: boolean,
  color?: Chalk
): SpawnOptions {
  return {
    cwd: dirname(project.path),
    env: {},
    project,
    reject,
    color,
  };
}

export async function runScriptStreaming(
  script: string,
  { args, project, prefix, color, reject = true }: ScriptStreamingOptions
) {
  const argv = [script, ...args];
  const options = getExecutionOptions(project, reject, color);
  const prefixText = prefix ? project.id : undefined;

  return spawnStreaming("dotnet", argv, options, prefixText);
}


export async function runMultipleScriptsStreaming(
  scripts: { script: string, args: Array<string> }[],
  { project, prefix, color, reject = true }: MultipleScriptStreamingOptions
) {
  const _color = color || getColor(); 
  for (const script of scripts) {
    await runScriptStreaming(script.script, {
      args: script.args,
      color: _color,
      project,
      prefix,
      reject,
    });
  }
}
