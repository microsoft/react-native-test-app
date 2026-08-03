import { getBaseCommit, getChangedFiles, git } from "@rnx-kit/tools-git";
import * as yaml from "js-yaml";
import * as fs from "node:fs";
import * as path from "node:path";

type MatchChangedFiles = { "any-glob-to-any-file": string[] };
type Match = { "changed-files": MatchChangedFiles[] };

/**
 * Cleans up the given array.
 */
function clean(platforms: string[]): string[] {
  return platforms.map((p) => p.toLowerCase()).sort();
}

/**
 * Loads labels from Pull Request Labeler action configuration.
 */
function loadLabels(): Record<string, Match[] | undefined> {
  const yml = fs.readFileSync(".github/labeler.yml", { encoding: "utf-8" });
  return yaml.load(yml) as Record<string, Match[] | undefined>;
}

/**
 * Makes platform specific file path matchers.
 */
function makeMatchers(): Record<string, string[]> {
  const matchers: Record<string, string[]> = {};
  const labels = loadLabels();

  for (const [label, match] of Object.entries(labels)) {
    if (!Array.isArray(match)) {
      continue;
    }

    const patterns = match[0]["changed-files"][0]["any-glob-to-any-file"];
    const platform = label.split(": ")[1];
    matchers[platform] = patterns.map((pattern) =>
      // Modify pattern to match filenames starting with a period (but ignore
      // patterns that start with `*`)
      pattern.replaceAll("/*", "/{.,}*")
    );
  }

  return matchers;
}

/**
 * Returns platforms affected by changed files.
 */
function getAffectedPlatforms(targetBranch: string | undefined): string[] {
  const platformMatchers = makeMatchers();

  const baseCommit = getBaseCommit(targetBranch, "origin/trunk");
  if (!baseCommit) {
    // Match all platforms if we cannot find base commit
    return clean(Object.keys(platformMatchers));
  }

  const files = getChangedFiles(baseCommit);
  if (files.length === 0) {
    // If there are no files, we are building default branch
    return clean(Object.keys(platformMatchers));
  }

  // All platforms are affected if `react-native` related packages are changed
  const lockfile = "yarn.lock";
  if (files.includes(lockfile)) {
    const diff = git("diff", baseCommit, lockfile);
    if (diff.includes("react-native")) {
      return clean(Object.keys(platformMatchers));
    }
  }

  const affectedPlatforms = new Set<string>();
  for (const [platform, patterns] of Object.entries(platformMatchers)) {
    if (patterns.some((m) => files.some((f) => path.matchesGlob(f, m)))) {
      affectedPlatforms.add(platform);
    }
  }

  return affectedPlatforms.size > 0 ? clean(Array.from(affectedPlatforms)) : [];
}

const { [2]: targetBranch } = process.argv;
const platforms = getAffectedPlatforms(targetBranch);
if (platforms.length > 0) {
  console.log(platforms.join("\n"));
}
