// @ts-check
import { equal, ok } from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import { generate as generateActual } from "../../scripts/embed-manifest/cpp.mjs";
import * as fixtures from "./fixtures.mjs";

describe("embed manifest (C++)", () => {
  /** @type {(resolve: (result: any) => void) => Partial<typeof fs.promises>} */
  const fsMock = (resolve) => ({
    mkdir: () => Promise.resolve(undefined),
    writeFile: (_, data) => {
      resolve(data.toString());
      return Promise.resolve();
    },
  });

  /** @type {(json: Record<string, unknown>, mockFs?: typeof fsMock) => Promise<string>} */
  const generate = (json, mockFs = fsMock) => {
    return new Promise((resolve) => {
      generateActual(json, "0", {
        ...fs,
        promises: {
          ...fs.promises,
          ...mockFs(resolve),
        },
      });
    });
  };

  it("generates all properties", async () => {
    equal(
      await generate(fixtures.simple),
      `// clang-format off
#include "Manifest.h"

#include <cstdint>

using ReactApp::Component;
using ReactApp::JSONObject;
using ReactApp::Manifest;

Manifest ReactApp::GetManifest()
{
    using namespace std::literals::string_view_literals;

    return Manifest{
        "Example",
        "Template",
        "1.0",
        "main",
        "single",
        std::make_optional<std::vector<Component>>({
            Component{
                "Example",
                "Example",
                std::nullopt,
                std::nullopt,
                std::nullopt
            },
            Component{
                "Example",
                "Template",
                JSONObject{},
                "modal",
                "single"
            },
        })
    };
}

std::string_view ReactApp::GetManifestChecksum()
{
    return "0";
}
`
    );
  });

  it("handles missing properties", async () => {
    equal(
      await generate(fixtures.minimum),
      `// clang-format off
#include "Manifest.h"

#include <cstdint>

using ReactApp::Component;
using ReactApp::JSONObject;
using ReactApp::Manifest;

Manifest ReactApp::GetManifest()
{
    using namespace std::literals::string_view_literals;

    return Manifest{
        "Example",
        "Example",
        std::nullopt,
        std::nullopt,
        std::nullopt,
        std::make_optional<std::vector<Component>>({})
    };
}

std::string_view ReactApp::GetManifestChecksum()
{
    return "0";
}
`
    );
  });

  it("handles valid JSON data types", async () => {
    equal(
      await generate(fixtures.extended),
      `// clang-format off
#include "Manifest.h"

#include <cstdint>

using ReactApp::Component;
using ReactApp::JSONObject;
using ReactApp::Manifest;

Manifest ReactApp::GetManifest()
{
    using namespace std::literals::string_view_literals;

    return Manifest{
        "Example",
        "Example",
        std::nullopt,
        std::nullopt,
        std::nullopt,
        std::make_optional<std::vector<Component>>({
            Component{
                "Example",
                "Example",
                JSONObject{
                    {"boolean", true},
                    {"double", 1.1},
                    {"int", INT64_C(1)},
                    {"null", nullptr},
                    {"string", "string"sv},
                    {
                        "array",
                        std::vector<std::any>{
                            true,
                            1.1,
                            INT64_C(1),
                            nullptr,
                            "string"sv,
                            std::vector<std::any>{
                                true,
                                1.1,
                                INT64_C(1),
                                nullptr,
                                "string"sv,
                                std::vector<std::any>{},
                                JSONObject{
                                    {"boolean", true},
                                    {"double", 1.1},
                                    {"int", INT64_C(1)},
                                    {"null", nullptr},
                                    {"string", "string"sv},
                                },
                            },
                            JSONObject{
                                {"boolean", true},
                                {"double", 1.1},
                                {"int", INT64_C(1)},
                                {"null", nullptr},
                                {"string", "string"sv},
                            },
                        }
                    },
                    {
                        "object",
                        JSONObject{
                            {"boolean", true},
                            {"double", 1.1},
                            {"int", INT64_C(1)},
                            {"null", nullptr},
                            {"string", "string"sv},
                            {
                                "array",
                                std::vector<std::any>{
                                    true,
                                    1.1,
                                    INT64_C(1),
                                    nullptr,
                                    "string"sv,
                                    std::vector<std::any>{
                                        true,
                                        1.1,
                                        INT64_C(1),
                                        nullptr,
                                        "string"sv,
                                        std::vector<std::any>{},
                                        JSONObject{
                                            {"boolean", true},
                                            {"double", 1.1},
                                            {"int", INT64_C(1)},
                                            {"null", nullptr},
                                            {"string", "string"sv},
                                        },
                                    },
                                    JSONObject{},
                                }
                            },
                            {
                                "object",
                                JSONObject{
                                    {"boolean", true},
                                    {"double", 1.1},
                                    {"int", INT64_C(1)},
                                    {"null", nullptr},
                                    {"string", "string"sv},
                                    {
                                        "array",
                                        std::vector<std::any>{
                                            true,
                                            1.1,
                                            INT64_C(1),
                                            nullptr,
                                            "string"sv,
                                            std::vector<std::any>{
                                                true,
                                                1.1,
                                                INT64_C(1),
                                                nullptr,
                                                "string"sv,
                                                std::vector<std::any>{},
                                                JSONObject{
                                                    {"boolean", true},
                                                    {"double", 1.1},
                                                    {"int", INT64_C(1)},
                                                    {"null", nullptr},
                                                    {"string", "string"sv},
                                                },
                                            },
                                            JSONObject{
                                                {"boolean", true},
                                                {"double", 1.1},
                                                {"int", INT64_C(1)},
                                                {"null", nullptr},
                                                {"string", "string"sv},
                                            },
                                        }
                                    },
                                }
                            },
                        }
                    },
                },
                std::nullopt,
                std::nullopt
            },
        })
    };
}

std::string_view ReactApp::GetManifestChecksum()
{
    return "0";
}
`
    );
  });

  it("writes the output under `/~/.node_modules/.generated`", async () => {
    const expected = path.join("node_modules", ".generated", "Manifest.g.cpp");
    const destination = await generate(fixtures.simple, (resolve) => ({
      mkdir: () => Promise.resolve(undefined),
      writeFile: (p) => {
        resolve(p);
        return Promise.resolve();
      },
    }));
    ok(destination.endsWith(expected));
  });
});
