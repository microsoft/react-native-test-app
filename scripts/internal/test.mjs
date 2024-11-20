// @ts-check
import { spawnSync } from "node:child_process";

/**
 * @param {string[]} files
 * @returns {"ruby" | "typescript" | undefined}
 */
function getTarget(files) {
  if (files.some((file) => file.endsWith(".rb"))) {
    return "ruby";
  } else if (files.some((file) => file.endsWith(".ts"))) {
    return "typescript";
  } else {
    return undefined;
  }
}

/**
 * @param {string} command
 * @param {string[]} args
 */
function testWith(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  process.exitCode = result.status ?? 1;
}

const input = process.argv.slice(2);
switch (getTarget(input)) {
  case "ruby":
    testWith("bundle", ["exec", "ruby", "-Ilib:test", ...input]);
    break;
  case "typescript":
    testWith(process.argv0, [
      "--experimental-transform-types",
      "--no-warnings",
      "--test",
      "--experimental-test-coverage",
      ...input,
    ]);
    break;
  default:
    console.error(`Unable to determine test target: [${input}]`);
    process.exitCode = 1;
    break;
}
