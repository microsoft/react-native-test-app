// @ts-check
import { equal, fail } from "node:assert/strict";
import * as nodefs from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { generateAndroidManifest as generateAndroidManifestActual } from "../../android/android-manifest.js";

describe("generateAndroidManifest()", () => {
  const defaultAndroidManifestXML = `<manifest>
  <uses-feature android:name="android.hardware.camera.any" android:required="false"></uses-feature>
  <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"></uses-permission>
  <uses-permission android:name="android.permission.CAMERA" android:maxSdkVersion="\${rntaEnableCamera}"></uses-permission>
  <uses-permission android:name="android.permission.INTERNET"></uses-permission>
  <application></application>
</manifest>
`;

  const manifestSource = fileURLToPath(
    new URL("../../android/app/src/main/AndroidManifest.xml", import.meta.url)
  );
  const manifestOutputPath = path.join(
    "app",
    "build",
    "generated",
    "rnta",
    "src",
    "main",
    "AndroidManifest.xml"
  );

  /** @type {(mockfs: typeof nodefs) => number} */
  const generateAndroidManifest = (mockfs) =>
    generateAndroidManifestActual("app.json", manifestOutputPath, mockfs);

  const isManifestFile = (/** @type {nodefs.PathLike} */ p) =>
    p === "app.json" || p === manifestOutputPath;

  it("returns default manifest when there are no Android specific config", () => {
    /** @type {string | ArrayBufferView} */
    let written = "";

    /** @type {typeof nodefs} */
    const mockfs = {
      ...nodefs,
      existsSync: (p) => p === "app.json",
      // @ts-expect-error Type 'string' is not assignable to type 'Buffer'
      readFileSync: (p) => {
        if (p === "app.json") {
          return JSON.stringify({});
        } else if (p === manifestSource) {
          return defaultAndroidManifestXML;
        }

        fail(`Unexpected file read: ${p}`);
      },
      statSync: (p) => {
        fail(`Unexpected file stat: ${p}`);
      },
      writeFileSync: (p, data) => {
        equal(p, manifestOutputPath);
        written = data;
      },
    };

    equal(generateAndroidManifest(mockfs), 0);
    equal(written, defaultAndroidManifestXML);
  });

  it("generates the manifest if the app manifest is more recent", () => {
    /** @type {string | ArrayBufferView} */
    let written = "";

    /** @type {typeof nodefs} */
    const mockfs = {
      ...nodefs,
      existsSync: isManifestFile,
      // @ts-expect-error Type 'string' is not assignable to type 'Buffer'
      readFileSync: (p) => {
        if (p === "app.json") {
          return JSON.stringify({ android: {} });
        } else if (p === manifestSource) {
          return defaultAndroidManifestXML;
        }

        fail(`Unexpected file read: ${p}`);
      },
      // @ts-expect-error Type is missing the following properties...
      statSync: (p) => {
        if (p === "app.json") {
          return { mtimeMs: 1717763578 };
        } else if (p === manifestOutputPath) {
          return { mtimeMs: 1717763577 };
        }

        fail(`Unexpected file stat: ${p}`);
      },
      writeFileSync: (p, data) => {
        equal(p, manifestOutputPath);
        written = data;
      },
    };

    equal(generateAndroidManifest(mockfs), 0);
    equal(written, defaultAndroidManifestXML);
  });

  it("skips generating if the generated file is more recent", () => {
    /** @type {typeof nodefs} */
    const mockfs = {
      ...nodefs,
      existsSync: isManifestFile,
      // @ts-expect-error Type 'string' is not assignable to type 'Buffer'
      readFileSync: (p) => {
        if (p === "app.json") {
          return JSON.stringify({ android: {} });
        } else if (p === manifestSource) {
          return defaultAndroidManifestXML;
        }

        fail(`Unexpected file read: ${p}`);
      },
      // @ts-expect-error Type is missing the following properties...
      statSync: (p) => {
        if (isManifestFile(p)) {
          return { mtimeMs: 1717763578 };
        }

        fail(`Unexpected file stat: ${p}`);
      },
      writeFileSync: (p) => {
        fail(`Unexpected file write: ${p}`);
      },
    };

    equal(generateAndroidManifest(mockfs), 0);
  });

  it("overwrites features if declared", () => {
    /** @type {string | ArrayBufferView} */
    let written = "";

    /** @type {typeof nodefs} */
    const mockfs = {
      ...nodefs,
      existsSync: isManifestFile,
      // @ts-expect-error Type 'string' is not assignable to type 'Buffer'
      readFileSync: (p) => {
        if (p === "app.json") {
          return JSON.stringify({
            android: {
              features: [
                {
                  "android:name": "android.hardware.bluetooth",
                },
                {
                  "android:name": "android.hardware.camera",
                  "android:required": "false",
                },
                {
                  "android:glEsVersion": "0x00030002",
                  "android:required": "true",
                },
                {
                  // This feature is invalid and should be ignored
                  "android:required": "true",
                },
              ],
            },
          });
        } else if (p === manifestSource) {
          return defaultAndroidManifestXML;
        }

        fail(`Unexpected file read: ${p}`);
      },
      // @ts-expect-error Type is missing the following properties...
      statSync: (p) => {
        if (p === "app.json") {
          return { mtimeMs: 1717763578 };
        } else if (p === manifestOutputPath) {
          return { mtimeMs: 1717763577 };
        }

        fail(`Unexpected file stat: ${p}`);
      },
      writeFileSync: (p, data) => {
        equal(p, manifestOutputPath);
        written = data;
      },
    };

    equal(generateAndroidManifest(mockfs), 0);
    equal(
      written,
      `<manifest>
  <uses-feature android:name="android.hardware.bluetooth"></uses-feature>
  <uses-feature android:name="android.hardware.camera" android:required="false"></uses-feature>
  <uses-feature android:glEsVersion="0x00030002" android:required="true"></uses-feature>
  <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"></uses-permission>
  <uses-permission android:name="android.permission.CAMERA" android:maxSdkVersion="\${rntaEnableCamera}"></uses-permission>
  <uses-permission android:name="android.permission.INTERNET"></uses-permission>
  <application></application>
</manifest>
`
    );
  });

  it("overwrites permissions if declared", () => {
    /** @type {string | ArrayBufferView} */
    let written = "";

    /** @type {typeof nodefs} */
    const mockfs = {
      ...nodefs,
      existsSync: isManifestFile,
      // @ts-expect-error Type 'string' is not assignable to type 'Buffer'
      readFileSync: (p) => {
        if (p === "app.json") {
          return JSON.stringify({
            android: {
              permissions: [
                {
                  "android:name": "android.permission.CAMERA",
                },
                {
                  "android:name": "android.permission.WRITE_EXTERNAL_STORAGE",
                  "android:maxSdkVersion": "18",
                },
                {
                  // This permission is invalid and should be ignored
                  "android:maxSdkVersion": "18",
                },
              ],
            },
          });
        } else if (p.toString().endsWith("AndroidManifest.xml")) {
          return defaultAndroidManifestXML;
        }

        fail(`Unexpected file read: ${p}`);
      },
      // @ts-expect-error Type is missing the following properties...
      statSync: (p) => {
        if (p === "app.json") {
          return { mtimeMs: 1717763578 };
        } else if (p === manifestOutputPath) {
          return { mtimeMs: 1717763577 };
        }

        fail(`Unexpected file stat: ${p}`);
      },
      writeFileSync: (p, data) => {
        equal(p, manifestOutputPath);
        written = data;
      },
    };

    equal(generateAndroidManifest(mockfs), 0);
    equal(
      written,
      `<manifest>
  <uses-feature android:name="android.hardware.camera.any" android:required="false"></uses-feature>
  <uses-permission android:name="android.permission.CAMERA"></uses-permission>
  <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="18"></uses-permission>
  <application></application>
</manifest>
`
    );
  });
});
