export const grammar = {
  project: {
    id: /[\\/]([^$\\/]*).csproj/i,
    extension: /\.csproj$/i,
    version: /<Version>\s*([^<]*)\s*<\/Version>/,
    reference: {
      tag: /<(?:Package|Project)Reference ([^\/>]*)\/?>/gim,
      include: /Include="([^"]+)"/i,
      version: /Version="([^"]+)"/i,
    },
  },
  solution: {
    id: /[\/\\]([^$\/\\]*).sln$/i,
    extension: /\.sln$/i,
    listOutput: /-+\n/ 
  }
};
