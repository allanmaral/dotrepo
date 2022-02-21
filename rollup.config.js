import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
// import { terser } from "rollup-plugin-terser";
import typescript from "rollup-plugin-typescript2";
import json from '@rollup/plugin-json';

import pkg from "./package.json";

/**
 * @type {import('rollup').RollupOptions}
 */
const config = {
  input: "./src/index.ts",

  external: [
    ...Object.keys(pkg.dependencies),
    ...Object.keys(pkg.devDependencies),
    "fs",
    "https",
    "path",
    "fs/promises",
  ],

  plugins: [
    resolve({ extensions: [".ts"] }),
    commonjs(),
    json(),
    typescript({
      useTsconfigDeclarationDir: true,
      emitDeclarationOnly: true,
    }),
    // terser(),
  ],

  output: {
    format: "cjs",
    name: "dotrepo",
    file: pkg.main,
    banner: "#! /usr/bin/env node",
    exports: "auto",
  },
};

export default config;
