import { doesNotThrow, equal, fail, throws } from "node:assert/strict";
import * as nodefs from "node:fs";
import { afterEach, describe, it } from "node:test";
import { configureGradleWrapper } from "../../android/gradle-wrapper.js";

describe("configureGradleWrapper()", () => {
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

  it("bumps Gradle if the version is too old/recent", () => {
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
      ["8.8", "0.76.0", "gradle-8.9-bin.zip"],
      ["8.9", "0.75.0", "gradle-8.8-bin.zip"],
      ["8.7", "0.75.0", "gradle-8.8-bin.zip"],
      ["8.9", "0.74.0", "gradle-8.8-bin.zip"],
      ["8.5", "0.74.0", "gradle-8.6-bin.zip"],
      ["8.9", "0.73.0", "gradle-8.8-bin.zip"],
      ["8.2.1", "0.73.0", "gradle-8.3-bin.zip"],
      ["8.3", "0.72.0", "gradle-8.2.1-bin.zip"],
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
      ["8.9", "0.76.0"],
      ["8.8", "0.75.0"],
      ["8.8", "0.74.0"],
      ["8.8", "0.73.0"],
      ["8.2", "0.72.0"],
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
