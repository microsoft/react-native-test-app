#!/usr/bin/env -S node
/**
 * Offline release artifact validation for the single-app example.
 *
 * Usage: validate-release-artifacts.ts setup|build|validate android|ios
 *
 * Only setup/build may provision tools or resolve dependencies. Validation uses
 * local artifacts only: no downloads, authentication, uploads, or store
 * services. These structural checks cannot establish native-code policy
 * compliance, store acceptance, privacy-declaration completeness, or
 * production-signing readiness.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { parseArgs } from "node:util";
import { jsonFromPlist } from "../packages/app/ios/utils.mjs";
import { readJSONFile, readTextFile } from "../packages/app/scripts/helpers.js";
import {
  mkdir_p,
  writeJSONFile,
} from "../packages/app/scripts/utils/filesystem.mjs";

type Platform = "android" | "ios";

// Version and asset digest from https://github.com/google/bundletool/releases.
// Update both together; never discover or download a release during validation.
const BUNDLETOOL_VERSION = "1.18.3";
const BUNDLETOOL_SHA256 =
  "a099cfa1543f55593bc2ed16a70a7c67fe54b1747bb7301f37fdfd6d91028e29";
const BUNDLETOOL_JAR = `bundletool-all-${BUNDLETOOL_VERSION}.jar`;

const root = path.resolve(import.meta.dirname, "..");
const project = path.join(root, "packages/app/example");

function run(
  file: string,
  args: string[],
  { cwd = root, capture = false } = {}
): string {
  try {
    return (
      execFileSync(file, args, {
        cwd,
        encoding: "utf-8",
        stdio: ["ignore", capture ? "pipe" : "inherit", "inherit"],
      })?.trim() || ""
    );
  } catch (cause) {
    // ENOENT can mean a missing executable or working directory. Preserve the
    // original error and cwd rather than assuming the tool is missing.
    const message = Error.isError(cause) ? cause.message : String(cause);
    throw new Error(`${file}: ${cwd}: ${message}`, { cause });
  }
}

async function fetchBundletool(workingDir: string): Promise<string> {
  const bundletool = path.join(workingDir, BUNDLETOOL_JAR);
  if (fs.existsSync(bundletool)) {
    return bundletool;
  }

  const url = `https://github.com/google/bundletool/releases/download/${BUNDLETOOL_VERSION}/${BUNDLETOOL_JAR}`;
  console.log(`Downloading bundletool ${BUNDLETOOL_VERSION}: ${url}`);

  const response = await fetch(url);
  assert(response.ok, `bundletool download failed: HTTP ${response.status}`);

  const jar = Buffer.from(await response.arrayBuffer());
  assert.equal(
    createHash("sha256").update(jar).digest("hex"),
    BUNDLETOOL_SHA256,
    "bundletool SHA-256 mismatch"
  );

  fs.writeFileSync(bundletool, jar);
  return bundletool;
}

function glob(cwd: string, pattern = "**/{*,.*}"): string[] {
  const options = { cwd, withFileTypes: true, followSymlinks: true } as const;
  return fs
    .globSync([pattern, `**/.*/${pattern}`], options)
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name));
}

function latestInstalled(directory: string, collator: Intl.Collator): string {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch (cause) {
    throw new Error(`${directory}: cannot read directory: ${cause}`, { cause });
  }

  const versions = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => collator.compare(a, b));
  const version = versions.at(-1);
  assert(version, `No installed tools found in ${directory}`);
  return path.join(directory, version);
}

function androidTools() {
  // Select installed SDK/NDK tools, never sdkmanager or a downloaded toolchain.
  const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  assert(sdk, "Android SDK build-tools and NDK are required");

  const collator = new Intl.Collator("en", { usage: "sort", numeric: true });
  const buildTools = latestInstalled(path.join(sdk, "build-tools"), collator);
  const ndk = latestInstalled(path.join(sdk, "ndk"), collator);

  return {
    buildTools,
    ndk,
    apksigner: path.join(buildTools, "apksigner"),
    zipalign: path.join(buildTools, "zipalign"),
    readelf: path.join(
      ndk,
      `toolchains/llvm/prebuilt/${process.platform}-x86_64/bin/llvm-readelf`
    ),
  };
}

