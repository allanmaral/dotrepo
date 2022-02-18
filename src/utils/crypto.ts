import { createHash } from "crypto";
import { createReadStream } from "fs";
import _glob from "glob";

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
export function hashString(str: string, algorithm: string = "sha256"): string {
  const hashsum = createHash(algorithm);
  hashsum.update(str);
  return hashsum.digest("hex");
}
