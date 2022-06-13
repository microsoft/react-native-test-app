#!/usr/bin/env node
// @ts-check

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { format } from "prettier";
import suggest from "suggestion-bot";

const diff = process.argv.slice(2).reduce((diff, filepath) => {
  const source = readFileSync(filepath, { encoding: "utf-8" });
  const { stdout } = spawnSync("diff", ["--unified", filepath, "-"], {
    input: format(source, { filepath }),
    encoding: "utf-8",
  });
  return diff + stdout;
}, "");

suggest(diff);
