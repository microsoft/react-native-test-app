/**
 * This script is only used to help write release announcements.
 */
// @ts-check
// @ts-expect-error Could not find a declaration file for module
import { generateNotes } from "@semantic-release/release-notes-generator";
import { spawnSync } from "node:child_process";
import * as path from "node:path";
import { URL, fileURLToPath } from "node:url";
import { readJSONFile } from "./helpers.js";

/**
 * @param {string} output
 * @param {string} lastRelease
 * @param {string} nextRelease
 * @returns {string}
 */
function reformat(output, lastRelease, nextRelease) {
  /** @type {[RegExp, string][]} */
  const replacements = [
    [/^# .*/m, `📣 react-native-test-app ${nextRelease}`],
    [/^### .*/m, `Other fixes since ${lastRelease}:`],
    [/^\* \*\*android:\*\*/gm, "* **Android:**"],
    [/^\* \*\*apple:\*\*/gm, "* **Apple:**"],
    [/^\* \*\*ios:\*\*/gm, "* **iOS:**"],
    [/^\* \*\*macos:\*\*/gm, "* **macOS:**"],
    [/^\* \*\*visionos:\*\*/gm, "* **visionOS:**"],
    [/^\* \*\*windows:\*\*/gm, "* **Windows:**"],
    [/\s*\(\[#\d+\]\(https:\/\/github.com.*/gm, ""],
  ];
  return replacements
    .reduce(
      (output, [search, replace]) => output.replace(search, replace),
      output
    )
    .trim();
}

function repositoryUrl() {
  const p = fileURLToPath(new URL("../package.json", import.meta.url));
  const manifest = /** @type {import("./types.js").Manifest} */ (
    readJSONFile(p)
  );
  return manifest.repository?.url;
}

/**
 * @param {string | undefined} lastRelease
 * @param {string | undefined} nextRelease
 */
function main(lastRelease, nextRelease) {
  if (!lastRelease || !nextRelease) {
    const thisScript = path.basename(fileURLToPath(import.meta.url));
    console.log(`Usage: ${thisScript} <start tag> <end tag>`);
    process.exitCode = 1;
    return;
  }

  const { status, stderr, stdout } = spawnSync(
    "git",
    [
      "log",
      `--pretty=format:{ "hash": "%H", "message": "%s" }`,
      `${lastRelease}...${nextRelease}`,
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
      lastRelease: { gitTag: lastRelease },
      nextRelease: { gitTag: nextRelease },
      options: {
        repositoryUrl: repositoryUrl(),
      },
      cwd: process.cwd(),
    }
  ).then((/** @type {string} */ output) => {
    console.log(reformat(output, lastRelease, nextRelease));
  });
}

const [, , start, end] = process.argv;
main(start, end);
