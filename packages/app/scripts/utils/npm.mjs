// @ts-check
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as https from "node:https";
import * as os from "node:os";
import * as path from "node:path";
import { mkdir_p } from "./filesystem.mjs";

export const npmRegistryBaseURL = "https://registry.npmjs.org/";

/**
 * Invokes `tar xf`.
 * @param {string} archive
 */
function untar(archive) {
  const args = ["xf", archive];
  const options = { cwd: path.dirname(archive) };
  const result = spawnSync("tar", args, options);

  // If we run `tar` from Git Bash with a Windows path, it will fail with:
  //
  //     tar: Cannot connect to C: resolve failed
  //
  // GNU Tar assumes archives with a colon in the file name are on another
  // machine. See also
  // https://www.gnu.org/software/tar/manual/html_section/file.html.
  if (
    process.platform === "win32" &&
    result.stderr.toString().includes("tar: Cannot connect to")
  ) {
    args.push("--force-local");
    return spawnSync("tar", args, options);
  }

  return result;
}

/**
 * Fetches package metadata from the npm registry.
 * @param {string} pkg
 * @param {string=} distTag
 */
export function fetchPackageMetadata(pkg, distTag) {
  const init = {
    headers: {
      Accept:
        "application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*",
    },
  };
  const url = distTag
    ? npmRegistryBaseURL + pkg + "/" + distTag
    : npmRegistryBaseURL + pkg;
  return fetch(url, init).then((res) => res.json());
}

/**
 * Fetches the tarball URL for the specified package and version.
 * @param {string} pkg
 * @param {string} version
 * @returns {Promise<string>}
 */
async function fetchPackageTarballURL(pkg, version) {
  const info = await fetchPackageMetadata(pkg);
  const specific = info.versions[version];
  if (specific) {
    return specific.dist.tarball;
  }

  const versions = Object.keys(info.versions);
  for (let i = versions.length - 1; i >= 0; --i) {
    const v = versions[i];
    if (v.startsWith(version)) {
      return info.versions[v].dist.tarball;
    }
  }

  throw new Error(`No match found for '${pkg}@${version}'`);
}

/**
 * Downloads the specified npm package.
 * @param {string} pkg
 * @param {string} version
 * @param {boolean} useCache
 * @returns {Promise<string>}
 */
export async function downloadPackage(pkg, version, useCache = false) {
  const url = await fetchPackageTarballURL(pkg, version);

  const tmpDir = path.join(os.tmpdir(), `react-native-test-app-${version}`);
  const dest = path.join(tmpDir, path.basename(url));
  const unpackedDir = path.join(tmpDir, "package");

  if (useCache && fs.existsSync(dest) && fs.existsSync(unpackedDir)) {
    return Promise.resolve(unpackedDir);
  }

  console.log(`Downloading ${path.basename(url)}...`);

  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        mkdir_p(tmpDir);

        const fh = fs.createWriteStream(dest);
        res.pipe(fh);
        fh.on("finish", () => {
          fh.close();
          untar(dest);
          resolve(unpackedDir);
        });
      })
      .on("error", (err) => reject(err));
  });
}
