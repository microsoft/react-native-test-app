//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

#ifndef COMMON_APPREGISTRY_
#define COMMON_APPREGISTRY_

#include <string>
#include <vector>

namespace facebook::jsi
{
    class Runtime;
}

namespace ReactTestApp
{
    /**
     * Calls `AppRegistry.getAppKeys()` and returns the result.
     */
    std::vector<std::string> GetAppKeys(facebook::jsi::Runtime &runtime);
}  // namespace ReactTestApp

#endif  // COMMON_APPREGISTRY_
