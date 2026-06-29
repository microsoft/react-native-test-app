// @ts-check
import * as nodefs from "node:fs";
import { Module, createRequire } from "node:module";
import * as path from "node:path";
import * as vm from "node:vm";
import manifest from "../package.json" with { type: "json" };
import { readJSONFile } from "./helpers.js";

/** @import { ConfigureParams, Plugin } from "./types.js"; */

/**
 * @param {...string} paths
 * @returns {{ source: string; }}
 */
export function copyFrom(...paths) {
  return { source: path.join(...paths) };
}

/**
 * @param {string} dir
 * @returns {import("./types.ts").Configuration["files"][string]}
 */
export function findGitIgnore(dir, fs = nodefs) {
  // `.gitignore` files are only renamed when published.
  for (const filename of ["_gitignore", ".gitignore"]) {
    const gitignore = path.join(dir, filename);
    if (fs.existsSync(gitignore)) {
      return { source: gitignore };
    }
  }

  return "";
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
 * Converts an object or value to a pretty JSON string.
 * @param {Record<string, unknown>} obj
 * @return {string}
 */
export function serialize(obj) {
  return JSON.stringify(obj, undefined, 2) + "\n";
}

/**
 * @param {string} name
 * @returns {string}
 */
export function appManifest(name) {
  return serialize({
    name,
    displayName: name,
    components: [
      {
        appKey: name,
        displayName: name,
      },
    ],
    resources: {
      android: ["dist/res", "dist/main.android.jsbundle"],
      ios: ["dist/assets", "dist/main.ios.jsbundle"],
      macos: ["dist/assets", "dist/main.macos.jsbundle"],
      visionos: ["dist/assets", "dist/main.visionos.jsbundle"],
      windows: ["dist/assets", "dist/main.windows.bundle"],
    },
  });
}

/**
 * Returns `.bundle/config`.
 *
 * @note We don't use a checked in file because of
 * https://github.com/ruby/setup-ruby/discussions/576.
 *
 * @returns {string}
 */
export function bundleConfig() {
  return `BUNDLE_PATH: ".bundle"
BUNDLE_FORCE_RUBY_PLATFORM: 1
`;
}

/**
 * @param {string} packagePath
 * @returns {string[]}
 */
function getDependencies(packagePath, fs = nodefs) {
  const manifest = path.join(packagePath, "package.json");
  if (!fs.existsSync(manifest)) {
    return [];
  }

  const { dependencies, peerDependencies, devDependencies } = readJSONFile(
    manifest,
    fs
  );

  /** @type {Set<string>} */
  const set = new Set();
  for (const section of [dependencies, peerDependencies, devDependencies]) {
    if (section) {
      for (const key of Object.keys(section)) {
        set.add(key);
      }
    }
  }
  return Array.from(set);
}

/**
 * @template {unknown} T
 * @param {string} script
 * @param {string} spec
 * @param {Record<string, unknown>} context
 * @returns {T}
 */
function loadAndRun(spec, script, context) {
  const code = `require(${JSON.stringify(spec)}).${script};`;
  const module = new Module(spec);
  const result = vm.runInNewContext(code, {
    ...context,
    module,
    exports: module.exports,
    require: module.require,
    process,
  });
  return /** @type {T} */ (result);
}

/**
 * @param {Pick<ConfigureParams, "packagePath" | "testAppPath">} params
 * @returns {Record<string, Plugin>}
 */
export function loadPlatformTemplates(
  { packagePath, testAppPath },
  fs = nodefs
) {
  const require = createRequire(import.meta.url);
  const verbose = process.env["VERBOSE"];

  /** @type {Record<string, typeof manifest.defaultPlatformPackages.ios>} */
  const platformPackages = { ...manifest.defaultPlatformPackages };

  // We have to manually load project dependencies to avoid recursive calls
  const opts = { paths: [packagePath] };
  for (const dependency of getDependencies(packagePath)) {
    try {
      const pkg = require.resolve(dependency + "/package.json", opts);
      const { reactNativeTemplateConfig: config } = readJSONFile(pkg, fs);
      if (config && typeof config === "object" && !Array.isArray(config)) {
        const root = path.dirname(pkg);
        if (verbose) {
          const pkgPath = path.relative(packagePath, root);
          console.log("Loading template config:", pkgPath);
        }
        for (const [key, { template, ...rest }] of Object.entries(config)) {
          const resolved = resolvePath(root, template);
          if (resolved && fs.existsSync(resolved)) {
            platformPackages[key] = { ...rest, template: resolved };
          }
        }
      }
    } catch (_) {
      // `./package.json` may not always be defined by `exports`
    }
  }

  /** @type {Record<string, Plugin>} */
  const templates = {};
  for (const [platform, { template }] of Object.entries(platformPackages)) {
    const templatePath = template.startsWith(".")
      ? path.resolve(testAppPath, template)
      : template;
    templates[platform] = {
      configure: (projectRoot, config, fs) => {
        const context = { projectRoot, config, fs };
        const script = "configure(projectRoot, config, fs)";
        return loadAndRun(templatePath, script, context);
      },
      getTemplate: (params, fs) => {
        const context = { params, fs };
        return loadAndRun(templatePath, "getTemplate(params, fs)", context);
      },
    };
  }

  return templates;
}
