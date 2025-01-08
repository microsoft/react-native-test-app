/**
 * This script is only used to help write release announcements.
 */
// @ts-expect-error Could not find a declaration file for module
import { generateNotes } from "@semantic-release/release-notes-generator";
import { spawn } from "node:child_process";
import * as path from "node:path";
import { URL, fileURLToPath } from "node:url";
import { readJSONFile } from "../helpers.js";
import type { Manifest } from "../types.js";

function reformat(
  output: string,
  lastRelease: string,
  nextRelease: string
): string {
  const replacements: [RegExp, string][] = [
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
  const p = fileURLToPath(new URL("../../package.json", import.meta.url));
  const manifest = readJSONFile<Manifest>(p);
  return manifest.repository?.url;
}

/**
 * @param {string} lastRelease
 * @param {string} nextRelease
 */
function main(lastRelease: string, nextRelease: string): void {
  const args = [
    "log",
    `--pretty=format:{ "hash": "%H", "message": "%s" }`,
    `${lastRelease}...${nextRelease}`,
  ];
  const git = spawn("git", args, { stdio: ["ignore", "pipe", "inherit"] });

  const buffers = [Buffer.from("[")];
  git.stdout.on("data", (chunk) => buffers.push(chunk));

  git.on("close", (exitCode) => {
    if (exitCode !== 0) {
      process.exitCode = exitCode ?? 1;
      return;
    }

    buffers.push(Buffer.from("]"));

    const output = Buffer.concat(buffers)
      .toString()
      .trim()
      .replaceAll("\n", ",");
    const commits = JSON.parse(output);
    if (commits.length === 0) {
      return;
    }

    const context = {
      commits,
      lastRelease: { gitTag: lastRelease },
      nextRelease: { gitTag: nextRelease },
      options: {
        repositoryUrl: repositoryUrl(),
      },
      cwd: process.cwd(),
    };

    const releaseNotes: Promise<string> = generateNotes({}, context);
    releaseNotes
      .then((output) => reformat(output, lastRelease, nextRelease))
      .then((output) => console.log(output));
  });
}

const [, , lastRelease, nextRelease] = process.argv;
if (!lastRelease || !nextRelease) {
  const thisScript = path.basename(fileURLToPath(import.meta.url));
  console.log(`Usage: ${thisScript} <start tag> <end tag>`);
  process.exitCode = 1;
} else {
  main(lastRelease, nextRelease);
}
