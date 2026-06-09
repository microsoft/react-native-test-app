// @ts-check
import * as nodefs from "node:fs";
import * as path from "node:path";

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
