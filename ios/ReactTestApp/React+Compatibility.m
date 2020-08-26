//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

#import "React+Compatibility.h"

#include <TargetConditionals.h>

#import <React/RCTBridge.h>

// `RCTReloadCommand.h` is excluded from `react-native-macos`
// See https://github.com/microsoft/react-native-macos/blob/v0.61.39/React-Core.podspec#L66
#if REACT_NATIVE_VERSION >= 6200
#import <React/RCTReloadCommand.h>
#endif

void RTATriggerReloadCommand(RCTBridge *bridge, NSString *reason)
{
#if REACT_NATIVE_VERSION < 6200
    [bridge reload];
#else
    RCTTriggerReloadCommandListeners(reason);
#endif
}
