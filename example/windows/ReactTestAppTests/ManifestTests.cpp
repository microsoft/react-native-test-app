#include "pch.h"

#include <CppUnitTest.h>
#include <string>

#include "Manifest.h"

using namespace Microsoft::VisualStudio::CppUnitTestFramework;

using ReactTestApp::Component;
using ReactTestApp::Manifest;

// disable clang-format because it doesn't handle macros very well
// clang-format off
namespace ReactTestAppTests
{
    TEST_CLASS(ManifestTests)
    {
    public:
        TEST_METHOD(ParseManifestWithOneComponent)
        {
            std::optional<ReactTestApp::Manifest> manifest =
                ReactTestApp::GetManifest("manifestTestFiles/simpleManifest.json");
            if (!manifest.has_value()) {
                Assert::Fail(L"Couldn't read manifest file");
            }

            auto &manifestContents = manifest.value();
            Assert::AreEqual(manifestContents.name, {"Example"});
            Assert::AreEqual(manifestContents.displayName, {"Example"});
            Assert::AreEqual(manifestContents.components[0].appKey, {"Example"});
            Assert::AreEqual(manifestContents.components[0].displayName.value(), {"App"});
            Assert::IsFalse(manifestContents.components[0].initialProperties.has_value());
        }

        TEST_METHOD(ParseManifestWithMultipleComponents)
        {
            std::optional<ReactTestApp::Manifest> manifest =
                ReactTestApp::GetManifest("manifestTestFiles/withMultipleComponents.json");
            if (!manifest.has_value()) {
                Assert::Fail(L"Couldn't read manifest file");
            }

            auto &manifestContents = manifest.value();
            Assert::AreEqual(manifestContents.name, {"Example"});
            Assert::AreEqual(manifestContents.displayName, {"Example"});
            Assert::AreEqual(manifestContents.components.size(), {2});

            Assert::AreEqual(manifestContents.components[0].appKey, {"0"});
            Assert::IsFalse(manifestContents.components[0].displayName.has_value());
            Assert::IsTrue(manifestContents.components[0].initialProperties.has_value());
            Assert::AreEqual(std::any_cast<std::string>(
                                 manifestContents.components[0].initialProperties.value()["key"]),
                             {"value"});

            Assert::AreEqual(manifestContents.components[1].appKey, {"1"});
            Assert::AreEqual(manifestContents.components[1].displayName.value(), {"1"});
            Assert::IsFalse(manifestContents.components[1].initialProperties.has_value());
        }

        TEST_METHOD(ParseManifestWithComplexInitialProperties)
        {
            std::optional<ReactTestApp::Manifest> manifest =
                ReactTestApp::GetManifest("manifestTestFiles/withComplexInitialProperties.json");
            if (!manifest.has_value()) {
                Assert::Fail(L"Couldn't read manifest file");
            }

            auto &manifestContents = manifest.value();
            auto &component = manifestContents.components[0];
            Assert::AreEqual(manifestContents.name, {"Name"});
            Assert::AreEqual(manifestContents.displayName, {"Display Name"});

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
