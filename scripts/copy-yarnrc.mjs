// @ts-check
import yaml from "js-yaml";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Copies specified `.yarnrc.yaml`.
 * @param {string} src
 * @param {string} dst
 */
function main(src, dst) {
  [src, dst].forEach((str) => {
    if (!str || typeof str !== "string") {
      throw new Error(`Invalid argument: ${str}`);
    }
  });

  const yml = fs.readFileSync(src, { encoding: "utf-8" });
  const rc = /** @type {Record<string, string | undefined>} */ (yaml.load(yml));

  rc["nmHoistingLimits"] = undefined;
  rc["plugins"] = undefined;

  if (rc.yarnPath) {
    rc["yarnPath"] = path.join(path.dirname(src), rc.yarnPath);
  }

  fs.writeFileSync(dst, yaml.dump(rc));
}

const { [2]: source, [3]: destination = ".yarnrc.yml" } = process.argv;
main(source, destination);
