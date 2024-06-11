// @ts-check
import {
  deepEqual,
  doesNotThrow,
  equal,
  fail,
  throws,
} from "node:assert/strict";
import * as nodefs from "node:fs";
import * as path from "node:path";
import { afterEach, describe, it } from "node:test";
import {
  configureProjects,
  internalForTestingPurposesOnly,
} from "../scripts/configure-projects.js";

describe("configureProjects()", () => {
  const manifestPath = path.join(
    "app",
    "build",
    "generated",
    "rnta",
    "src",
    "main",
    "AndroidManifest.xml"
  );

  it("returns empty config", () => {
    deepEqual(configureProjects({}), {});
  });

  it("returns Android config", () => {
    const sourceDir = "android";

    deepEqual(configureProjects({ android: { sourceDir } }), {
      android: {
        sourceDir,
        manifestPath,
        packageName: undefined,
      },
    });
  });

  it("returns Android config with package name", () => {
    const sourceDir = "android";
    const packageName = "com.testapp";
    const project = configureProjects({ android: { sourceDir, packageName } });

    deepEqual(project, { android: { sourceDir, manifestPath, packageName } });
  });

  it("returns iOS config", () => {
    const sourceDir = "ios";
    const config = { ios: { sourceDir } };

    deepEqual(configureProjects(config), config);
  });

  it("returns Windows config", () => {
    const sourceDir = "windows";
    const solutionFile = "windows/Example.sln";
    const vcxproj = "..\\node_modules\\.generated\\windows\\ReactApp.vcxproj";
    const project = configureProjects(
      { windows: { sourceDir, solutionFile } },
      {
        ...nodefs,
        existsSync: (p) => {
          return (
            p === solutionFile ||
            p.toString().endsWith("react-native.config.js")
          );
        },
        // @ts-expect-error Type 'string' is not assignable to type 'Buffer'
        readFileSync: (p, options) => {
          return p === solutionFile ? vcxproj : nodefs.readFileSync(p, options);
        },
      }
    );

    deepEqual(project, {
      windows: {
        sourceDir,
        solutionFile: path.relative(sourceDir, solutionFile),
        project: {
          projectFile: vcxproj,
        },
      },
    });
  });
});

describe("configureGradleWrapper()", () => {
  const { configureGradleWrapper } = internalForTestingPurposesOnly;
  const args = process.argv;

  afterEach(() => {
    process.argv = args.slice();
    delete process.env["RNTA_CONFIGURE_GRADLE_WRAPPER"];
  });

  it("only runs when targeting Android (unless disabled)", () => {
    /** @type {typeof nodefs} */
    const returnEarly = {
      ...nodefs,
      existsSync: () => {
        fail("Expected to return early");
      },
      readFileSync: () => {
        fail("Expected to return early");
      },
      writeFileSync: () => {
        fail("Expected to return early");
      },
    };

    doesNotThrow(() => configureGradleWrapper("android", returnEarly));

    process.argv.push("run-android");

    throws(() => configureGradleWrapper("android", returnEarly));

    process.argv[process.argv.length - 1] = "build-android";

    throws(() => configureGradleWrapper("android", returnEarly));

    process.env["RNTA_CONFIGURE_GRADLE_WRAPPER"] = "0";

    doesNotThrow(() => configureGradleWrapper("android", returnEarly));
  });

  it("returns early if Gradle wrapper cannot be found", () => {
    /** @type {typeof nodefs} */
    const mockfs = {
      ...nodefs,
      existsSync: () => false,
      readFileSync: () => {
        fail("Expected to return early");
      },
      writeFileSync: () => {
        fail("Expected to return early");
      },
    };

    process.argv.push("run-android");

    doesNotThrow(() => configureGradleWrapper("android", mockfs));
  });

  it("returns early if Gradle wrapper cannot be read", () => {
    /** @type {typeof nodefs} */
    const mockfs = {
      ...nodefs,
      existsSync: () => true,
      readFileSync: () => {
        fail("Expected to return early");
      },
      writeFileSync: () => {
        /* noop */
      },
    };

    process.argv.push("run-android");

    doesNotThrow(() => configureGradleWrapper("android", mockfs));
  });

  it("returns early if Gradle wrapper cannot be determined", () => {
    let written = "";
    /** @type {typeof nodefs} */
    const mockfs = {
      ...nodefs,
      existsSync: () => true,
      // @ts-expect-error Type 'string' is not assignable to type 'Buffer'
      readFileSync: (p) => {
        if (p.toString().endsWith("gradle-wrapper.properties")) {
          return "";
        }

        fail(`Unexpected file read: ${p}`);
      },
      writeFileSync: (_, data) => {
        // @ts-expect-error Type 'Uint8Array' is not assignable to type 'string'
        written = data;
      },
    };

    process.argv.push("run-android");

    doesNotThrow(() => configureGradleWrapper("android", mockfs));
    equal(written, "");
  });

  it("writes if Gradle version is too old", () => {
    let written = "";
    /** @type {(gradleVersion: string, rnVersion: string) => typeof nodefs} */
    const mockfs = (gradleVersion, rnVersion) => ({
      ...nodefs,
      existsSync: () => true,
      // @ts-expect-error Type 'string' is not assignable to type 'Buffer'
      readFileSync: (p) => {
        if (p.toString().endsWith("gradle-wrapper.properties")) {
          return `gradle-${gradleVersion}-bin.zip`;
        } else if (p.toString().endsWith("package.json")) {
          return JSON.stringify({ name: "react-native", version: rnVersion });
        }

        fail(`Unexpected file read: ${p}`);
      },
      writeFileSync: (_, data) => {
        // @ts-expect-error Type 'Uint8Array' is not assignable to type 'string'
        written = data;
      },
    });

    process.argv.push("run-android");

    const cases = [
      ["8.5", "0.74.0", "gradle-8.6-bin.zip"],
      ["8.2.1", "0.73.0", "gradle-8.3-bin.zip"],
      ["8.1", "0.72.0", "gradle-8.1.1-bin.zip"],
      ["8.0", "0.71.0", "gradle-7.6.4-bin.zip"],
      ["7.5", "0.71.0", "gradle-7.6.4-bin.zip"],
    ];
    for (const [gradleVersion, rnVersion, expected] of cases) {
      written = "";
      const fs = mockfs(gradleVersion, rnVersion);
      doesNotThrow(() => configureGradleWrapper("android", fs));
      equal(written, expected);
    }
  });

  it("skips writing if Gradle version is recent enough", () => {
    let written = "";
    /** @type {(gradleVersion: string, rnVersion: string) => typeof nodefs} */
    const mockfs = (gradleVersion, rnVersion) => ({
      ...nodefs,
      existsSync: () => true,
      // @ts-expect-error Type 'string' is not assignable to type 'Buffer'
      readFileSync: (p) => {
        if (p.toString().endsWith("gradle-wrapper.properties")) {
          return `gradle-${gradleVersion}-bin.zip`;
        } else if (p.toString().endsWith("package.json")) {
          return JSON.stringify({ name: "react-native", version: rnVersion });
        }

        fail(`Unexpected file read: ${p}`);
      },
      writeFileSync: (_, data) => {
        // @ts-expect-error Type 'Uint8Array' is not assignable to type 'string'
        written = data;
      },
    });

    process.argv.push("run-android");

    const cases = [
      ["8.7", "0.74.0"],
      ["8.7", "0.73.0"],
      ["8.7", "0.72.0"],
      ["8.6", "0.74.0"],
      ["8.3", "0.73.0"],
      ["8.1.1", "0.72.0"],
      ["7.6.4", "0.71.0"],
      ["7.5.1", "0.71.0"],
    ];
    for (const [gradleVersion, rnVersion] of cases) {
      const fs = mockfs(gradleVersion, rnVersion);
      doesNotThrow(() => configureGradleWrapper("android", fs));
      equal(written, "");
    }
  });
});

