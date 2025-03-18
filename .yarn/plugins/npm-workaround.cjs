// @ts-check
/**
 * @typedef {{ values: Map<string, unknown>; }} Configuration
 * @typedef {{ cwd: string; }} Workspace
 * @typedef {{ configuration: Configuration; cwd: string; workspaces: Workspace[]; }} Project
 * @typedef {{ mode?: "skip-build" | "update-lockfile"; }} InstallOptions
 *
 * @type {{ name: string; factory: (require: NodeJS.Require) => unknown; }}
 */
module.exports = {
  name: "plugin-npm-workaround",
  factory: (require) => ({
    hooks: {
      /** @type {(project: Project, options: InstallOptions) => void} */
      afterAllInstalled(project, options) {
        // This mode is typically used by tools like Renovate or Dependabot to
        // keep a lockfile up-to-date without incurring the full install cost.
        if (options.mode === "update-lockfile") {
          return;
        }

        // npm >=10.7.0 throws `ENOWORKSPACES` in monorepos:
        // https://github.com/react-native-community/cli/pull/2457
        if (project.configuration.values.get("nodeLinker") !== "node-modules") {
          return;
        }

        const { npath } = require("@yarnpkg/fslib");
        const fs = require("node:fs");
        const path = require("node:path");

        const filesToPatch = [
          "node_modules/@react-native-community/cli/build/tools/npm.js",
        ];

        for (const ws of project.workspaces) {
          for (const file of filesToPatch) {
            const workspaceDir = npath.fromPortablePath(ws.cwd);
            const jsPath = path.join(workspaceDir, file);
            if (!fs.existsSync(jsPath)) {
              continue;
            }

            const js = fs.readFileSync(jsPath, { encoding: "utf-8" });

            // https://github.com/npm/cli/issues/6099#issuecomment-1961995288
            const patched = js.replaceAll(
              "'npm config get registry'",
              "'npm config get registry --workspaces=false --include-workspace-root'"
            );

            if (patched !== js) {
              fs.writeFileSync(jsPath, patched);
            }
          }
        }
      },
    },
  }),
};
