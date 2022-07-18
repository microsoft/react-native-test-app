#include "pch.h"

#include <CppUnitTest.h>
#include <cstdio>
#include <filesystem>
#include <string>

#include "Manifest.h"

using namespace Microsoft::VisualStudio::CppUnitTestFramework;

using ReactTestApp::Component;
using ReactTestApp::Manifest;

std::string readManifest(std::filesystem::path file)
{
    // Current working directory when running tests (with VSTest.Console.exe)
    // changed between Visual Studio 16.8 and 16.9 and broke our pipelines. To
    // prevent future build failures, we'll use the absolute path to this
    // source file to build the path to the test fixtures.
    //
    // To ensure that `__FILE__` is a full path, we must also enable `/FC` in
    // Properties > C/C++ > Advanced.
    const auto p = std::filesystem::path(__FILE__).replace_filename("manifestTestFiles") / file;

    std::FILE *stream = nullptr;
    fopen_s(&stream, p.u8string().c_str(), "rb");

    std::string json;
    std::fseek(stream, 0, SEEK_END);
    json.resize(std::ftell(stream));

    std::rewind(stream);
    std::fread(json.data(), 1, json.size(), stream);
    std::fclose(stream);

    return json;
}

// disable clang-format because it doesn't handle macros very well
// clang-format off
namespace ReactTestAppTests
{
    TEST_CLASS(ManifestTests)
    {
    public:
        TEST_METHOD(ParseManifestWithOneComponent)
        {
            auto json = readManifest("simpleManifest.json");
            auto result = ReactTestApp::GetManifest(json.c_str());
            if (!result.has_value()) {
                Assert::Fail(L"Couldn't read manifest file");
            }

            auto &[manifest, checksum] = result.value();

            Assert::AreEqual(manifest.name, {"Example"});
            Assert::AreEqual(manifest.displayName, {"Example"});
            Assert::IsTrue(manifest.components.has_value());

            auto &components = manifest.components.value();
            Assert::AreEqual(components[0].appKey, {"Example"});
            Assert::AreEqual(components[0].displayName.value(), {"App"});
            Assert::IsFalse(components[0].initialProperties.has_value());
        }

        TEST_METHOD(ParseManifestWithMultipleComponents)
        {
            auto json = readManifest("withMultipleComponents.json");
            auto result = ReactTestApp::GetManifest(json.c_str());
            if (!result.has_value()) {
                Assert::Fail(L"Couldn't read manifest file");
            }

            auto &[manifest, checksum] = result.value();

            Assert::AreEqual(manifest.name, {"Example"});
            Assert::AreEqual(manifest.displayName, {"Example"});
            Assert::IsTrue(manifest.components.has_value());

            auto &components = manifest.components.value();
            Assert::AreEqual(components.size(), {2});

            Assert::AreEqual(components[0].appKey, {"0"});
            Assert::IsFalse(components[0].displayName.has_value());
            Assert::IsTrue(components[0].initialProperties.has_value());
            Assert::AreEqual(std::any_cast<std::string>(
                                 components[0].initialProperties.value()["key"]),
                             {"value"});

            Assert::AreEqual(components[1].appKey, {"1"});
            Assert::AreEqual(components[1].displayName.value(), {"1"});
            Assert::IsFalse(components[1].initialProperties.has_value());
        }

        TEST_METHOD(ParseManifestWithComplexInitialProperties)
        {
            auto json = readManifest("withComplexInitialProperties.json");
            auto result = ReactTestApp::GetManifest(json.c_str());
            if (!result.has_value()) {
                Assert::Fail(L"Couldn't read manifest file");
            }

            auto &[manifest, checksum] = result.value();

            Assert::AreEqual(manifest.name, {"Name"});
            Assert::AreEqual(manifest.displayName, {"Display Name"});
            Assert::IsTrue(manifest.components.has_value());

            auto &component = manifest.components.value()[0];
            Assert::AreEqual(component.appKey, {"AppKey"});
            Assert::IsFalse(component.displayName.has_value());
            Assert::IsTrue(component.initialProperties.has_value());

            auto &initialProps = component.initialProperties.value();
            Assert::IsTrue(std::any_cast<bool>(initialProps["boolean"]));
            Assert::AreEqual(std::any_cast<std::uint64_t>(initialProps["number"]), {9000});
            Assert::AreEqual(std::any_cast<std::string>(initialProps["string"]), {"string"});

            auto const &array = std::any_cast<std::vector<std::any>>(initialProps["array"]);
            Assert::IsTrue(array[0].type() == typeid(std::nullopt));
            Assert::IsTrue(std::any_cast<bool>(array[1]));
            Assert::AreEqual(std::any_cast<std::uint64_t>(array[2]), {9000});
            Assert::AreEqual(std::any_cast<std::string>(array[3]), {"string"});
            Assert::IsTrue(std::any_cast<std::vector<std::any>>(array[4]).empty());
            Assert::IsTrue(std::any_cast<std::map<std::string, std::any>>(array[5]).empty());

            auto object = std::any_cast<std::map<std::string, std::any>>(initialProps["object"]);
            Assert::IsTrue(std::any_cast<bool>(object["boolean"]));
            Assert::AreEqual(std::any_cast<std::uint64_t>(object["number"]), {9000});
            Assert::AreEqual(std::any_cast<std::string>(object["string"]), {"string"});

            auto const &innerArray = std::any_cast<std::vector<std::any>>(object["array"]);
            Assert::IsTrue(innerArray[0].type() == typeid(std::nullopt));
            Assert::IsTrue(std::any_cast<bool>(innerArray[1]));
            Assert::AreEqual(std::any_cast<std::uint64_t>(innerArray[2]), {9000});
            Assert::AreEqual(std::any_cast<std::string>(innerArray[3]), {"string"});
            Assert::IsTrue(std::any_cast<std::vector<std::any>>(innerArray[4]).empty());
            Assert::IsTrue(std::any_cast<std::map<std::string, std::any>>(innerArray[5]).empty());

            Assert::IsTrue(object["object"].type() == typeid(std::nullopt));
        }
    };
}  // namespace ReactTestAppTests
// clang-format on
