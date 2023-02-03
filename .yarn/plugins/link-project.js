module.exports = {
  name: "plugin-link-project",
  factory: (_require) => ({
    hooks: {
      afterAllInstalled(project, _options) {
        // As of 3.3.0, Yarn avoids creating circular symlinks. We need to
        // manually create a symlink to the main project after install.
        if (project.configuration.values.get("nodeLinker") !== "node-modules") {
          return;
        }

        const fs = require("node:fs");
        const path = require("node:path");

        function normalize(p) {
          return p.startsWith("\\") ? p.substring(1) : p;
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
          fs.symlinkSync(path.relative(nodeModulesPath, projectPath), linkPath);
        }
      },
    },
  }),
};
