import { dotrepoCLI } from "./cli";
import { graphCommand } from "./commands/graph";
import { initCommand } from "./commands/init";
import { buildCommand } from "./commands/build";
import { versionCommand } from "./commands/version";

import pkg from "../package.json";

const argv = process.argv.slice(2);
const cwd = process.cwd();

function main(argv: string[], cwd: string) {
  const context = {
    dotrepoVersion: pkg.version,
  };

  dotrepoCLI(argv, cwd)
    .command(initCommand)
    .command(buildCommand)
    .command(graphCommand)
    .command(versionCommand)
    .parse(argv, context);
}

main(argv, cwd);
