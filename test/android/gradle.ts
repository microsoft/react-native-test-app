/* node:coverage disable */
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as path from "node:path";
import { URL, fileURLToPath } from "node:url";
import { gatherConfig, writeAllFiles } from "../../scripts/configure.mjs";
import { findNearest, readJSONFile } from "../../scripts/helpers.js";
import type { ConfigureParams } from "../../scripts/types.js";
import { templatePath } from "../template.js";

const GRADLE_TEST_TASK = "nodeTest";
const MKDIR_OPTIONS = { recursive: true, mode: 0o755 };
const RM_OPTIONS = { maxRetries: 3, recursive: true };

/**
 * Joins the strings if an array is passed, otherwise returns the string.
 */
function joinStrings(strings: string | string[], separator = "") {
  return Array.isArray(strings) ? strings.join(separator) : strings;
}

/**
 * Returns project path given name.
 */
function projectPath(name: string): string {
  return `.android-test-${name}`;
}

export function buildGradle(script: string): string[] {
  return [
    "buildscript {",
    '    def androidTestAppDir = "../node_modules/react-native-test-app/android"',
    '    apply(from: "${androidTestAppDir}/dependencies.gradle")',
    '    apply(from: "${androidTestAppDir}/manifest.gradle")',
    '    apply(from: "${androidTestAppDir}/node.gradle")',
    '    apply(from: "${androidTestAppDir}/utils.gradle")',
    "",
    "    repositories {",
    "        mavenCentral()",
    "        google()",
    "    }",
    "",
    "    dependencies {",
    "        getReactNativeDependencies().each { dependency ->",
    "            classpath(dependency)",
    "        }",
    "    }",
    "}",
    "",
    `task ${GRADLE_TEST_TASK} {`,
    script,
    "}",
  ];
}

/**
 * Initializes a React Native project.
 */
async function makeProject(
  name: string,
  platforms: ConfigureParams["platforms"],
  setupFiles: Record<string, string | string[]> | undefined = {}
) {
  const packagePath = projectPath(name);
  const { files } = gatherConfig({
    name,
    packagePath,
    templatePath,
    testAppPath: fileURLToPath(new URL("../..", import.meta.url)),
    targetVersion: reactNativeVersion(),
    platforms,
    force: true,
    init: true,
  });

  await writeAllFiles(files, packagePath);

  try {
    await fsp.symlink(
      fileURLToPath(new URL("../../example/node_modules", import.meta.url)),
      path.join(packagePath, "node_modules"),
      "dir"
    );
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code !== "EEXIST") {
      throw e;
    }
  }

  await Promise.all(
    Object.entries(setupFiles).map(([filename, content]) => {
      const p = path.join(packagePath, filename);
      return fsp
        .mkdir(path.dirname(p), MKDIR_OPTIONS)
        .then(() => fsp.writeFile(p, joinStrings(content, "\n")));
    })
  );

  return packagePath;
}

export function reactNativeVersion() {
  const rnPath = findNearest("node_modules/react-native/package.json");
  if (!rnPath) {
    throw new Error("Cannot find module 'react-native'");
  }

  const { version } = readJSONFile(rnPath);
  if (typeof version !== "string") {
    throw new Error(`Invalid version string for 'react-native': ${version}`);
  }

  return version;
}

/**
 * Removes specified project.
 */
export function removeProject(name: string) {
  fs.rm(projectPath(name), RM_OPTIONS, (e) => {
    if (e) {
      throw e;
    }
  });
}

/**
 * Runs Gradle in specified directory.
 */
function runGradle(cwd: string, ...args: string[]) {
  // As of Node 20.12.2, it is no longer allowed to spawn a process with `.bat`
  // or `.cmd` without shell (see https://nodejs.org/en/blog/release/v20.12.2).
  const isWindows = process.platform === "win32";
  const gradlew = isWindows ? "gradlew.bat" : "./gradlew";
  return spawnSync(gradlew, args, { cwd, encoding: "utf-8", shell: isWindows });
}

/**
 * Initializes a new React Native project and runs Gradle.
 */
export async function runGradleWithProject(
  name: string,
  platforms: ConfigureParams["platforms"],
  setupFiles: Record<string, string | string[]> | undefined = {}
) {
  const projectPath = await makeProject(name, platforms, setupFiles);
  const result = runGradle(
    path.resolve(projectPath, "android"),
    GRADLE_TEST_TASK
  );
  const stdout = joinStrings(result.stdout);
  const stderr = joinStrings(result.stderr);
  if (result.stderr) {
    console.log(stdout);
    console.error(stderr);
  }
  return { ...result, stdout, stderr };
}
