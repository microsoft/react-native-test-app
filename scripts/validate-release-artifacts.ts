#!/usr/bin/env -S node

import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

// Submission-free release artifact validation for the single-app example.
// Usage: node scripts/validate-release-artifacts.ts android|ios setup|build|validate
// Only setup/build may provision tools or resolve dependencies. Validation uses
// local artifacts only: no downloads, authentication, uploads, or store services.
// These structural checks cannot establish native-code policy compliance, store
// acceptance, privacy-declaration completeness, or production-signing readiness.

const root = path.resolve(import.meta.dirname, "..");
const project = path.join(root, "packages/app/example");
const [platform, phase] = process.argv.slice(2);
const runnerTemp = process.env.RUNNER_TEMP;
const work = path.join(runnerTemp || "", `rnta-release-${platform}`);

function check(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

// Resolve executables without a shell, including absolute SDK tool paths.
function requireTool(tool: string): string {
  const candidates = path.isAbsolute(tool)
    ? [tool]
    : (process.env.PATH || "")
        .split(path.delimiter)
        .map((p) => path.join(p, tool));
  for (const candidate of candidates) {
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      if (fs.statSync(candidate).isFile()) {
        return candidate;
      }
    } catch {
      // Continue searching PATH; report one clear error if no executable exists.
    }
  }
  throw new Error(`Required tool not found: ${tool}`);
}

// Pass arguments directly, never through shell expansion. Stream build logs;
// capture only small tool outputs needed for validation and check every exit.
function run(
  tool: string,
  args: string[],
  { cwd = root, capture = false } = {}
): string {
  const result = spawnSync(requireTool(tool), args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", capture ? "pipe" : "inherit", "inherit"],
  });
  if (result.error) {
    throw result.error;
  }
  check(
    result.status === 0,
    `${tool} failed (${result.signal || `exit ${result.status}`})`
  );
  return result.stdout?.trim() || "";
}

function files(directory: string): string[] {
  return fs
    .readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name));
}

function latestInstalled(directory: string): string {
  check(
    fs.existsSync(directory),
    `Required SDK directory not found: ${directory}`
  );
  const versions = fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  const version = versions.at(-1);
  check(version, `No installed tools found in ${directory}`);
  return path.join(directory, version);
}

function androidTools() {
  // Select installed SDK/NDK tools, never sdkmanager or a downloaded toolchain.
  const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  check(sdk, "Android SDK build-tools and NDK are required");
  const buildTools = latestInstalled(path.join(sdk, "build-tools"));
  const ndk = latestInstalled(path.join(sdk, "ndk"));
  return {
    buildTools,
    ndk,
    apksigner: requireTool(path.join(buildTools, "apksigner")),
    zipalign: requireTool(path.join(buildTools, "zipalign")),
    readelf: requireTool(
      path.join(ndk, "toolchains/llvm/prebuilt/linux-x86_64/bin/llvm-readelf")
    ),
  };
}

function setup() {
  requireTool("yarn");
  fs.mkdirSync(work, { recursive: true });
  run("jq", ["--version"]);

  // Set single-app mode before Gradle/Pods generate their native configuration.
  const manifest = path.join(project, "app.json");
  fs.writeFileSync(
    manifest,
    run("jq", ['.singleApp = "Example"', manifest], { capture: true }) + "\n"
  );

  if (platform === "android") {
    for (const tool of ["brew", "java", "keytool", "unzip"]) {
      requireTool(tool);
    }
    // Homebrew owns dependency resolution and checksum verification.
    run("brew", ["install", "bundletool"]);
    const { buildTools, ndk, apksigner, readelf } = androidTools();
    run("java", ["-version"]);
    run("brew", ["list", "--versions", "bundletool"]);
    run("bundletool", ["version"]);
    for (const directory of [buildTools, ndk]) {
      console.log(
        fs.readFileSync(path.join(directory, "source.properties"), "utf8")
      );
    }
    run(apksigner, ["version"]);
    run(readelf, ["--version"]);

    // This key signs only generated CI APKs. It is not a production/upload key.
    // Restrict the disposable credentials to the runner's temporary directory.
    const previousMask = process.umask(0o077);
    try {
      const password = path.join(work, "signing-password");
      fs.writeFileSync(password, randomBytes(32).toString("hex") + "\n", {
        mode: 0o600,
      });
      run("keytool", [
        "-genkeypair",
        "-keystore",
        path.join(work, "ci.jks"),
        "-storetype",
        "JKS",
        "-alias",
        "rnta-ci",
        "-keyalg",
        "RSA",
        "-keysize",
        "2048",
        "-validity",
        "2",
        "-dname",
        "CN=Disposable RNTA CI",
        "-storepass:file",
        password,
        "-keypass:file",
        password,
      ]);
    } finally {
      process.umask(previousMask);
    }
    // Reuse the Gradle action's wrapper configurator in its own Node invocation:
    // the helper intentionally ignores unrelated process.argv commands.
    run(process.execPath, [
      "--eval",
      "require('./packages/app/android/gradle-wrapper.js').configureGradleWrapper('packages/app/example/android')",
    ]);
  } else {
    for (const tool of ["xcodebuild", "xcrun", "plutil", "file"]) {
      requireTool(tool);
    }
    // Keep the runner-selected Xcode; report the SDK and tools used by it.
    run("xcodebuild", ["-version"]);
    run("xcrun", ["--sdk", "iphoneos", "--show-sdk-version"]);
    run("xcrun", ["--find", "lipo"]);
    run("xcrun", ["--find", "otool"]);
    run("xcrun", ["clang", "--version"]);
  }

  // Bundle before pod install discovers resource paths, and ship local JS rather
  // than relying on Metro in a Release app.
  run("yarn", [`build:${platform}`], { cwd: project });
}

