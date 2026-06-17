#!/usr/bin/env node
// @ts-check
/**
 * @import {
 *   Configuration,
 *   ConfigureParams,
 *   FileCopy,
 *   Manifest,
 *   Platform,
 *   PlatformConfiguration,
 *   PlatformPackage,
 * } from "./types.js";
 */
import { loadContext } from "@rnx-kit/tools-react-native/context";
import * as nodefs from "node:fs";
import { createRequire } from "node:module";
import * as path from "node:path";
import { URL, fileURLToPath } from "node:url";
import semverCoerce from "semver/functions/coerce.js";
import semverSatisfies from "semver/functions/satisfies.js";
import {
  getPackageVersion,
  isMain,
  memo,
  readJSONFile,
  readTextFile,
} from "./helpers.js";
import {
  appManifest,
  bundleConfig,
  copyFrom,
  findGitIgnore,
  serialize,
} from "./template.mjs";
import * as colors from "./utils/colors.mjs";
import { downloadPackage } from "./utils/npm.mjs";
import { parseArgs } from "./utils/parseargs.mjs";

/**
 * Merges two objects.
 * @param {unknown} lhs
 * @param {Record<string, unknown>} rhs
 * @returns {Record<string, unknown>}
 */
function mergeObjects(lhs, rhs) {
  return typeof lhs === "object"
    ? sortByKeys({ ...lhs, ...rhs })
    : sortByKeys(rhs);
}

/** @type {() => Required<Manifest>} */
const readManifest = memo(() =>
  readJSONFile(new URL("../package.json", import.meta.url))
);

/**
 * Prints an error message to the console.
 * @param {string} message
 */
export function error(message) {
  console.error(colors.red(`[!] ${message}`));
}

/**
 * @param {string} targetVersion
 * @returns {Promise<string | undefined>}
 */
async function findTemplateDir(targetVersion) {
  const [major, minor = 0] = targetVersion.split(".");
  const output = await downloadPackage(
    "@react-native-community/template",
    `${major}.${minor}`,
    true
  );
  return path.join(output, "template");
}

/**
 * Merges specified configurations.
 * @param {Configuration} lhs
 * @param {Configuration} rhs
 * @returns {Configuration}
 */
export function mergeConfig(lhs, rhs) {
  return {
    files: {
      ...lhs.files,
      ...rhs.files,
    },
    oldFiles: [...lhs.oldFiles, ...rhs.oldFiles],
    scripts: {
      ...lhs.scripts,
      ...rhs.scripts,
    },
    dependencies: {
      ...lhs.dependencies,
      ...rhs.dependencies,
    },
  };
}

/**
 * @param {string} root
 * @param {string} subpath
 * @returns {string | false}
 */
function resolvePath(root, subpath) {
  const resolved = path.resolve(root, subpath);
  const rel = path.relative(root, resolved);
  return !path.isAbsolute(rel) && !rel.startsWith("..") && resolved;
}

/**
 * Sort the keys in specified object.
 * @param {Record<string, unknown>} obj
 */
export function sortByKeys(obj) {
  return Object.keys(obj)
    .sort()
    .reduce((sorted, key) => {
      sorted[key] = obj[key];
      return sorted;
    }, /** @type {Record<string, unknown>} */ ({}));
}

/**
 * @param {string | string[]} input
 * @returns {Platform[]}
 */
export function validatePlatforms(input) {
  const platforms = Array.isArray(input) ? input : [input];

  let includesApplePlatforms = false;
  let includesIOS = false;

  for (const p of platforms) {
    switch (p) {
      case "ios":
        includesIOS = true;
        break;

      case "macos":
      case "visionos":
        includesApplePlatforms = true;
        break;

      case "android":
      case "windows":
        break;
    }
  }

  // Autolinking currently assumes that `ios` is always present:
  // https://github.com/react/react-native/blob/0.76-stable/packages/react-native/scripts/cocoapods/autolinking.rb#L41
  // We need to include iOS if we want to target other Apple platforms.
  if (includesApplePlatforms && !includesIOS) {
    platforms.push("ios");
  }

  return /** @type {Platform[]} */ (platforms);
}

/**
 * Prints a warning message to the console.
 * @param {string} message
 * @param {string=} tag
 */
export function warn(message, tag = "[!]") {
  console.warn(colors.yellow(`${tag} ${message}`));
}

/**
 * Returns the default npm package name for the specified platform.
 * @param {Platform} platform
 * @returns {PlatformPackage}
 */