describe("getAndroidPackageName()", () => {
  const { getAndroidPackageName } = internalForTestingPurposesOnly;

  const appManifest = "app.json";
  const packageId = "com.testapp";

  /**
   * @param {string} cliPlatformAndroidVersion
   * @returns {typeof nodefs}
   */
  function mockfs(cliPlatformAndroidVersion) {
    const cliPlatformAndroidPackageManifest =
      /@react-native-community[/\\]cli-platform-android[/\\]package.json$/;
    return {
      ...nodefs,
      existsSync: (p) => p === appManifest,
      // @ts-expect-error Type 'string' is not assignable to type 'Buffer'
      readFileSync: (p) => {
        if (p === appManifest) {
          return JSON.stringify({ android: { package: packageId } });
        } else if (
          typeof p === "string" &&
          cliPlatformAndroidPackageManifest.test(p)
        ) {
          return JSON.stringify({
            name: "@react-native-community/cli-platform-android",
            version: cliPlatformAndroidVersion,
          });
        }

        fail(`Unexpected file read: ${p}`);
      },
    };
  }

  it("returns early if specified path is falsy", () => {
    equal(getAndroidPackageName(""), undefined);
    equal(getAndroidPackageName(undefined), undefined);
  });

  it("returns early if `@react-native-community/cli-platform-android` <12.3.7", () => {
    equal(getAndroidPackageName(appManifest, mockfs("11.4.1")), undefined);
    equal(getAndroidPackageName(appManifest, mockfs("12.3.6")), undefined);
  });

  it("returns package name if `@react-native-community/cli-platform-android` >=12.3.7 <13.0.0", () => {
    equal(getAndroidPackageName(appManifest, mockfs("12.3.7")), packageId);
    equal(getAndroidPackageName(appManifest, mockfs("12.999.999")), packageId);
  });

  it("returns early if `@react-native-community/cli-platform-android` <13.6.9", () => {
    equal(getAndroidPackageName(appManifest, mockfs("13.0.0")), undefined);
    equal(getAndroidPackageName(appManifest, mockfs("13.6.8")), undefined);
  });

  it("returns package name `@react-native-community/cli-platform-android` >=13.6.9", () => {
    equal(getAndroidPackageName(appManifest, mockfs("13.6.9")), packageId);
    equal(getAndroidPackageName(appManifest, mockfs("14.0.0")), packageId);
  });
});
