import yargs from "yargs";

import { graphCommand } from "./commands/graph";
import { startDevelopmentCommand } from "./commands/prepare";
import { stopDevelopmentCommand } from "./commands/restore";

yargs
  .scriptName("dotrepo")
  .usage("$0 <cmd> [args]")
  .command(startDevelopmentCommand)
  .command(stopDevelopmentCommand)
  .command(graphCommand)
  .options({
    workspace: {
      type: "string",
      alias: "w",
      describe: "Path to the workspace"
    },
  })
  .help().argv;
