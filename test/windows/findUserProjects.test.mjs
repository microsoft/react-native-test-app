// @ts-check
import { deepEqual, equal } from "node:assert/strict";
import * as os from "node:os";
import * as path from "node:path";
import { describe, it } from "node:test";
import { findUserProjects, toProjectEntry } from "../../windows/test-app.mjs";

describe("findUserProjects()", () => {
  it("finds all user projects, ignoring android/ios/macos/node_modules", () => {
    const projectPath = path.join("test", "__fixtures__", "windows_test_app");
    deepEqual(findUserProjects(projectPath), [
      {
        path: path.join(projectPath, "Root.vcxproj"),
        name: "Root",
        guid: "{00000000-0000-0000-0000-000000000000}",
      },
      {
        path: path.join(projectPath, "windows", "Windows.vcxproj"),
        name: "ReactTestApp",
        guid: "{00000000-0000-0000-0000-000000000000}",
      },
      {
        path: path.join(projectPath, "windows", "WithoutProjectName.vcxproj"),
        name: "WithoutProjectName",
        guid: "{00000000-0000-0000-0000-000000000000}",
      },
    ]);
    deepEqual(findUserProjects(path.join(projectPath, "android")), [
      {
        path: path.join(projectPath, "android", "Android.vcxproj"),
        name: "Android",
        guid: "{00000000-0000-0000-0000-000000000000}",
      },
    ]);
    deepEqual(findUserProjects(path.join(projectPath, "ios")), [
      {
        path: path.join(projectPath, "ios", "iOS.vcxproj"),
        name: "iOS",
        guid: "{00000000-0000-0000-0000-000000000000}",
      },
    ]);
    deepEqual(findUserProjects(path.join(projectPath, "macos")), [
      {
        path: path.join(projectPath, "macos", "macOS.vcxproj"),
        name: "macOS",
        guid: "{00000000-0000-0000-0000-000000000000}",
      },
    ]);
    deepEqual(findUserProjects(path.join(projectPath, "node_modules")), [
      {
        path: path.join(projectPath, "node_modules", "SomeProject.vcxproj"),
        name: "SomeProject",
        guid: "{00000000-0000-0000-0000-000000000000}",
      },
    ]);
  });
});

describe("toProjectEntry()", () => {
  it("returns solution entry for specified project", () => {
    const projectPath = path.join("windows", "ReactTestApp.vcxproj");
    equal(
      toProjectEntry(
        {
          path: projectPath,
          name: "ReactTestApp",
          guid: "{00000000-0000-0000-0000-000000000000}",
        },
        path.resolve("")
      ),
      [
        `Project("{8BC9CEB8-8B4A-11D0-8D11-00A0C91BC942}") = "ReactTestApp", "${projectPath}", "{00000000-0000-0000-0000-000000000000}"`,
        "\tProjectSection(ProjectDependencies) = postProject",
        `\t\t{B44CEAD7-FBFF-4A17-95EA-FF5434BBD79D} = {B44CEAD7-FBFF-4A17-95EA-FF5434BBD79D}`,
        "\tEndProjectSection",
        "EndProject",
      ].join(os.EOL)
    );
  });
});
