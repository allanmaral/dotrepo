import { createHash } from "crypto";
import { createReadStream } from "fs";
import { dirname, relative } from "path";
import { v4 } from "uuid";
import _glob from 'glob';
import { promisify } from "util";

/**
 * Generates a random id string.
 *
 * @returns A unique id.
 */
export function uuid(): string {
  return v4();
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
  return path.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
}

/**
 * Get file hash
 */
export async function hashFile(
  filepath: string,
  algorithm: string = "sha256"
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const hashsum = createHash(algorithm);
    try {
      const stream = createReadStream(filepath);
      stream.on("data", (data) => {
        hashsum.update(data);
      });
      stream.on("end", () => {
        const hash = hashsum.digest("hex");
        return resolve(hash);
      });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Generate a hash from a string.
 * 
 * @param str The string to hash.
 * @param algorithm The algorithm to use.
 */
 export function hashString(
  str: string,
  algorithm: string = "sha256"
): string {
  const hashsum = createHash(algorithm);
  hashsum.update(str);
  return hashsum.digest("hex");
}

export const glob = promisify(_glob)