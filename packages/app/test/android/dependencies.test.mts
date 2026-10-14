import { equal, match } from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { after, describe, it } from "node:test";
import { templatePath } from "../template.mts";
import { buildGradle, removeProject, runGradleWithProject } from "./gradle.mts";

describe("dependencies.gradle", () => {
  const defaultTestProject = "DependenciesTest";

  /**
   * Runs Gradle in test project with the specified Gradle properties, and
   * prints the SDK versions with their types.
   */
  function runGradle(properties: string[]) {
    const gradleProperties = fs.readFileSync(
      path.join(templatePath, "android", "gradle.properties"),
      { encoding: "utf-8" }
    );
    return runGradleWithProject(defaultTestProject, ["android"], {
      "android/build.gradle": buildGradle(
        [
          'for (name in ["compileSdkVersion", "minSdkVersion", "targetSdkVersion"]) {',
          "    def value = project.ext.get(name)",
          '    println("${name} = ${value} (${value.getClass().getSimpleName()})")',
          "}",
        ].join("\n")
      ),
      "android/gradle.properties": [gradleProperties, ...properties],
    });
  }

  after(() => {
    removeProject(defaultTestProject);
  });

  it("returns SDK versions set in `gradle.properties` as integers", async () => {
    const { status, stdout } = await runGradle([
      "react.compileSdkVersion=35",
      "react.minSdkVersion=26",
      "react.targetSdkVersion=34",
    ]);

    equal(status, 0);
    match(stdout, /compileSdkVersion = 35 \(Integer\)/);
    match(stdout, /minSdkVersion = 26 \(Integer\)/);
    match(stdout, /targetSdkVersion = 34 \(Integer\)/);
  });

  it("leaves non-numeric SDK versions as they are", async () => {
    const { status, stdout } = await runGradle([
      "react.compileSdkVersion=android-36.1",
    ]);

    equal(status, 0);
    match(stdout, /compileSdkVersion = android-36.1 \(String\)/);
  });
});
