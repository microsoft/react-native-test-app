#include "AppRegistry.h"

#if __has_include(<jsi/jsi.h>)
#include <jsi/jsi.h>

using facebook::jsi::Array;
using facebook::jsi::Runtime;
using facebook::jsi::String;

namespace
{
    constexpr char kRNAppRegistryId[] = "RN$AppRegistry";

    Array GetRegisteredAppKeys(Runtime &runtime)
    {
        auto global = runtime.global();

        // const appKeys = RN$AppRegistry.getAppKeys();
        auto registry = global.getProperty(runtime, kRNAppRegistryId);
        if (registry.isObject()) {
            auto getAppKeys =
                std::move(registry).asObject(runtime).getPropertyAsFunction(runtime, "getAppKeys");
            return getAppKeys.call(runtime, nullptr, 0).asObject(runtime).asArray(runtime);
        }

        return Array(runtime, 0);
    }
}  // namespace

std::vector<std::string> ReactTestApp::GetAppKeys(Runtime &runtime)
{
    std::vector<std::string> result;

    try {
        auto appKeys = GetRegisteredAppKeys(runtime);
        auto length = appKeys.length(runtime);
        result.reserve(length);

        auto logBox = String::createFromAscii(runtime, "LogBox", 6);
        for (size_t i = 0; i < length; ++i) {
            auto value = appKeys.getValueAtIndex(runtime, i);
            if (!value.isString()) {
                continue;
            }

            auto appKey = value.toString(runtime);
            if (String::strictEquals(runtime, appKey, logBox)) {
                // Ignore internal app keys
                continue;
            }

            result.push_back(appKey.utf8(runtime));
        }
    } catch (...) {
        // Ignore - if we get here, Metro will eventually throw an invariant violation:
        // Module AppRegistry is not a registered callable module (calling runApplication).
    }

    return result;
}

#else

using facebook::jsi::Runtime;

std::vector<std::string> ReactTestApp::GetAppKeys(Runtime &)
{
    return {};
}

#endif  // __has_include(<jsi/jsi.h>)
