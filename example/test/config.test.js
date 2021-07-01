// @ts-check

const loadConfig =
  require("@react-native-community/cli/build/tools/config").default;
const fs = require("fs");
const os = require("os");
const path = require("path");

describe("react-native config", () => {
  const exampleRoot = path.sep + path.join("react-native-test-app", "example");
  const reactNativePath = path.join(
    exampleRoot,
    "node_modules",
    "react-native"
  );

  test("contains Android config", () => {
    const sourceDir = path.join(exampleRoot, "android");

    expect(loadConfig()).toMatchObject({
      root: expect.stringContaining(exampleRoot),
      reactNativePath: expect.stringContaining(reactNativePath),
      dependencies: expect.objectContaining({
        "react-native-test-app": expect.objectContaining({
          name: "react-native-test-app",
        }),
      }),
      commands: expect.arrayContaining([
        expect.objectContaining({
          name: "init-test-app",
        }),
      ]),
      assets: [],
      platforms: expect.objectContaining({
        android: expect.anything(),
      }),
      project: expect.objectContaining({
        android: expect.objectContaining({
          sourceDir: expect.stringContaining(sourceDir),
          folder: expect.stringContaining(exampleRoot),
          manifestPath: expect.stringContaining(
            path.join(
              exampleRoot,
              "node_modules",
              "react-native-test-app",
              "android",
              "app",
              "src",
              "main",
              "AndroidManifest.xml"
            )
          ),
          buildGradlePath: expect.stringContaining(
            path.join(sourceDir, "build.gradle")
          ),
          settingsGradlePath: expect.stringContaining(
            path.join(sourceDir, "settings.gradle")
          ),
          packageName: "com.microsoft.reacttestapp",
          packageFolder: path.join("com", "microsoft", "reacttestapp"),
        }),
      }),
    });
  });

  test("contains iOS config", () => {
    if (os.platform() === "win32") {
      return;
    }

    const sourceDir = path.join(exampleRoot, "ios");

    expect(loadConfig()).toMatchObject({
      root: expect.stringContaining(exampleRoot),
      reactNativePath: expect.stringContaining(reactNativePath),
      dependencies: expect.objectContaining({
        "react-native-test-app": expect.objectContaining({
          name: "react-native-test-app",
        }),
      }),
      commands: expect.arrayContaining([
        expect.objectContaining({
          name: "init-test-app",
        }),
      ]),
      assets: [],
      platforms: expect.objectContaining({
        ios: expect.anything(),
      }),
      project: expect.objectContaining({
        ios: expect.objectContaining({
          sourceDir: expect.stringContaining(sourceDir),
          folder: expect.stringContaining(exampleRoot),
          podfile: expect.stringContaining(path.join(sourceDir, "Podfile")),
          podspecPath: expect.stringContaining(
            path.join(exampleRoot, "Example-Tests.podspec")
          ),
        }),
      }),
    });
  });

  test("contains Windows config", () => {
    const projectFile = path.join(
      "node_modules",
      ".generated",
      "windows",
      "ReactTestApp",
      "ReactTestApp.vcxproj"
    );

    if (!fs.existsSync(projectFile)) {
      console.warn(`No such file: ${projectFile}`);
      return;
    }

    expect(loadConfig()).toMatchObject({
      root: expect.stringContaining(exampleRoot),
      reactNativePath: expect.stringContaining(reactNativePath),
      dependencies: expect.objectContaining({
        "react-native-test-app": expect.objectContaining({
          name: "react-native-test-app",
        }),
      }),
      commands: expect.arrayContaining([
        expect.objectContaining({
          name: "init-test-app",
        }),
      ]),
      assets: [],
      platforms: expect.objectContaining({
        windows: expect.objectContaining({
          npmPackageName: "react-native-windows",
        }),
      }),
      project: expect.objectContaining({
        windows: expect.objectContaining({
          folder: expect.stringContaining(exampleRoot),
          sourceDir: expect.stringContaining("windows"),
          solutionFile: expect.stringContaining("Example.sln"),
          project: expect.objectContaining({
            projectFile: expect.stringContaining(projectFile),
          }),
        }),
      }),
    });
  });
});
