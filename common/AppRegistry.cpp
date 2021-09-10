//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

#include "AppRegistry.h"

#include <jsi/jsi.h>

using facebook::jsi::Runtime;
using facebook::jsi::String;
using ReactTestApp::GetAppKeys;

std::vector<std::string> GetAppKeys(Runtime &runtime)
{
    std::vector<std::string> result;

    constexpr char kFbBatchedBridgeId[] = "__fbBatchedBridge";

    auto global = runtime.global();
    if (!global.hasProperty(runtime, kFbBatchedBridgeId)) {
        return result;
    }

    // const appRegistry = __fbBatchedBridge.getCallableModule("AppRegistry");
    auto fbBatchedBridge = global.getPropertyAsObject(runtime, kFbBatchedBridgeId);
    auto getCallableModule = fbBatchedBridge.getPropertyAsFunction(runtime, "getCallableModule");
    auto appRegistry =
        getCallableModule.callWithThis(runtime, fbBatchedBridge, "AppRegistry").asObject(runtime);

    // const appKeys = appRegistry.getAppKeys();
    auto getAppKeys = appRegistry.getPropertyAsFunction(runtime, "getAppKeys");
    auto appKeys = getAppKeys.callWithThis(runtime, appRegistry).asObject(runtime).asArray(runtime);

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

    return result;
}
