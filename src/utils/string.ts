/**
 * Strips indentation from multi-line strings.
 *
 * @param literals The string literal to process.
 */
export function dedent(literal: string): string;

/**
 * Tag to strip indentation from multi-line strings.
 * @param literals String literal to process.
 * @param placeholders Placeholder values.
 */
export function dedent(
  literals: TemplateStringsArray,
  ...placeholders: any[]
): string;

export function dedent(
  literals: string | TemplateStringsArray,
  ...placeholders: any[]
): string {
  let str: string = "";

  if (!Array.isArray(literals)) {
    str = literals as string;
  } else if (literals.length === 1) {
    str = literals[0];
  } else {
    for (let i = 0; i < literals.length; i++) {
      str += literals[i];
      if (i < placeholders.length) {
        const placeholder = placeholders[i];
        const dent = /(?:^|\n)([ \t]+)$/.exec(literals[i]);
        if (dent) {
          str += placeholder.replace(/\n/g, `\n${dent[1]}`);
        }
      }
    }
  }

  str = str.replace(/^[ \t]*\r?\n/, ""); // remove leading blank line
  const indent = /^[ \t]+/m.exec(str); // detected indent
  if (indent) str = str.replace(new RegExp("^" + indent[0], "gm"), ""); // remove indent
  return str.replace(/(\r?\n)[ \t]+$/, "$1"); // remove trailling blank line
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
