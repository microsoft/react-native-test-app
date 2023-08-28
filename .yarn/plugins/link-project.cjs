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
  name: "plugin-link-project",
  factory: (_require) => ({
    hooks: {
      /** @type {(project: Project, options: InstallOptions) => void} */
      afterAllInstalled(project, options) {
        // This mode is typically used by tools like Renovate or Dependabot to
        // keep a lockfile up-to-date without incurring the full install cost.
        if (options.mode === "update-lockfile") {
          return;
        }

        // As of 3.3.0, Yarn avoids creating circular symlinks. We need to
        // manually create a symlink to the main project after install.
        if (project.configuration.values.get("nodeLinker") !== "node-modules") {
          return;
        }

        const fs = require("node:fs");
        const os = require("node:os");
        const path = require("node:path");

        /**
         * @param {string} p
         * @returns {string}
         */
        function normalize(p) {
          // On Windows, paths are prefixed with `/`
          return p.replace(/^[/\\]([^/\\]+:[/\\])/, "$1");
        }

        const noop = () => null;
        const rmOptions = { force: true, maxRetries: 3, recursive: true };

        const projectRoot = normalize(project.cwd);
        const manifestPath = path.join(projectRoot, "package.json");

        fs.readFile(manifestPath, { encoding: "utf-8" }, (_err, manifest) => {
          const { name } = JSON.parse(manifest);

          for (const ws of project.workspaces) {
            if (ws.cwd === project.cwd) {
              continue;
            }

            const nodeModulesDir = path.join(normalize(ws.cwd), "node_modules");
            const linkPath = path.join(nodeModulesDir, name);

            fs.readlink(linkPath, (err, linkString) => {
              if (
                !linkString ||
                path.resolve(nodeModulesDir, linkString) !== projectRoot
              ) {
                if (err?.code !== "ENOENT") {
                  fs.rmSync(linkPath, rmOptions);
                }
                if (os.platform() === "win32") {
                  fs.symlink(projectRoot, linkPath, "junction", noop);
                } else {
                  const target = path.relative(nodeModulesDir, projectRoot);
                  fs.symlink(target, linkPath, noop);
                }
              }
            });
          }
        });
      },
    },
  }),
};
