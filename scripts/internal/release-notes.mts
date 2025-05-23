/**
 * This script is only used to help write release announcements.
 */
import { spawn } from "node:child_process";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

type Commit = {
  hash: string;
  message: string;
};

type Group =
  | "general"
  | "android"
  | "apple"
  | "ios"
  | "macos"
  | "visionos"
  | "windows";

type Changes = Record<string, Record<Group, string[]>>;

function assertCategory(category: string): asserts category is "feat" | "fix" {
  if (category !== "feat" && category !== "fix") {
    throw new Error(`Unknown category: ${category}`);
  }
}

function capitalize(s: string): string {
  return String(s[0]).toUpperCase() + s.substring(1);
}

function getCommits(
  lastRelease: string,
  nextRelease: string,
  callback: (commits: Commit[]) => void
): void {
  const args = [
    "log",
    `--pretty=format:{ ＂hash＂: ＂%H＂, ＂message＂: ＂%s＂ }`,
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
      .replaceAll('"', '\\"')
      .replaceAll("＂", '"')
      .replaceAll("\n", ",");

    const commits = JSON.parse(output);
    if (commits.length === 0) {
      return;
    }

    callback(commits);
  });
}

function sanitizeGroup(group: string): Group {
  switch (group) {
    case "android":
    case "apple":
    case "ios":
    case "macos":
    case "visionos":
    case "windows":
      return group;
    default:
      return "general";
  }
}

function parseCommits(commits: Commit[]): Changes {
  const changes: Changes = {
    feat: {
      general: [],
      android: [],
      apple: [],
      ios: [],
      macos: [],
      visionos: [],
      windows: [],
    },
    fix: {
      general: [],
      android: [],
      apple: [],
      ios: [],
      macos: [],
      visionos: [],
      windows: [],
    },
  };

  for (const { message } of commits) {
    const m = message.match(/^(feat|fix)(?:\((.*?)\))?: (.*)$/);
    if (m) {
      const [, cat, group, message] = m;
      assertCategory(cat);
      changes[cat][sanitizeGroup(group)].push(message);
    }
  }

  return changes;
}

function renderGroup(group: string): string {
  switch (group) {
    case "android":
      return "**Android:** ";
    case "apple":
      return "**Apple:** ";
    case "ios":
      return "**iOS:** ";
    case "macos":
      return "**macOS:** ";
    case "visionos":
      return "**visionOS:** ";
    case "windows":
      return "**Windows:** ";
    default:
      return "";
  }
}

function renderCategory(
  header: string,
  changes: Changes[string],
  output: string[]
): string[] {
  const groups = Object.entries(changes);
  if (groups.length > 0) {
    output.push("", header, "");
    for (const [group, entries] of groups) {
      for (const entry of entries) {
        output.push(`- ${renderGroup(group)}${capitalize(entry)}`);
      }
    }
  }
  return output;
}

const [, , lastRelease, nextRelease] = process.argv;
if (!lastRelease || !nextRelease) {
  const thisScript = path.basename(fileURLToPath(import.meta.url));
  console.log(`Usage: ${thisScript} <start tag> <end tag>`);
  process.exitCode = 1;
} else {
  getCommits(lastRelease, nextRelease, (commits) => {
    const { feat, fix } = parseCommits(commits);

    const lines = [`📣 react-native-test-app ${nextRelease}`];
    renderCategory("New features:", feat, lines);
    renderCategory(`Fixes since ${lastRelease}:`, fix, lines);

    console.log(lines.join("\n"));
  });
}
