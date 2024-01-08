// @ts-check
/**
 * @typedef {{ values: Map<string, unknown>; }} Configuration
 * @typedef {{ cwd: string; }} Workspace
 * @typedef {{ configuration: Configuration; cwd: string; workspaces: Workspace[]; }} Project
 * @typedef {{ mode?: "skip-build" | "update-lockfile"; }} InstallOptions
 *
 * @type {{ name: string; factory: (require: NodeRequire) => unknown; }}
 */
module.exports = {
  name: "plugin-boost-workaround",
  factory: (_require) => ({
    hooks: {
      /** @type {(project: Project, options: InstallOptions) => void} */
      afterAllInstalled(project, options) {
        // This mode is typically used by tools like Renovate or Dependabot to
        // keep a lockfile up-to-date without incurring the full install cost.
        if (options.mode === "update-lockfile") {
          return;
        }

        // Download Boost directly from boost.io instead of JFrog.
        // See https://github.com/facebook/react-native/issues/42180
        if (project.configuration.values.get("nodeLinker") !== "node-modules") {
          return;
        }

        const fs = require("node:fs");
        const path = require("node:path");

        const boostPodspecs = [
          "node_modules/react-native/third-party-podspecs/boost.podspec",
          "node_modules/react-native-macos/third-party-podspecs/boost.podspec",
        ];

        /**
         * @param {string} p
         * @returns {string}
         */
        function normalize(p) {
          // On Windows, paths are prefixed with `/`
          return p.replace(/^[/\\]([^/\\]+:[/\\])/, "$1");
        }

        for (const ws of project.workspaces) {
          for (const boostPodspec of boostPodspecs) {
            const podspecPath = path.join(normalize(ws.cwd), boostPodspec);
            if (!fs.existsSync(podspecPath)) {
              continue;
            }

            const podspec = fs.readFileSync(podspecPath, { encoding: "utf-8" });
            const patched = podspec.replace(
              "https://boostorg.jfrog.io/artifactory/main/release",
              "https://archives.boost.io/release"
            );
            if (patched !== podspec) {
              fs.writeFileSync(boostPodspec, patched);
            }
          }
        }
      },
    },
  }),
};
