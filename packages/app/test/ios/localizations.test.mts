import { deepEqual, equal } from "node:assert/strict";
import * as nodefs from "node:fs";
import * as path from "node:path";
import { afterEach, describe, it } from "node:test";
import {
  generateLocalizations as generateLocalizationsActual,
  getProductName,
} from "../../ios/localizations.mjs";
import { projectPath } from "../../ios/utils.mjs";
import { readTextFile } from "../../scripts/helpers.js";
import type { ApplePlatform, JSONObject } from "../../scripts/types.ts";
import { fs, setMockFiles, toJSON } from "../fs.mock.mts";

const macosOnly = { skip: process.platform === "win32" };

describe("generateLocalizations()", macosOnly, () => {
  const localizationsDir = projectPath("Localizations", "macos");
  const enStrings = path.join(localizationsDir, "en.lproj", "Main.strings");
  const stringsExist = nodefs.existsSync(enStrings);

  function generateLocalizations(
    appConfig: JSONObject,
    targetPlatform: ApplePlatform,
    destination: string
  ) {
    generateLocalizationsActual(appConfig, targetPlatform, destination, fs);
  }

  afterEach(() => {
    setMockFiles();
  });

  for (const platform of ["ios", "visionos"] as const) {
    it(`[${platform}] returns early if no localizations are found`, () => {
      generateLocalizations({}, platform, ".");

      deepEqual(toJSON(), {});
    });
  }

  it("[macos] generates localization files", { skip: !stringsExist }, () => {
    const name = "ContosoApp";

    // Read strings from disk
    const strings = readTextFile(enStrings);

    setMockFiles({
      [`${localizationsDir}/.ignoreme`]: "",
      [enStrings]: strings,
    });

    generateLocalizations({ name }, "macos", ".");
    const stringsCopy = readTextFile("Localizations/en.lproj/Main.strings", fs);

    deepEqual(stringsCopy, strings.replaceAll("ReactTestApp", name));
  });
});

describe("getProductName()", () => {
  it("prefers the display name", () => {
    equal(getProductName({ name: "Short", displayName: "Stylish" }), "Stylish");
  });

  it("falls back to name if display name is not set", () => {
    equal(getProductName({ name: "Short", displayName: "" }), "Short");
  });

  it("falls back to default name if nothing is set", () => {
    equal(getProductName({ name: "", displayName: "" }), "ReactTestApp");
  });
});
