#include "pch.h"
#include "CppUnitTest.h"
#include "Manifest.h"
#include <string>

using namespace Microsoft::VisualStudio::CppUnitTestFramework;
using ReactTestApp::Manifest;
using ReactTestApp::Component;

namespace ReactTestAppTests
{
	TEST_CLASS(ManifestTests)
	{
	public:
		TEST_METHOD(ParseManifestWithOneComponent)
		{
            std::optional<ReactTestApp::Manifest> manifest = ReactTestApp::GetManifest("manifestTestFiles/simpleManifest.json");
            if (!manifest.has_value()) {
                Assert::Fail(L"Couldn't read manifest file");
            }
            auto &manifestContents = manifest.value();
            Assert::IsTrue(manifestContents.name == "Example");
            Assert::IsTrue(manifestContents.displayName == "Example");
            Assert::IsTrue(manifestContents.components[0].appKey == "Example");
            Assert::IsTrue(manifestContents.components[0].displayName == "App");
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
            Assert::IsTrue(manifestContents.name == "Example");
            Assert::IsTrue(manifestContents.displayName == "Example");
            Assert::IsTrue(manifestContents.components.size() == 2);

            Assert::IsTrue(manifestContents.components[0].appKey == "0");
            Assert::IsFalse(manifestContents.components[0].displayName.has_value());
            Assert::IsTrue(manifestContents.components[0].initialProperties.has_value());
            Assert::IsTrue(std::any_cast<std::string>(manifestContents.components[0].initialProperties.value()["key"]) == "value");

            Assert::IsTrue(manifestContents.components[1].appKey == "1");
            Assert::IsTrue(manifestContents.components[1].displayName == "1");
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
            Assert::IsTrue(manifestContents.name == "Name");
            Assert::IsTrue(manifestContents.displayName == "Display Name");

            Assert::IsTrue(component.appKey == "AppKey");
            Assert::IsFalse(component.displayName.has_value());
            Assert::IsTrue(component.initialProperties.has_value());

            auto &initialProps = component.initialProperties.value();
            Assert::IsTrue(std::any_cast<bool>(initialProps["boolean"]));
            Assert::IsTrue(std::any_cast<std::uint64_t>(initialProps["number"]) == 9000);
            Assert::IsTrue(std::any_cast<std::string>(initialProps["string"]) == "string");

            auto &array = std::any_cast<std::vector<std::any>>(initialProps["array"]);
            Assert::IsTrue(array[0].type() == typeid(std::nullopt));
            Assert::IsTrue(std::any_cast<bool>(array[1]));
            Assert::IsTrue(std::any_cast<std::uint64_t>(array[2]) == 9000);
            Assert::IsTrue(std::any_cast<std::string>(array[3]) == "string");
            Assert::IsTrue(std::any_cast<std::vector<std::any>>(array[4]).empty());
            Assert::IsTrue(std::any_cast<std::map<std::string, std::any>>(array[5]).empty());

            auto &object= std::any_cast<std::map<std::string, std::any>>(initialProps["object"]);
            Assert::IsTrue(std::any_cast<bool>(object["boolean"]));
            Assert::IsTrue(std::any_cast<std::uint64_t>(object["number"]) == 9000);
            Assert::IsTrue(std::any_cast<std::string>(object["string"]) == "string");

            auto &innerArray = std::any_cast<std::vector<std::any>>(object["array"]);
            Assert::IsTrue(array[0].type() == typeid(std::nullopt));
            Assert::IsTrue(std::any_cast<bool>(array[1]));
            Assert::IsTrue(std::any_cast<std::uint64_t>(array[2]) == 9000);
            Assert::IsTrue(std::any_cast<std::string>(array[3]) == "string");
            Assert::IsTrue(std::any_cast<std::vector<std::any>>(array[4]).empty());
            Assert::IsTrue(std::any_cast<std::map<std::string, std::any>>(array[5]).empty());

            Assert::IsTrue(object["object"].type() == typeid(std::nullopt));
        }
	};
}