async function setup(platform: Platform, workingDir: string) {
  mkdir_p(workingDir);

  // Set single-app mode before Gradle/Pods generate their native configuration.
  const manifest = path.join(project, "app.json");
  const appConfig = readJSONFile(manifest);
  appConfig.singleApp = "Example";
  writeJSONFile(manifest, appConfig);

  switch (platform) {
    case "android": {
      run("java", ["-version"]);

      const bundletool = await fetchBundletool(workingDir);
      run("java", ["-jar", bundletool, "version"]);

      const { buildTools, ndk, apksigner, readelf } = androidTools();
      console.log(readTextFile(path.join(buildTools, "source.properties")));
      console.log(readTextFile(path.join(ndk, "source.properties")));
      run(apksigner, ["version"]);
      run(readelf, ["--version"]);

      // This key signs only generated CI APKs. It is not a production/upload
      // key. Restrict the disposable credentials to the runner's temporary
      // directory.
      const previousMask = process.umask(0o077);
      try {
        const keyfile = path.join(workingDir, "signing-password");
        const opts = { mode: 0o600 } as const;
        fs.writeFileSync(keyfile, randomBytes(32).toString("hex") + "\n", opts);
        run("keytool", [
          "-genkeypair",
          "-keystore",
          path.join(workingDir, "ci.jks"),
          "-storetype",
          "JKS",
          "-alias",
          "rnta-ci",
          "-keyalg",
          "RSA",
          "-keysize",
          "2048",
          "-validity",
          "1",
          "-dname",
          "CN=Disposable RNTA CI",
          "-storepass:file",
          keyfile,
          "-keypass:file",
          keyfile,
        ]);
      } finally {
        process.umask(previousMask);
      }
      run(process.execPath, [
        "--eval",
        "require('./packages/app/android/gradle-wrapper.js').configureGradleWrapper('packages/app/example/android')",
      ]);
      break;
    }

    case "ios": {
      run("xcodebuild", ["-version"]);
      run("xcrun", ["--sdk", "iphoneos", "--show-sdk-version"]);
      run("xcrun", ["--find", "lipo"]);
      run("xcrun", ["--find", "otool"]);
      run("xcrun", ["clang", "--version"]);
      break;
    }

    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }

  // Bundle before asset discovery, and ship local JS.
  run("yarn", [`build:${platform}`], { cwd: project });
}

function build(platform: Platform, workingDir: string) {
  switch (platform) {
    case "android": {
      // The example's default debug signing for the AAB is CI-only as well.
      return run(
        path.join(project, "android/gradlew"),
        [
          "--no-daemon",
          ":app:bundleRelease",
          "-PreactNativeArchitectures=arm64-v8a",
        ],
        { cwd: path.join(project, "android") }
      );
    }
    case "ios": {
      // A generic device archive exercises release code, not the simulator.
      // Disable signing explicitly; never export or submit this archive.
      return run(
        "xcodebuild",
        [
          "-workspace",
          "ios/Example.xcworkspace",
          "-scheme",
          "ReactTestApp",
          "-configuration",
          "Release",
          "-sdk",
          "iphoneos",
          "-destination",
          "generic/platform=iOS",
          "-archivePath",
          path.join(workingDir, "Example.xcarchive"),
          "-derivedDataPath",
          path.join(workingDir, "DerivedData"),
          "CODE_SIGNING_ALLOWED=NO",
          "CODE_SIGNING_REQUIRED=NO",
          "CODE_SIGN_IDENTITY=",
          "ARCHS=arm64",
          "ONLY_ACTIVE_ARCH=NO",
          "COMPILER_INDEX_STORE_ENABLE=NO",
          "archive",
        ],
        { cwd: project }
      );
    }
  }
}

