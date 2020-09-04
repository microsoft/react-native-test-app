jest.mock("fs");

describe("copyAndReplace", () => {
  const { copyAndReplace } = require("../windows/test-app");

  afterEach(() => require("fs").__setMockFiles({}));

  test("replaces text files only", () => {
    const fs = require("fs");
    fs.__setMockFiles({
      "ReactTestApp_TemporaryKey.pfx": "binary",
      "ReactTestApp.png": "binary",
      "ReactTestApp.sln": "binary",
    });

    const replacements = { binary: "text" };

    copyAndReplace(
      "ReactTestApp_TemporaryKey.pfx",
      "test/ReactTestApp_TemporaryKey.pfx",
      replacements
    );
    expect(
      fs.readFileSync("test/ReactTestApp_TemporaryKey.pfx", {
        encoding: "utf8",
      })
    ).toBe("binary");

    copyAndReplace("ReactTestApp.png", "test/ReactTestApp.png", replacements);
    expect(
      fs.readFileSync("test/ReactTestApp.png", {
        encoding: "utf8",
      })
    ).toBe("binary");

    copyAndReplace("ReactTestApp.sln", "test/ReactTestApp.sln", replacements);
    expect(
      fs.readFileSync("test/ReactTestApp.sln", {
        encoding: "utf8",
      })
    ).toBe("text");
  });

  test("throws on error", () => {
    expect(() => copyAndReplace("ReactTestApp.png", "")).toThrow(
      "copyFile() error"
    );
    expect(() => copyAndReplace("ReactTestApp.sln", "")).toThrow(
      "writeFile() error"
    );
  });
});