function build() {
  if (platform === "android") {
    const { ndk } = androidTools();
    // The example's default debug signing for the AAB is CI-only as well.
    run(
      path.join(project, "android/gradlew"),
      [
        "--no-daemon",
        ":app:bundleRelease",
        `-PANDROID_NDK_VERSION=${path.basename(ndk)}`,
        "-PreactNativeArchitectures=arm64-v8a,x86_64",
      ],
      { cwd: path.join(project, "android") }
    );
  } else {
    // A generic device archive exercises Release code, not the simulator.
    // Disable signing explicitly; never export or submit this archive.
    run(
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
        path.join(work, "Example.xcarchive"),
        "-derivedDataPath",
        path.join(work, "DerivedData"),
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

function validateAndroid() {
  requireTool("bundletool");
  requireTool("unzip");
  const { apksigner, zipalign, readelf } = androidTools();
  const aab = path.join(
    project,
    "android/app/build/outputs/bundle/release/app-release.aab"
  );
  check(
    fs.existsSync(aab) && fs.statSync(aab).size > 0,
    `Release AAB not found: ${aab}`
  );

  // Validate bundle structure, then generate the complete split APK set locally.
  // Explicit signing avoids bundletool's implicit debug-keystore fallback.
  const apkSet = path.join(work, "release.apks");
  const apkDirectory = path.join(work, "apks");
  const bundleDirectory = path.join(work, "bundle");
  run("bundletool", ["validate", `--bundle=${aab}`]);
  run("bundletool", [
    "build-apks",
    `--bundle=${aab}`,
    `--output=${apkSet}`,
    `--ks=${path.join(work, "ci.jks")}`,
    "--ks-key-alias=rnta-ci",
    `--ks-pass=file:${path.join(work, "signing-password")}`,
    `--key-pass=file:${path.join(work, "signing-password")}`,
    "--overwrite",
  ]);
  fs.mkdirSync(apkDirectory, { recursive: true });
  fs.mkdirSync(bundleDirectory, { recursive: true });
  run("unzip", ["-q", "-o", apkSet, "-d", apkDirectory]);
  run("unzip", ["-q", "-o", aab, "*/lib/*/*.so", "-d", bundleDirectory]);

  const apks = files(apkDirectory).filter((file) => file.endsWith(".apk"));
  check(apks.length > 0, "bundletool generated no APKs");
  for (const apk of apks) {
    console.log(`Checking APK: ${apk}`);
    run(apksigner, ["verify", "--verbose", "--print-certs", apk]);
    // Check ZIP entry alignment and 16 KB alignment of uncompressed native code.
    run(zipalign, ["-c", "-P", "16", "-v", "4", apk]);
  }

  // Inspect all packaged 64-bit libraries, including dependencies: a failure
  // identifies an artifact/library, not necessarily RNTA-owned source code.
  const libraries = files(bundleDirectory).filter((file) =>
    /\/lib\/(?:arm64-v8a|x86_64)\/.*\.so$/.test(file)
  );
  check(libraries.length > 0, "No 64-bit native libraries found");
  for (const library of libraries) {
    console.log(`Checking 16 KB ELF LOAD alignment: ${library}`);
    const headers = run(readelf, ["--program-headers", "--wide", library], {
      capture: true,
    });
    fs.writeFileSync(path.join(work, "elf-headers"), headers + "\n");
    console.log(headers);
    const segments = headers
      .split("\n")
      .map((line) => line.trim().split(/\s+/))
      .filter(([type]) => type === "LOAD");
    check(segments.length > 0, `No ELF LOAD segments found: ${library}`);
    for (const segment of segments) {
      const alignment = segment.at(-1);
      check(
        Number(alignment) >= 16384,
        `ELF LOAD alignment below 16 KB: ${library} (${alignment})`
      );
    }
  }
  console.log(
    `Validated ${apks.length} APKs and ${libraries.length} 64-bit native libraries.`
  );
}

function validateIOS() {
  for (const tool of ["plutil", "xcrun", "file"]) {
    requireTool(tool);
  }
  const archive = path.join(work, "Example.xcarchive");
  const applications = path.join(archive, "Products/Applications");
  check(fs.existsSync(applications), `Device archive not found: ${archive}`);
  const apps = fs
    .readdirSync(applications, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.endsWith(".app"));
  check(apps.length === 1, "Expected exactly one archived application");
  const app = path.join(applications, apps[0].name);
  const info = path.join(app, "Info.plist");
  check(
    fs.existsSync(path.join(app, "PrivacyInfo.xcprivacy")),
    "RNTA privacy manifest is missing"
  );
  run("plutil", ["-lint", path.join(archive, "Info.plist"), info]);
  const executable = path.join(
    app,
    run("plutil", ["-extract", "CFBundleExecutable", "raw", "-o", "-", info], {
      capture: true,
    })
  );
  check(
    fs.existsSync(executable),
    "Packaged application executable is missing"
  );
  check(
    run("file", ["-b", executable], { capture: true }).includes("Mach-O"),
    "Application executable is not Mach-O"
  );
  const platforms: unknown = JSON.parse(
    run(
      "plutil",
      ["-extract", "CFBundleSupportedPlatforms", "json", "-o", "-", info],
      { capture: true }
    )
  );
  check(
    Array.isArray(platforms) &&
      platforms.length === 1 &&
      platforms[0] === "iPhoneOS",
    "Expected iPhoneOS as the packaged application platform"
  );

  // Lint every packaged plist and privacy manifest, including nested frameworks.
  // Syntax validation does not audit required-reason APIs or privacy disclosures.
  const packagedFiles = files(app);
  const plists = packagedFiles.filter((file) =>
    /\.(?:plist|xcprivacy)$/.test(file)
  );
  for (const plist of plists) {
    run("plutil", ["-lint", plist]);
  }

  // Inspect actual Mach-O load commands: arm64 alone also matches simulators.
  let binaryCount = 0;
  for (const binary of packagedFiles) {
    if (!run("file", ["-b", binary], { capture: true }).includes("Mach-O")) {
      continue;
    }
    console.log(`Checking device binary: ${binary}`);
    const architectures = run("xcrun", ["lipo", "-archs", binary], {
      capture: true,
    });
    check(
      architectures === "arm64",
      `Unexpected device architectures in ${binary}: ${architectures}`
    );
    const headers = run("xcrun", ["otool", "-l", binary], { capture: true });
    fs.writeFileSync(path.join(work, "macho-headers"), headers + "\n");
    // Support both modern LC_BUILD_VERSION and legacy iPhoneOS version commands.
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
        check(
          value === "2" || value === "IOS",
          `Non-iOS device binary platform: ${binary}`
        );
        console.log(line.trim());
        found = true;
      }
    }
    check(found, `Non-iOS device binary platform: ${binary}`);
    binaryCount += 1;
  }
  check(binaryCount > 0, "No packaged Mach-O binaries found");
  console.log(
    `Validated ${plists.length} plists/privacy manifests and ${binaryCount} device binaries.`
  );
}

function main() {
  check(
    platform === "android" || platform === "ios",
    "Expected platform: android or ios"
  );
  check(
    phase === "setup" || phase === "build" || phase === "validate",
    "Expected phase: setup, build, or validate"
  );
  check(runnerTemp, "RUNNER_TEMP must point to a disposable CI directory");
  console.log(`Node.js ${process.version}`);
  switch (phase) {
    case "setup":
      setup();
      break;
    case "build":
      build();
      break;
    case "validate": {
      if (platform === "android") {
        validateAndroid();
      } else {
        validateIOS();
      }
      // Record scope without implying production signing or store acceptance.
      const summary = `Single-app ${platform} Release artifact validation passed locally. This is not store acceptance, comprehensive native-code policy compliance, or production-signing readiness. Packaged dependencies are included in structural checks; attribute failures by library before attributing them to RNTA.`;
      console.log(summary);
      if (process.env.GITHUB_STEP_SUMMARY) {
        fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + "\n");
      }
      break;
    }
  }
}

try {
  main();
} catch (error) {
  console.error(
    `error: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exitCode = 1;
}