async function validateAndroid(workingDir: string) {
  const { apksigner, zipalign, readelf } = androidTools();
  const aab = path.join(
    project,
    "android/app/build/outputs/bundle/release/app-release.aab"
  );

  let size: number;
  try {
    size = fs.statSync(aab).size;
  } catch (cause) {
    throw new Error(`${aab}: cannot stat file: ${cause}`, { cause });
  }

  assert(size > 0, `Release app bundle is empty: ${aab}`);

  const bundletool = path.join(workingDir, BUNDLETOOL_JAR);
  assert(
    fs.existsSync(bundletool),
    "bundletool is missing; run setup android before offline validation"
  );

  // Validate bundle structure, then generate the complete split APK.
  // Explicit signing avoids bundletool's implicit debug-keystore fallback.
  const apkSet = path.join(workingDir, "release.apks");
  const keypass = path.join(workingDir, "signing-password");

  run("java", ["-jar", bundletool, "validate", `--bundle=${aab}`]);
  run("java", [
    "-jar",
    bundletool,
    "build-apks",
    `--bundle=${aab}`,
    `--output=${apkSet}`,
    `--ks=${path.join(workingDir, "ci.jks")}`,
    "--ks-key-alias=rnta-ci",
    `--ks-pass=file:${keypass}`,
    `--key-pass=file:${keypass}`,
    "--overwrite",
  ]);

  const apkDir = path.join(workingDir, "apks");
  mkdir_p(apkDir);
  run("unzip", ["-q", "-o", apkSet, "-d", apkDir]);

  const bundleDir = path.join(workingDir, "bundle");
  mkdir_p(bundleDir);
  run("unzip", ["-q", "-o", aab, "*/lib/*/*.so", "-d", bundleDir]);

  const apks = glob(apkDir, "**/{*,.*}.apk");
  assert(apks.length > 0, "bundletool generated no APKs");

  for (const apk of apks) {
    run(apksigner, ["verify", "--verbose", "--print-certs", apk]);
    // Check ZIP entry alignment and 16 KB alignment of uncompressed native code.
    run(zipalign, ["-c", "-P", "16", "-v", "4", apk]);
  }

  // Inspect all packaged 64-bit libraries, including dependencies. A failure
  // identifies an artifact/library, not necessarily RNTA-owned source code.
  const libraries = glob(bundleDir, "**/{*,.*}.so").filter((file) =>
    /\/lib\/(?:arm64-v8a)\/.*\.so$/.test(file)
  );
  assert(libraries.length > 0, "No 64-bit native libraries found");

  const opts = { capture: true };
  for (const lib of libraries) {
    const headers = run(readelf, ["--program-headers", "--wide", lib], opts);
    fs.writeFileSync(path.join(workingDir, "elf-headers"), headers + "\n");
    const segments = headers
      .split("\n")
      .map((line) => line.trim().split(/\s+/))
      .filter(([type]) => type === "LOAD");
    assert(segments.length > 0, `No ELF LOAD segments found: ${lib}`);

    for (const segment of segments) {
      const alignment = segment.at(-1);
      assert(
        Number(alignment) >= 16384,
        `ELF LOAD alignment below 16 KB: ${lib} (${alignment})`
      );
    }
  }

  console.log(
    `Validated ${apks.length} APKs and ${libraries.length} 64-bit native libraries`
  );
}

