import { spawnSync } from "node:child_process";

type Language = "ruby" | "typescript";

function getTarget(files: string[]): Language | undefined {
  if (files.some((file) => file.endsWith(".rb"))) {
    return "ruby";
  } else if (files.some((file) => file.endsWith(".ts"))) {
    return "typescript";
  } else {
    return undefined;
  }
}

function testWith(command: string, args: string[]): void {
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
      "--experimental-strip-types",
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
