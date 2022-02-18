import yargs from "yargs";

import { graphCommand } from "./commands/graph";
import { initCommand } from "./commands/init";
import { buildCommand } from "./commands/build";

yargs
  .scriptName("dotrepo")
  .usage("$0 <cmd> [args]")
  .command(initCommand)
  .command(buildCommand)
  .command(graphCommand)
  .options({
    workspace: {
      type: "string",
      alias: "w",
      describe: "Path to the workspace"
    },
  })
  .help().argv;
