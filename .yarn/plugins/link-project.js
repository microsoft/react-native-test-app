module.exports = {
  name: "plugin-link-project",
  factory: (_require) => ({
    hooks: {
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

        function normalize(p) {
          // On Windows, paths are prefixed with `/`
          return p.replace(/^[/\\]([^/\\]+:[/\\])/, "$1");
        }

        const projectPath = normalize(project.cwd);
        const manifestPath = path.join(projectPath, "package.json");
        const manifest = fs.readFileSync(manifestPath, { encoding: "utf-8" });
        const { name } = JSON.parse(manifest);

        for (const ws of project.workspaces) {
          if (ws.cwd === project.cwd) {
            continue;
          }

          const nodeModulesPath = path.join(normalize(ws.cwd), "node_modules");
          const linkPath = path.join(nodeModulesPath, name);

          fs.rmSync(linkPath, { force: true, maxRetries: 3, recursive: true });
          if (os.platform() === "win32") {
            fs.symlinkSync(projectPath, linkPath, "junction");
          } else {
            const target = path.relative(nodeModulesPath, projectPath);
            fs.symlinkSync(target, linkPath);
          }
        }
      },
    },
  }),
};
