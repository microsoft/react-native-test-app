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
 * @param {crypto.Hash} hash
 * @param {string[]} files
 * @param {string} projectRoot
 * @param {"all" | "first-only"} mode
 */
function updateHash(hash, files, projectRoot, mode) {
  for (const file of files) {
    const p = findFile(file, projectRoot);
    if (p) {
      hash.update(fs.readFileSync(p));
      if (mode === "first-only") {
        break;
      }
    }
  }
}

/**
 * @param {string} projectRoot
 * @returns {string}
 */
function getCurrentState(projectRoot) {
  const sha2 = crypto.createHash("sha256");

  const configFiles = ["package.json", "react-native.config.js"];
  updateHash(sha2, configFiles, projectRoot, "all");

  const lockfiles = [
    "yarn.lock",
    "package-lock.json",
    "pnpm-lock.yaml",
    "bun.lockb",
  ];
  updateHash(sha2, lockfiles, projectRoot, "first-only");

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
    const { android } = dependency.platforms;
    const projectDir = android?.sourceDir;
    if (projectDir && android?.isPureCxxDependency != true) {
      const name = ":" + cleanDependencyName(dependency.name);

      /** @type {AndroidDependencies[string]["configurations"]} */
      const configurations = [];
      const dependencyConfiguration = android.dependencyConfiguration;
      if (dependencyConfiguration) {
        configurations.push(dependencyConfiguration);
      } else {
        const buildTypes = android.buildTypes ?? [];
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

  // The signature of `loadConfig` changed in 14.0.0:
  // https://github.com/react-native-community/cli/commit/b787c89edb781bb788576cd615d2974fc81402fc
  const argc = loadConfig.length;
  // @ts-expect-error TS2345: Argument of type X is not assignable to parameter of type Y
  const config = loadConfig(argc === 1 ? { projectRoot } : projectRoot);

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
