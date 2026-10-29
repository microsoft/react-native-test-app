import { doesNotMatch, equal, match } from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { after, describe, it } from "node:test";
import {
  buildGradle,
  projectPath,
  removeProject,
  runGradleWithProject,
} from "./gradle.mts";

describe("test-app.gradle", () => {
  const defaultTestProject = "TestAppTest";

  const listGeneratedFiles = buildGradle(`
    dependsOn(":app:copyAssets", ":app:copyResources")
    doLast {
        // ':app' sets its build directory after the root project is configured
        def generatedDir = project(":app").layout.buildDirectory.dir("generated/rnta/src/main").get().asFile
        fileTree(generatedDir).matching { include("assets/**", "res/**") }.each {
            println("generated: " + generatedDir.toPath().relativize(it.toPath()).toString().replace("\\\\", "/"))
        }
    }
`);

  /**
   * Runs `copyAssets` and `copyResources` in test project, and prints the
   * generated files.
   */
  function runGradle(
    resources: string[],
    setupFiles: Record<string, string | string[]> = {}
  ) {
    return runGradleWithProject(defaultTestProject, ["android"], {
      ...setupFiles,
      "app.json": JSON.stringify({
        name: "AppName",
        displayName: "AppDisplayName",
        resources: { android: resources },
      }),
      "android/build.gradle": listGeneratedFiles,
    });
  }

  function removeFile(file: string) {
    fs.rmSync(path.join(projectPath(defaultTestProject), file));
  }

  const allResources = [
    "dist/res",
    "dist/main.android.jsbundle",
    "dist/assets/Font.ttf",
    "dist/assets/Sound.mp3",
  ];

  const allFiles = {
    "dist/res/drawable-mdpi/probe.png": "png",
    "dist/main.android.jsbundle": "bundle",
    "dist/assets/Font.ttf": "font",
    "dist/assets/Sound.mp3": "sound",
  };

  after(() => {
    removeProject(defaultTestProject);
  });

  it("removes resources that no longer exist in the source", async () => {
    const first = await runGradle(allResources, allFiles);

    equal(first.status, 0);
    match(first.stdout, /^generated: assets\/main\.android\.jsbundle$/m);
    match(first.stdout, /^generated: assets\/fonts\/Font\.ttf$/m);
    match(first.stdout, /^generated: res\/drawable-mdpi\/probe\.png$/m);
    match(first.stdout, /^generated: res\/raw\/sound\.mp3$/m);

    removeFile("dist/res/drawable-mdpi/probe.png");
    const second = await runGradle(allResources, {
      "dist/res/drawable-mdpi/probe.jpg": "jpg",
    });

    equal(second.status, 0);
    match(second.stdout, /^generated: res\/drawable-mdpi\/probe\.jpg$/m);
    doesNotMatch(second.stdout, /probe\.png/);
    match(second.stdout, /^generated: assets\/main\.android\.jsbundle$/m);
    match(second.stdout, /^generated: assets\/fonts\/Font\.ttf$/m);
    match(second.stdout, /^generated: res\/raw\/sound\.mp3$/m);
  });

  it("removes resources that are no longer listed in `app.json`", async () => {
    const first = await runGradle(allResources, allFiles);

    equal(first.status, 0);
    match(first.stdout, /^generated: /m);

    const second = await runGradle([]);

    equal(second.status, 0);
    doesNotMatch(second.stdout, /^generated: /m);
  });
});
