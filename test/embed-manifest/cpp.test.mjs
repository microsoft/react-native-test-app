// @ts-check
import { equal } from "node:assert/strict";
import * as fs from "node:fs";
import { describe, it } from "node:test";
import { generate as generateActual } from "../../scripts/embed-manifest/cpp.mjs";
import * as fixtures from "./fixtures.mjs";

describe("embed manifest (C++)", () => {
  /** @type {(json: Record<string, unknown>) => Promise<string>} */
  const generate = (json) =>
    new Promise((resolve) => {
      generateActual(json, "0", {
        ...fs,
        existsSync: () => true,
        promises: {
          ...fs.promises,
          mkdir: () => Promise.resolve(undefined),
          writeFile: (_, data) => {
            resolve(data.toString());
            return Promise.resolve();
          },
        },
      });
    });

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
});
