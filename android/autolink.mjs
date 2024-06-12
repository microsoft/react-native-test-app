// @ts-check
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  findFile,
  isMain,
  readJSONFile,
  readTextFile,
  requireTransitive,
  writeTextFile,
} from "../scripts/helpers.js";

/**
 * @typedef {import("@react-native-community/cli-types").Config} Config
 * @typedef {import("../scripts/types.js").AndroidDependencies} AndroidDependencies
 */

/**
 * @see {@link https://github.com/facebook/react-native/blob/924fb3de9bc9328c3315316fbb796b933be5bcbe/packages/react-native-gradle-plugin/shared/src/main/kotlin/com/facebook/react/model/ModelAutolinkingDependenciesJson.kt#L17}
 * @param {string} name
 * @returns {string}
 */
export function cleanDependencyName(name) {
  const nom = name.replace(/[!'()*/~]+/g, "_");
  return nom.startsWith("@") ? nom.substring(1) : nom;
}

/**
 * @param {string} p
 */
function ensureDirForFile(p) {
  fs.mkdirSync(path.dirname(p), { recursive: true, mode: 0o755 });
}

/**
 * @param {string} projectRoot
 * @returns {string}
 */
function getCurrentState(projectRoot) {
  const sha2 = crypto.createHash("sha256");
  const manifestPath = findFile("package.json", projectRoot);
  sha2.update(manifestPath ? fs.readFileSync(manifestPath) : "");

  const lockfiles = [
    "yarn.lock",
    "package-lock.json",
    "pnpm-lock.yaml",
    "bun.lockb",
  ];
  for (const file of lockfiles) {
    const p = findFile(file, projectRoot);
    if (p) {
      const content = fs.readFileSync(p);
      sha2.update(content);
      break;
    }
  }

  return sha2.digest("hex");
}

/**
 * @param {Config} config
 * @returns {AndroidDependencies}
 */
export function pickAndroidDependencies({ dependencies }) {
  /** @type {AndroidDependencies} */
  const result = {};
  for (const dependency of Object.values(dependencies)) {
    const projectDir = dependency.platforms.android?.sourceDir;
    if (projectDir) {
      const name = ":" + cleanDependencyName(dependency.name);

      /** @type {AndroidDependencies[string]["configurations"]} */
      const configurations = [];
      const dependencyConfiguration =
        dependency.platforms?.android?.dependencyConfiguration;
      if (dependencyConfiguration) {
        configurations.push(dependencyConfiguration);
      } else {
        const buildTypes = dependency.platforms?.android?.buildTypes ?? [];
        if (buildTypes.length === 0) {
          configurations.push("implementation");
        } else {
          for (const buildType of buildTypes) {
            configurations.push(`${buildType}Implementation`);
          }
        }
      }

      result[name] = { projectDir, configurations };
    }
  }
  return result;
}

/**
 * @param {Config} config
 */
export function pruneDependencies(config) {
  const { dependencies } = config;
  for (const [name, dependency] of Object.entries(dependencies)) {
    if (!Object.values(dependency.platforms).some((entry) => Boolean(entry))) {
      delete dependencies[name];
    }
  }
  return config;
}

/**
 * @param {string} json
 * @param {string} projectRoot
 * @returns {Config}
 */
function loadConfig(json, projectRoot) {
  const state = getCurrentState(projectRoot);
  const stateFile = json.substring(0, json.length - "json".length) + "sha256";
  if (fs.existsSync(stateFile) && readTextFile(stateFile) === state) {
    return readJSONFile(json);
  }

  /** @type {import("@react-native-community/cli")} */
  const { loadConfig } = requireTransitive(
    ["react-native", "@react-native-community/cli"],
    projectRoot
  );
  const config = loadConfig(projectRoot);
  const prunedConfig = pruneDependencies(config);
  ensureDirForFile(json);
  writeTextFile(json, JSON.stringify(prunedConfig, undefined, 2) + "\n");
  writeTextFile(stateFile, state);
  return prunedConfig;
}

if (isMain(import.meta.url)) {
  const [, , projectRoot = process.cwd(), output] = process.argv;

  const config = loadConfig(
    output.replace(
      /[/\\]app[/\\]build[/\\]generated[/\\]rnta[/\\]/,
      "/build/generated/autolinking/"
    ),
    projectRoot
  );
  const dependencies = pickAndroidDependencies(config);

  const json = JSON.stringify(dependencies, undefined, 2);
  if (!output) {
    console.log(json);
  } else {
    ensureDirForFile(output);
    writeTextFile(output, json + "\n");
  }
}
