// @ts-check
import { getCurrentState } from "@rnx-kit/tools-react-native/cache";
import { loadContextAsync } from "@rnx-kit/tools-react-native/context";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  isMain,
  readJSONFile,
  readTextFile,
  writeTextFile,
} from "../scripts/helpers.js";
import { mkdir_p, writeJSONFile } from "../scripts/utils/filesystem.mjs";

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
  mkdir_p(path.dirname(p));
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
 * @returns {Promise<Config>}
 */
async function loadConfig(json, projectRoot) {
  const state = getCurrentState(projectRoot);
  const stateFile = json.substring(0, json.length - "json".length) + "sha256";
  if (fs.existsSync(stateFile) && readTextFile(stateFile) === state) {
    return readJSONFile(json);
  }

  const config = await loadContextAsync(projectRoot);
  const prunedConfig = pruneDependencies(config);

  ensureDirForFile(json);
  writeJSONFile(json, prunedConfig);
  writeTextFile(stateFile, state);
  return prunedConfig;
}

/**
 * @param {string} projectRoot
 * @param {string} output
 * @returns {Promise<void>}
 */
async function main(projectRoot, output) {
  const config = await loadConfig(
    output.replace(
      /[/\\]app[/\\]build[/\\]generated[/\\]rnta[/\\]/,
      "/build/generated/autolinking/"
    ),
    projectRoot
  );
  const dependencies = pickAndroidDependencies(config);

  if (!output) {
    console.log(JSON.stringify(dependencies, undefined, 2));
  } else {
    ensureDirForFile(output);
    writeJSONFile(output, dependencies);
  }
}

if (isMain(import.meta.url)) {
  const [, , projectRoot = process.cwd(), output = ""] = process.argv;
  await main(projectRoot, output);
}
