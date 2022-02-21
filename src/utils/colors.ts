import chalk, { ForegroundColor, Chalk } from "chalk";

const colorWheel = [
  "cyan",
  "magenta",
  "blue",
  "yellow",
  "green",
  "red",
] as typeof ForegroundColor[];
const NUM_COLORS = colorWheel.length;

let currentColor = 0;

export function getColor(): Chalk {
  const colorName = colorWheel[currentColor % NUM_COLORS];
  const color = chalk[colorName];
  currentColor += 1;
  return color;
}