export function getDefaultPlatformPackageName(platform) {
  if (platform === "common") {
    return "react-native";
  }

  const { defaultPlatformPackages } = readManifest();
  const pkg = defaultPlatformPackages[platform];
  return pkg?.id;
}

/**
 * Returns platform package at target version if it satisfies version range.
 * @param {Platform} platform
 * @param {string} targetVersion
 * @returns {Record<string, string> | undefined}
 */
export function getPlatformPackage(platform, targetVersion) {
  const packageName = getDefaultPlatformPackageName(platform);
  if (!packageName || packageName === "react-native") {
    return {};
  }

  const v = semverCoerce(targetVersion);
  if (!v) {
    throw new Error(`Invalid ${packageName} version: ${targetVersion}`);
  }

  const { peerDependencies } = readManifest();
  const versionRange = peerDependencies[packageName];
  if (!semverSatisfies(v.version, versionRange)) {
    warn(
      `${packageName}@${v.major}.${v.minor} cannot be added because it does not exist or is unsupported`
    );
    return undefined;
  }

  return { [packageName]: `^${v.major}.${v.minor}.0` };
}

/**
 * Returns the appropriate `react-native.config.js` for specified parameters.
 * @param {ConfigureParams} params
 * @returns {string | FileCopy}
 */
export function reactNativeConfig({ name, testAppPath }, fs = nodefs) {
  const config = path.join(testAppPath, "example", "react-native.config.js");
  return readTextFile(config, fs).replaceAll("Example", name);
}

/**
 * @param {ConfigureParams} params
 * @param {NodeJS.Require} require
 * @param {PlatformConfiguration} configuration
 * @returns {PlatformConfiguration}
 */
function loadPlatformTemplates(params, require, configuration, fs = nodefs) {
  const { packagePath, testAppPath } = params;
  const { defaultPlatformPackages } = readManifest();
  const platformPackages = { ...defaultPlatformPackages };

  try {
    const config = loadContext(packagePath);
    for (const [, { root }] of Object.entries(config.dependencies)) {
      const manifest = readJSONFile(path.join(root, "package.json"), fs);
      const { reactNativeTemplateConfig: config } = manifest;
      if (config && typeof config === "object" && !Array.isArray(config)) {
        console.log(
          "Loading template config:",
          path.relative(packagePath, root)
        );
        for (const [key, { template, ...rest }] of Object.entries(config)) {
          const resolved = resolvePath(root, template);
          if (resolved) {
            platformPackages[key] = { ...rest, template: resolved };
          }
        }
      }
    }
  } catch (_) {
    // If this was executed outside any projects, `@react-native-community/cli`
    // will not be available and error here.
  }

  for (const [platform, { template }] of Object.entries(platformPackages)) {
    const { getTemplate } = require(
      template.startsWith(".") ? path.join(testAppPath + template) : template
    );
    configuration[platform] = getTemplate(params, fs);
  }

  return configuration;
}

/**
 * Returns a {@link Configuration} object for specified platform.
 *
 * A {@link Configuration} object consists of four main parts:
 *
 * - `files`: A filename/content map of files to create. The content of a file
 *   is either generated from {@link ConfigureParams}, or is copied from
 *   somewhere. If the file is copied, the content is a {@link FileCopy} object
 *   instead of a string.
 * - `oldFiles`: A list of files that will be deleted if found.
 * - `scripts`: Scripts that will be added to `package.json`.
 *
 * There is a {@link Configuration} object for each supported platform.
 * Additionally, there is a common {@link Configuration} object that is always
 * included by {@link gatherConfig} during {@link configure}.
 */
export const getConfig = (() => {
  /** @type {PlatformConfiguration} */
  let configuration;
  return (
    /** @type {ConfigureParams} */ params,
    /** @type {Platform} */ platform,
    disableCache = false,
    fs = nodefs
  ) => {
    if (disableCache || typeof configuration === "undefined") {
      const { name, templatePath, testAppPath, init } = params;

      const require = createRequire(import.meta.url);
      const templateDir =
        templatePath ||
        path.relative(
          process.cwd(),
          path.dirname(require.resolve("react-native/template/package.json"))
        );

      configuration = loadPlatformTemplates(params, require, {
        common: {
          files: {
            ".gitignore": findGitIgnore(path.join(testAppPath, "example"), fs),
            ".watchmanconfig": copyFrom(templateDir, "_watchmanconfig"),
            "babel.config.js": copyFrom(templateDir, "babel.config.js"),
            "metro.config.js": copyFrom(
              testAppPath,
              "example",
              "metro.config.js"
            ),
            "react-native.config.js": reactNativeConfig(params),
            ...(!init
              ? undefined
              : {
                  ".bundle/config": bundleConfig(),
                  "App.tsx": copyFrom(templateDir, "App.tsx"),
                  Gemfile: copyFrom(templateDir, "Gemfile"),
                  "app.json": appManifest(name),
                  "index.js": copyFrom(templateDir, "index.js"),
                  "package.json": readTextFile(
                    path.join(templateDir, "package.json"),
                    fs
                  ).replaceAll("HelloWorld", name),
                  "tsconfig.json": copyFrom(templateDir, "tsconfig.json"),
                }),
          },
          oldFiles: [],
          scripts: {
            start: "react-native start",
          },
          dependencies: {},
        },
      });
    }
    return configuration[platform];
  };
})();

