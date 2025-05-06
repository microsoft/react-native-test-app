// @ts-check
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

/** @type {{ name: string; factory: (require: NodeRequire) => unknown; }} */
module.exports = {
  name: "plugin-clean",
  factory: (require) => {
    // @ts-expect-error Yarn internal package
    const { BaseCommand } = require("@yarnpkg/cli");

    class CleanCommand extends BaseCommand {
      static paths = [["clean"]];

      async execute() {
        const projectRoot = path.dirname(path.dirname(__dirname));

        // Remove the symlink first. On Windows, `git clean` resolves/traverses
        // the symlink, causing an infinite loop.
        const symlink = path.join(
          projectRoot,
          "example",
          "node_modules",
          "react-native-test-app"
        );
        fs.rmSync(symlink, { force: true, maxRetries: 3, recursive: true });

        spawnSync("git", ["clean", "-dfqx", "--exclude=.yarn/cache"], {
          cwd: projectRoot,
          stdio: "inherit",
        });
      }
    }

    return { commands: [CleanCommand] };
  },
};
