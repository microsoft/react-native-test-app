#!/usr/bin/env node
// @ts-check
"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs");
const prettier = require("prettier");

const diff = process.argv.slice(2).reduce((diff, filepath) => {
  const source = fs.readFileSync(filepath, { encoding: "utf8" });
  const { stdout } = spawnSync("diff", ["--unified", filepath, "-"], {
    input: prettier.format(source, { filepath }),
    encoding: "utf-8",
  });
  return diff + stdout;
}, "");

require("suggestion-bot")(diff);