/**
 * Collects and returns configuration for all specified platforms.
 * @param {ConfigureParams} params
 * @returns Configuration
 */
export function gatherConfig(params, disableCache = false) {
  const { platforms, targetVersion } = params;
  const config = (() => {
    return platforms.reduce(
      (config, platform) => {
        const platformConfig = getConfig(params, platform, disableCache);
        const dependencies = getPlatformPackage(platform, targetVersion);
        if (!dependencies) {
          /* node:coverage ignore next */
          return config;
        }

        return mergeConfig(config, {
          ...platformConfig,
          files: Object.fromEntries(
            // Map each file into its platform specific folder, e.g.
            // `Podfile` -> `ios/Podfile`
            Object.entries(platformConfig.files).map(([filename, content]) => [
              path.join(platform, filename),
              content,
            ])
          ),
          oldFiles: platformConfig.oldFiles.map((file) => {
            return path.join(platform, file);
          }),
          dependencies: {
            ...dependencies,
            ...platformConfig.dependencies,
          },
        });
      },
      /** @type {Configuration} */ ({
        files: {},
        oldFiles: [],
        scripts: {},
        dependencies: {},
      })
    );
  })();

  if (
    Object.keys(config.scripts).length === 0 &&
    Object.keys(config.dependencies).length === 0 &&
    Object.keys(config.files).length === 0 &&
    config.oldFiles.length === 0
  ) {
    return config;
  }

  return mergeConfig(getConfig(params, "common", disableCache), config);
}

/**
 * Retrieves app name from the app manifest.
 * @param {string} packagePath
 * @returns {string}
 */
export function getAppName(packagePath, fs = nodefs) {
  try {
    const { name } = readJSONFile(path.join(packagePath, "app.json"), fs);
    if (typeof name === "string" && name) {
      return name;
    }
  } catch (_) {
    // No name? Use fallback.
  }

  warn("Could not determine app name; using 'ReactTestApp'");
  return "ReactTestApp";
}

/**
 * Returns whether destructive operations will be required.
 * @param {string} packagePath
 * @param {Configuration} config
 * @returns {boolean}
 */
export function isDestructive(packagePath, { files, oldFiles }, fs = nodefs) {
  const modified = Object.keys(files).reduce((result, file) => {
    const targetPath = path.join(packagePath, file);
    if (fs.existsSync(targetPath)) {
      result.push(targetPath);
    }
    return result;
  }, /** @type {string[]} */ ([]));

  const removed = oldFiles.reduce((result, file) => {
    const targetPath = path.join(packagePath, file);
    if (fs.existsSync(targetPath)) {
      result.push(targetPath);
    }
    return result;
  }, /** @type {string[]} */ ([]));

  if (modified.length > 0 || removed.length > 0) {
    if (modified.length > 0) {
      const reset = colors.bold("reset");
      warn(`The following files will be ${reset} to their original state:`);
      modified.sort().forEach((file) => warn(file, "    "));
    }
    if (removed.length > 0) {
      warn("The following files will be removed:");
      removed.sort().forEach((file) => warn(file, "    "));
    }
    return true;
  }

  return false;
}

/**
 * Removes all specified files on disk.
 * @param {Configuration["oldFiles"]} files
 * @param {string} destination
 * @returns {Promise<void[]>}
 */
export function removeAllFiles(files, destination, fs = nodefs.promises) {
  const options = { force: true, maxRetries: 3, recursive: true };
  return Promise.all(
    files.map((filename) => fs.rm(path.join(destination, filename), options))
  );
}

/**
 * Returns the package manifest with additions for react-native-test-app.
 * @param {import("node:fs").PathLike} path
 * @param {Configuration} config
 * @returns {Record<string, unknown>}
 */
