import yargs from "yargs";
import * as log from "npmlog";
import { dedent } from "./utils";
import { AppError } from "./error";

export function dotrepoCLI(argv: string[] = [], cwd?: string) {
  const cli = yargs(argv, cwd);

  return cli
    .scriptName("dotrepo")
    .usage("Usage: $0 <command> [options]")
    .demandCommand(
      1,
      "A command is required. Pass --help to see all available commands and options."
    )
    .recommendCommands()
    .strict()
    .fail((msg, err) => {
      const actual = (err || new Error(msg)) as AppError;

      // ValidationErrors are already handled by yargs
      if (actual.name !== "ValidationError" && !actual.project) {
        if (/Did you mean/.test(actual.message) && cli.parsed) {
          log.error("dotrepo", `Unknown command "${cli.parsed.argv._[0]}"`);
        }
        log.error("dotrepo", actual.message);
      }

      cli.exit(actual.exitCode > 0 ? actual.exitCode : 1, actual);
    })
    .alias("v", "version")
    .alias("h", "help")
    .options({
      workspace: {
        type: "string",
        alias: "w",
        describe: "Path to the workspace",
      },
    })
    .wrap(cli.terminalWidth()).epilogue(dedent`
  When a command fails, all logs are written to dotrepo.log in the current working directory.
  `);
}
