// @ts-check
"use strict";

describe("validate-manifest", () => {
  const fs = require("./fs.mock");
  const {
    findFile: findFileActual,
    validateManifest: validateManifestActual,
  } = require("../scripts/validate-manifest");

  /** @type {typeof findFileActual} */
  const findFile = (file, startDir = undefined) =>
    findFileActual(file, startDir, fs);

  /** @type {typeof validateManifestActual} */
  const validateManifest = (p) => validateManifestActual(p, fs);

  const consoleSpy = jest.spyOn(global.console, "error");

  jest.spyOn(global.process, "exit").mockImplementation((code) => {
    throw new Error(code?.toString() ?? "0");
  });

  afterEach(() => {
    fs.__setMockFiles();
    consoleSpy.mockReset();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("finds app manifest", () => {
    fs.__setMockFiles({
      "example/app.json": `{ "name": "Example" }`,
      "example/node_modules/react-native-test-app/package.json": `{ "name": "Example" }`,
    });

    expect(findFile("app.json")).toBeUndefined();
    expect(findFile("app.json", "example")).toBeDefined();
    expect(
      findFile("app.json", "example/node_modules/react-native-test-app")
    ).toBeDefined();
  });

  test("handles missing app manifest", () => {
    expect(validateManifest(undefined)).toBe(1);
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      `Failed to find 'app.json'. Please make sure you're in the right directory.`
    );
  });

  test("catches missing root properties", () => {
    fs.__setMockFiles({
      "app.json": `{ "name": "Example" }`,
    });
    expect(validateManifest(findFile("app.json"))).toBe(1001);
    expect(consoleSpy).toHaveBeenCalledTimes(2);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "app.json: error: app.json is not a valid app manifest"
      )
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "app.json: error: <root> must have required property 'displayName'"
      )
    );
  });

  test("catches missing component properties", () => {
    fs.__setMockFiles({
      "app.json": `{
        "name": "Example",
        "displayName": "Example",
        "components": [
          {
            "displayName": "App"
          },
          {
            "appKey": "Example",
            "displayName": "App (modal)",
            "presentationStyle": "modal"
          }
        ]
      }`,
    });
    expect(validateManifest(findFile("app.json"))).toBe(1001);
    expect(consoleSpy).toHaveBeenCalledTimes(2);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "app.json: error: app.json is not a valid app manifest"
      )
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "app.json: error: /components/0 must have required property 'appKey'"
      )
    );
  });

  test("catches invalid values for `presentationStyle`", () => {
    fs.__setMockFiles({
      "app.json": `{
        "name": "Example",
        "displayName": "Example",
        "components": [
          {
            "appKey": "Example",
            "presentationStyle": "null"
          }
        ]
      }`,
    });
    expect(validateManifest(findFile("app.json"))).toBe(1001);
    expect(consoleSpy).toHaveBeenCalledTimes(2);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "app.json: error: app.json is not a valid app manifest"
      )
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "app.json: error: /components/0/presentationStyle must be equal to one of the allowed values"
      )
    );
  });

  test("catches invalid values for resources", () => {
    fs.__setMockFiles({
      "app.json": `{
        "name": "Example",
        "displayName": "Example",
        "resources": 0
      }`,
    });
    expect(validateManifest(findFile("app.json"))).toBe(1003);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "app.json: error: app.json is not a valid app manifest"
      )
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("app.json: error: /resources must be array")
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("app.json: error: /resources must be object")
    );
  });

  test("catches duplicate resources", () => {
    fs.__setMockFiles({
      "app.json": `{
        "name": "Example",
        "displayName": "Example",
        "resources": [
          "app.json",
          "app.json"
        ]
      }`,
    });
    expect(validateManifest(findFile("app.json"))).toBe(1003);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "app.json: error: app.json is not a valid app manifest"
      )
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "app.json: error: /resources must NOT have duplicate items"
      )
    );
  });

  test("catches duplicate, platform-specific resources", () => {
    ["android", "ios", "macos", "windows"].forEach((platform) => {
      consoleSpy.mockReset();
      fs.__setMockFiles({
        "app.json": `{
          "name": "Example",
          "displayName": "Example",
          "resources": {
            "${platform}": [
              "app.json",
              "app.json"
            ]
          }
        }`,
      });

      expect(validateManifest(findFile("app.json"))).toBe(1003);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "app.json: error: app.json is not a valid app manifest"
        )
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("app.json: error: /resources must be array")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `app.json: error: /resources/${platform} must NOT have duplicate items`
        )
      );
    });
  });

  test("is silent on valid manifests", () => {
    fs.__setMockFiles({
      "app.json": `{
        "name": "Example",
        "displayName": "Example",
        "components": [
          {
            "appKey": "Example",
            "displayName": "App"
          },
          {
            "appKey": "Example",
            "displayName": "App (modal)",
            "presentationStyle": "modal"
          }
        ],
        "resources": {
          "android": [
            "dist/res",
            "dist/main.android.jsbundle"
          ],
          "ios": [
            "dist/assets",
            "dist/main.ios.jsbundle"
          ],
          "macos": [
            "dist/assets",
            "dist/main.macos.jsbundle"
          ],
          "windows": [
            "dist/assets",
            "dist/main.windows.bundle"
          ]
        }
      }`,
    });
    expect(validateManifest(findFile("app.json"))).toMatchInlineSnapshot(`
      {
        "components": [
          {
            "appKey": "Example",
            "displayName": "App",
          },
          {
            "appKey": "Example",
            "displayName": "App (modal)",
            "presentationStyle": "modal",
          },
        ],
        "displayName": "Example",
        "name": "Example",
      }
    `);
    expect(consoleSpy).not.toHaveBeenCalled();
  });
});