export function updatePackageManifest(
  path,
  { dependencies, scripts },
  fs = nodefs
) {
  const manifest = readJSONFile(path, fs);

  manifest["scripts"] = mergeObjects(manifest["scripts"], scripts);

  manifest["dependencies"] = mergeObjects(
    manifest["dependencies"],
    dependencies
  );

  const { name: rntaName, version: rntaVersion } = readManifest();
  manifest["devDependencies"] = mergeObjects(manifest["devDependencies"], {
    "@rnx-kit/metro-config": "^2.2.4",
    [rntaName]: `^${rntaVersion}`,
  });

  return manifest;
}

/**
 * Writes all specified files to disk.
 * @param {Configuration["files"]} files
 * @param {string} destination
 * @returns {Promise<void[]>}
 */
export function writeAllFiles(files, destination, fs = nodefs.promises) {
  const options = { recursive: true, mode: 0o755 };
  return Promise.all(
    Object.keys(files).map(async (filename) => {
      const content = files[filename];
      if (!content) {
        return;
      }

      const file = path.join(destination, filename);
      await fs.mkdir(path.dirname(file), options);
      if (typeof content === "string") {
        await fs.writeFile(file, content);
      } else {
        try {
          await fs.copyFile(content.source, file);
        } catch (e) {
          if (path.basename(content.source) !== ".gitignore") {
            throw e;
          }

          // This is a special case for `.gitignore` files. On CI, and only
          // during testing, there is some sort of race condition that causes
          // the files to be renamed _after_ `getConfig()` is called, even
          // though the renaming should've happened during `npm pack`, long
          // before this script is ever called.
          const sourceDir = path.dirname(content.source);
          await fs.copyFile(path.join(sourceDir, "_gitignore"), file);
        }
      }
    })
  );
}

/**
 * Configure specified package to use react-native-test-app.
 * @param {ConfigureParams} params
 * @returns {number}
 */
export function configure(params, fs = nodefs) {
  const { force, packagePath } = params;
  const config = gatherConfig(params);

  if (!force && isDestructive(packagePath, config)) {
    error(
      "Some files will be reset and/or removed: You may have to manually restore your own or your template's customizations to get the app working again (for more details, see https://github.com/microsoft/react-native-test-app/wiki/Updating#reconfiguringresetting-rnta)"
    );
    const forceFlag = colors.bold("--force");
    console.log(`Re-run with ${forceFlag} if you're fine with this.`);
    return 1;
  }

  const { files, oldFiles } = config;

  writeAllFiles(files, packagePath).then(() => {
    const packageManifest = path.join(packagePath, "package.json");
    if (!fs.existsSync(packageManifest)) {
      // We cannot assume that the app itself is an npm package. Some libraries
      // have an 'example' folder inside the package.
      warn(
        `skipped modifying 'package.json' because it was not found in path '${packagePath}'`
      );
      return;
    }

    const newPackageManifest = updatePackageManifest(packageManifest, config);
    fs.writeFile(
      packageManifest,
      serialize(newPackageManifest),
      (/** @type {Error | null} */ error) => {
        if (error) {
          throw error;
        }
      }
    );
  });

  removeAllFiles(oldFiles, packagePath);

  return 0;
}

if (isMain(import.meta.url)) {
  /** @type {Platform[]} */
  const platformChoices = ["android", "ios", "macos", "windows"];
  const defaultPlatforms = platformChoices.join(", ");

  parseArgs(
    "Configures React Test App in an existing package",
    {
      force: {
        description: "Allow destructive operations",
        type: "boolean",
        short: "f",
        default: false,
      },
      init: {
        description: "Initialize a new project",
        type: "boolean",
        default: false,
      },
      package: {
        description:
          "Path of the package to modify (defaults to current directory)",
        type: "string",
        default: ".",
      },
      platforms: {
        description: `Platforms to configure (defaults to [${defaultPlatforms}])`,
        type: "string",
        multiple: true,
        short: "p",
        default: platformChoices,
      },
    },
    async ({
      _: { [0]: name },
      force,
      init,
      package: packagePath,
      platforms,
    }) => {
      const targetVersion = getPackageVersion("react-native");
      process.exitCode = configure({
        name: typeof name === "string" && name ? name : getAppName(packagePath),
        packagePath,
        templatePath: await findTemplateDir(targetVersion),
        testAppPath: fileURLToPath(new URL("..", import.meta.url)),
        targetVersion,
        platforms: validatePlatforms(platforms),
        force,
        init,
      });
    }
  );
}
