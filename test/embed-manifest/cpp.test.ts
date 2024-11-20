import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { generate as generateActual } from "../../scripts/embed-manifest/cpp.mjs";
import * as fixtures from "./fixtures.ts";

describe("embed manifest (C++)", () => {
  const generate = (json: Record<string, unknown>) => generateActual(json, "0");

  it("generates all properties", () => {
    equal(
      generate(fixtures.simple),
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

  it("handles missing properties", () => {
    equal(
      generate(fixtures.minimum),
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

  it("handles valid JSON data types", () => {
    equal(
      generate(fixtures.extended),
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
