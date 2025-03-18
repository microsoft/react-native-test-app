// @ts-check
/**
 * @typedef {{ values: Map<string, unknown>; }} Configuration
 * @typedef {{ cwd: string; }} Workspace
 * @typedef {{ configuration: Configuration; cwd: string; workspaces: Workspace[]; }} Project
 * @typedef {{ mode?: "skip-build" | "update-lockfile"; }} InstallOptions
 */

/**
 * Yarn always sorts `package.json` during install. This is problematic because
 * we need the `bin` field to be in a specific order to workaround an issue with
 * `bunx` always picking the first binary.
 *
 * For more context, see:
 *
 *   - https://github.com/microsoft/react-native-test-app/issues/2417
 *   - https://github.com/yarnpkg/berry/issues/6184
 *
 * @type {{ name: string; factory: (require: NodeJS.Require) => unknown; }}
 */
module.exports = {
  name: "plugin-undo-bin-sorting",
  factory: (require) => {
    const { npath } = require("@yarnpkg/fslib");
    const fs = require("node:fs");
    const path = require("node:path");

    const asText = /** @type {const} */ ({ encoding: "utf-8" });

    let manifestPath = "";
    let orig_rawManifest = "";
    return {
      hooks: {
        /** @type {(project: Project) => void} */
        validateProject(project) {
          const projectRoot = npath.fromPortablePath(project.cwd);
          manifestPath = path.join(projectRoot, "package.json");
          orig_rawManifest = fs.readFileSync(manifestPath, asText);
        },
        /** @type {(project: Project, options: InstallOptions) => void} */
        afterAllInstalled() {
          const rawManifest = fs.readFileSync(manifestPath, asText);
          if (rawManifest === orig_rawManifest) {
            return;
          }

          const manifest = JSON.parse(rawManifest);
          const bin = Object.keys(manifest.bin);

          const orig_manifest = JSON.parse(orig_rawManifest);
          const orig_bin = Object.keys(orig_manifest.bin);

          const length = bin.length;
          if (length !== orig_bin.length) {
            throw new Error("Did Yarn add something to the 'bin' field?");
          }

          for (let i = 0; i < length; ++i) {
            if (bin[i] !== orig_bin[i]) {
              manifest.bin = orig_manifest.bin;
              const fd = fs.openSync(manifestPath, "w", 0o644);
              fs.writeSync(fd, JSON.stringify(manifest, undefined, 2));
              fs.writeSync(fd, "\n");
              fs.closeSync(fd);
              break;
            }
          }
        },
      },
    };
  },
};
