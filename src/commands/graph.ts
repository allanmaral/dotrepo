import dedent from 'dedent';

import { createCommand, prepare } from "./base";

export const graphCommand = createCommand({
  command: "graph",
  describe: "Generate a dependency graph of the workspace projects",
  handler: async (args) => {
    const data = await prepare(args);
    console.log(dedent`
      Dependency Graph:
      ${data.dependencyGraph.getImageLink()}
    `, '\n')
  },
});
