// @ts-check
import * as fs from "node:fs";
import * as path from "node:path";

const files = ["example/.gitignore", "example/windows/.gitignore"];

/**
 * Renames `.dotfile` to `_dotfile`.
 * @param {string} p
 * @returns {string}
 */
function renameDotFile(p) {
  return path.join(path.dirname(p), "_" + path.basename(p).substring(1));
}

/**
 * `npm install` seems to be renaming `.gitignore` files to `.npmignore`.
 * This breaks our templates (see
 * https://github.com/microsoft/react-native-test-app/issues/1228). As a
 * workaround, we'll rename the files ourselves, from `.gitignore` to
 * `_gitignore`, to avoid any further attempts to mutate the package.
 */
const { [2]: script } = process.argv;
switch (script) {
  case "pre": {
    for (const f of files) {
      fs.renameSync(f, renameDotFile(f));
    }
    break;
  }

  case "post": {
    for (const f of files) {
      fs.renameSync(renameDotFile(f), f);
    }
    break;
  }

  default:
    throw new Error(`No such script: ${script}`);
}
