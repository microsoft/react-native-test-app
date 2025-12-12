#include <CppUnitTest.h>

using namespace Microsoft::VisualStudio::CppUnitTestFramework;

// disable clang-format because it doesn't handle macros very well
// clang-format off
namespace ReactApp::Tests
{
    TEST_CLASS(Tests)
    {
    public:
        TEST_METHOD(Test)
        {
            Assert::IsTrue(true);
        }
    };
}  // namespace ReactApp::Tests
// clang-format on
