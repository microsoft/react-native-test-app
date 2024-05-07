/**
 * This script is only used to help write release announcements.
 */
// @ts-check
// @ts-expect-error Could not find a declaration file for module
import { generateNotes } from "@semantic-release/release-notes-generator";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { URL, fileURLToPath } from "node:url";

/**
 * @param {string} output
 */
function prettyPrint(output) {
  /** @type {[RegExp, string][]} */
  const replacements = [
    [/^\* \*\*android:\*\*/gm, "* **Android:**"],
    [/^\* \*\*apple:\*\*/gm, "* **Apple:**"],
    [/^\* \*\*ios:\*\*/gm, "* **iOS:**"],
    [/^\* \*\*macos:\*\*/gm, "* **macOS:**"],
    [/^\* \*\*visionos:\*\*/gm, "* **visionOS:**"],
    [/^\* \*\*windows:\*\*/gm, "* **Windows:**"],
    [/\s*\(\[#\d+\]\(https:\/\/github.com.*/gm, ""],
  ];
  const prettified = replacements.reduce(
    (output, [search, replace]) => output.replace(search, replace),
    output
  );
  console.log(prettified);
}

function repositoryUrl() {
  const p = fileURLToPath(new URL("../package.json", import.meta.url));
  const manifest = JSON.parse(fs.readFileSync(p, { encoding: "utf-8" }));
  return manifest.repository.url;
}

/**
 * @param {string | undefined} start
 * @param {string | undefined} end
 */
function main(start, end) {
  if (!start || !end) {
    const thisScript = path.basename(process.argv[1]);
    console.log(`Usage: ${thisScript} <start tag> <end tag>`);
    process.exitCode = 1;
    return;
  }

  const { status, stderr, stdout } = spawnSync(
    "git",
    [
      "log",
      `--pretty=format:{ "hash": "%H", "message": "%s" }`,
      `${start}...${end}`,
    ],
    { encoding: "utf-8" }
  );
  if (status !== 0) {
    console.error(stderr);
    process.exitCode = status ?? 1;
    return;
  }

  const output = stdout.trim().split("\n").join(",");
  const commits = JSON.parse("[" + output + "]");
  if (commits.length === 0) {
    return;
  }

  generateNotes(
    {},
    {
      commits,
      lastRelease: { gitTag: start },
      nextRelease: { gitTag: end },
      options: {
        repositoryUrl: repositoryUrl(),
      },
      cwd: process.cwd(),
    }
  ).then(prettyPrint);
}

const [, , start, end] = process.argv;
main(start, end);
