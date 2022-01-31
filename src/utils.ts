import { dirname, relative } from 'path'
import { v4 } from 'uuid'

/**
 * Generates a random id string.
 * 
 * @returns A unique id.
 */
 export function uuid(): string {
  return v4()
}

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

/**
 * Prepares a string to be used in a RegExp.
 * 
 * @param str The string to prepare. 
 * @returns A string with all special characters escaped.
 */
export function cleanStringForRegex(path: string): string {
  return path.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")
}