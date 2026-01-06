// @ts-check

/** @type {{ name: string; factory: (require: NodeJS.Require) => unknown; }} */
module.exports = {
  name: "plugin-clean",
  factory: (require) => {
    // @ts-expect-error Yarn internal package
    const { BaseCommand } = require("@yarnpkg/cli");

    class CleanCommand extends BaseCommand {
      static paths = [["clean"]];

      async execute() {
        // @ts-expect-error Yarn internal package
        const { Configuration, Project } = require("@yarnpkg/core");
        // @ts-expect-error Yarn internal package
        const { npath } = require("@yarnpkg/fslib");
        const { spawnSync } = require("node:child_process");
        const fs = require("node:fs");

        const configuration = await Configuration.find(
          this.context.cwd,
          this.context.plugins
        );
        const { project } = await Project.find(configuration, this.context.cwd);

        // Remove symlinks first. On Windows, `git clean` resolves/traverses
        // symlinks, causing an infinite loop.
        for (const ws of project.workspaces) {
          const rntaPath = npath.join(
            npath.fromPortablePath(ws.cwd),
            "node_modules",
            "react-native-test-app"
          );
          const stats = fs.lstatSync(rntaPath, { throwIfNoEntry: false });
          if (stats?.isSymbolicLink()) {
            fs.rmSync(rntaPath, { force: true, recursive: true });
          }
        }

        spawnSync("git", ["clean", "-dfqx", "--exclude=.yarn/cache"], {
          cwd: npath.fromPortablePath(project.cwd),
          stdio: "inherit",
        });
      }
    }

    return { commands: [CleanCommand] };
  },
};