function validateIOS(workingDir: string) {
  const archive = path.join(workingDir, "Example.xcarchive");
  const applications = path.join(archive, "Products/Applications");
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(applications, { withFileTypes: true });
  } catch (cause) {
    throw new Error(`${archive}: cannot read archive: ${cause}`, { cause });
  }

  const apps = entries.filter(
    (entry) => entry.isDirectory() && entry.name.endsWith(".app")
  );
  assert(apps.length === 1, "Expected exactly one archived application");

  const app = path.join(applications, apps[0].name);
  const info = path.join(app, "Info.plist");
  assert(
    fs.existsSync(path.join(app, "PrivacyInfo.xcprivacy")),
    "Privacy manifest is missing"
  );

  run("plutil", ["-lint", path.join(archive, "Info.plist"), info]);

  // Read the packaged plist once using the existing plutil-backed helper.
  const infoPlist = jsonFromPlist(info);
  const executableName = infoPlist.CFBundleExecutable;
  assert(
    typeof executableName === "string" && executableName.length > 0,
    "Expected a non-empty CFBundleExecutable string"
  );

  const executable = path.join(app, executableName);
  assert(
    fs.existsSync(executable),
    "Packaged application executable is missing"
  );
  assert(
    run("file", ["-b", executable], { capture: true }).includes("Mach-O"),
    "Application executable is not Mach-O"
  );
  assert.deepEqual(
    infoPlist.CFBundleSupportedPlatforms,
    ["iPhoneOS"],
    "Expected iPhoneOS as the packaged application platform"
  );

  // Lint every packaged plist and privacy manifest, including nested
  // frameworks. Syntax validation does not audit required-reason APIs or
  // privacy disclosures.
  for (const plist of glob(app, "**/{*,.*}.{plist,xcprivacy}")) {
    run("plutil", ["-lint", plist]);
  }

  // Inspect actual Mach-O load commands: arm64 alone also matches simulators.
  const capture = { capture: true };
  const binaryCount = glob(app).reduce((count, binary) => {
    if (!run("file", ["-b", binary], capture).includes("Mach-O")) {
      return count;
    }

    const architectures = run("xcrun", ["lipo", "-archs", binary], capture);
    assert(
      architectures === "arm64",
      `Unexpected device architectures in ${binary}: ${architectures}`
    );

    const headers = run("xcrun", ["otool", "-l", binary], capture);
    fs.writeFileSync(path.join(workingDir, "macho-headers"), headers + "\n");

    // Support both modern LC_BUILD_VERSION and legacy iPhoneOS version commands
    let command = "";
    let found = false;
    for (const line of headers.split("\n")) {
      const [key, value] = line.trim().split(/\s+/);
      if (key === "cmd") {
        command = value;
        if (command === "LC_VERSION_MIN_IPHONEOS") {
          found = true;
        }
      }
      if (command === "LC_BUILD_VERSION" && key === "platform") {
        assert(
          value === "2" || value === "IOS",
          `Non-iOS device binary platform: ${binary}`
        );
        found = true;
      }
    }
    assert(found, `Non-iOS device binary platform: ${binary}`);
    return count + 1;
  }, 0);
  assert(binaryCount > 0, "No packaged Mach-O binaries found");
}

async function main() {
  const filename = path.relative(".", import.meta.filename);
  const usage = `usage: ${filename} [setup|build|validate] [android|ios]`;

  const { positionals } = parseArgs({ allowPositionals: true });
  assert(positionals.length === 2, usage);

  const [phase, platform] = positionals;
  assert(platform === "android" || platform === "ios", usage);
  assert(phase === "setup" || phase === "build" || phase === "validate", usage);

  const runnerTemp = process.env.RUNNER_TEMP || os.tmpdir();
  const workingDir = path.join(runnerTemp, `rnta-release-${platform}`);

  switch (phase) {
    case "setup":
      await setup(platform, workingDir);
      break;
    case "build":
      build(platform, workingDir);
      break;
    case "validate": {
      if (platform === "android") {
        await validateAndroid(workingDir);
      } else {
        validateIOS(workingDir);
      }
      const summary = `Build validation passed locally. Note: This is not store acceptance, comprehensive native-code policy compliance, or production-signing readiness. Packaged dependencies are included in structural checks; attribute failures by library before attributing them to RNTA.`;
      console.log(summary);
      if (process.env.GITHUB_STEP_SUMMARY) {
        fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + "\n");
      }
      break;
    }
  }
}

try {
  await main();
} catch (e) {
  console.error(`${Error.isError(e) ? e.message : String(e)}`);
  process.exitCode = 1;
}
