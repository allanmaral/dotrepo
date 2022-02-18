import { dirname, relative } from "path";
import { promisify } from "util";
import _glob from "glob";

/**
 * Get the relative path to `destination` from the directory of `source`.
 * @param source Source file path.
 * @param destination Destination file path.
 * @returns A relative path from `source` to `destination`.
 */
export function calculateRelativePathBetweenFiles(
  source: string,
  destination: string
): string {
  const originFolder = dirname(source);
  return relative(originFolder, destination);
}

export const glob = promisify(_glob);
