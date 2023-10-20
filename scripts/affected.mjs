#!/usr/bin/env node
// @ts-check

import yaml from "js-yaml";
import { Minimatch } from "minimatch";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";

/**
 * Cleans up the given array.
 * @param {string[]} platforms
 */
function clean(platforms) {
  return platforms.map((p) => p.toLowerCase()).sort();
}

/**
 * Executes a Git command.
 * @param {...string} args
 * @returns {string}
 */
function git(...args) {
  const { stderr, stdout } = spawnSync("git", args);
  const message = stderr.toString().trim();
  if (message) {
    console.error(message);
  }
  return stdout.toString().trim();
}

/**
 * Returns the default Git branch.
 * @returns {string}
 */
function getDefaultBranch() {
  const defaultBranch = git("rev-parse", "--abbrev-ref", "origin/HEAD");
  if (!defaultBranch) {
    throw new Error("Failed to determine default branch");
  }
  return defaultBranch;
}

/**
 * Returns the commit from which this branch was forked.
 * @returns {string}
 */
function getBaseCommit() {
  const base = git("merge-base", "--fork-point", getDefaultBranch());
  if (!base) {
    throw new Error("Failed to determine base commit");
  }
  return base;
}

/**
 * Returns changed files since fork point.
 * @param {string} since
 * @returns {string[]}
 */
function getChangedFiles(since) {
  const changedFiles = git("diff", "--name-only", since);
  if (!changedFiles) {
    throw new Error("Failed to find changed files");
  }
  return changedFiles.split("\n");
}

/**
 * Loads labels from Pull Request Labeler action configuration.
 * @see {@link https://github.com/actions/labeler}
 * @returns {Record<string, string[] | undefined>}
 */
function loadLabels() {
  const yml = fs.readFileSync(".github/labeler.yml", { encoding: "utf-8" });
  return /**@type {Record<string, string[] | undefined>} */ (yaml.load(yml));
}

/**
 * Makes platform specific file path matchers.
 * @returns {Record<string, Minimatch[]>}
 */
function makeMatchers() {
  /** @type {Record<string, Minimatch[]>} */
  const matchers = {};
  const options = { dot: true };
  const labels = loadLabels();

  for (const [label, patterns] of Object.entries(labels)) {
    if (!Array.isArray(patterns)) {
      continue;
    }
    const platform = label.split(": ")[1];
    matchers[platform] = patterns.map((m) => new Minimatch(m, options));
  }

  return matchers;
}

/**
 * Returns platforms affected by changed files.
 * @param {string=} baseCommit
 * @returns {string[]}
 */
function getAffectedPlatforms(baseCommit = getBaseCommit()) {
  const changedFiles = getChangedFiles(baseCommit);
  if (changedFiles.length === 0) {
    return [];
  }

  const platformMatchers = makeMatchers();

  // All platforms are affected if `react-native` related packages are changed
  const lockfile = "yarn.lock";
  if (changedFiles.includes(lockfile)) {
    const diff = git("diff", baseCommit, lockfile);
    if (diff.includes("react-native")) {
      return clean(Object.keys(platformMatchers));
    }
  }

  /** @type {Set<string>} */
  const affectedPlatforms = new Set();
  for (const [platform, matchers] of Object.entries(platformMatchers)) {
    if (matchers.some((m) => changedFiles.some((f) => m.match(f)))) {
      affectedPlatforms.add(platform);
    }
  }

  return affectedPlatforms.size > 0 ? clean(Array.from(affectedPlatforms)) : [];
}

const { [2]: base } = process.argv;
const output = getAffectedPlatforms(base).join("\n");
if (output) {
  console.log(output);
}
