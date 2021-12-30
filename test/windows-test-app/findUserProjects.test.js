//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//
// @ts-check

describe("findUserProjects", () => {
  const path = require("path");
  const { findUserProjects } = require("../../windows/test-app");

  test("finds all user projects, ignoring android/ios/macos/node_modules", () => {
    const projectPath = path.join("test", "__fixtures__", "windows_test_app");
    expect(findUserProjects(projectPath)).toEqual([
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
    expect(findUserProjects(path.join(projectPath, "android"))).toEqual([
      {
        path: path.join(projectPath, "android", "Android.vcxproj"),
        name: "Android",
        guid: "{00000000-0000-0000-0000-000000000000}",
      },
    ]);
    expect(findUserProjects(path.join(projectPath, "ios"))).toEqual([
      {
        path: path.join(projectPath, "ios", "iOS.vcxproj"),
        name: "iOS",
        guid: "{00000000-0000-0000-0000-000000000000}",
      },
    ]);
    expect(findUserProjects(path.join(projectPath, "macos"))).toEqual([
      {
        path: path.join(projectPath, "macos", "macOS.vcxproj"),
        name: "macOS",
        guid: "{00000000-0000-0000-0000-000000000000}",
      },
    ]);
    expect(findUserProjects(path.join(projectPath, "node_modules"))).toEqual([
      {
        path: path.join(projectPath, "node_modules", "SomeProject.vcxproj"),
        name: "SomeProject",
        guid: "{00000000-0000-0000-0000-000000000000}",
      },
    ]);
  });
});

describe("toProjectEntry", () => {
  const os = require("os");
  const path = require("path");
  const { toProjectEntry } = require("../../windows/test-app");

  test("returns solution entry for specified project", () => {
    const projectPath = path.join("windows", "ReactTestApp.vcxproj");
    expect(
      toProjectEntry(
        {
          path: projectPath,
          name: "ReactTestApp",
          guid: "{00000000-0000-0000-0000-000000000000}",
        },
        path.resolve("")
      )
    ).toBe(
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
