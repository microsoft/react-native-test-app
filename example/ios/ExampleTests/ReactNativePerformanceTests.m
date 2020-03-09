//
// Copyright (c) Microsoft Corporation. All rights reserved.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

#import <XCTest/XCTest.h>

#import <React/RCTBridge.h>
#import <React/RCTDevSettings.h>
#import <React/RCTLog.h>

@interface ReactNativePerformanceTests : XCTestCase <RCTBridgeDelegate>
@end

@implementation ReactNativePerformanceTests {
    RCTDevSettings *_devSettings;
    BOOL _wasDebuggingRemotely;
}

- (void)setUp
{
    // Make sure that remote debugging is disabled otherwise we'll get a RedBox.
    _devSettings = [[RCTDevSettings alloc] init];
    if (_devSettings.isDebuggingRemotely) {
        _wasDebuggingRemotely = YES;
        _devSettings.isDebuggingRemotely = NO;
    }

    RCTSetLogFunction(^(__unused RCTLogLevel level,
                        __unused RCTLogSource source,
                        __unused NSString *fileName,
                        __unused NSNumber *lineNumber,
                        __unused NSString *message){
        // noop
    });
    RCTSetFatalHandler(nil);
}

- (void)tearDown
{
    if (_wasDebuggingRemotely) {
        _devSettings.isDebuggingRemotely = YES;
    }

    RCTSetLogFunction(nil);
}

- (void)testBridgeInitializationPerformance
{
    [self measureBlock:^{
      XCTestExpectation *expectation =
          [self expectationForNotification:RCTJavaScriptDidLoadNotification object:nil handler:nil];
      RCTBridge *bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:nil];
      [self waitForExpectations:@[expectation] timeout:5];
      [bridge invalidate];
    }];
}

// MARK: - RCTBridgeDelegate details

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
    return [NSBundle.mainBundle URLForResource:@"main" withExtension:@"jsbundle" subdirectory:nil];
}

- (NSArray<id<RCTBridgeModule>> *)extraModulesForBridge:(RCTBridge *)bridge
{
    return @[];
}

@end
