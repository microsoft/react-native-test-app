//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

#import <XCTest/XCTest.h>

#import <ReactTestApp-DevSupport/ReactTestApp-DevSupport.h>

@interface DevSupportTests : XCTestCase
@end

@implementation DevSupportTests

- (void)testDevSupportIsLinked
{
    XCTAssertNotNil(ReactTestAppDidInitializeNotification);
    XCTAssertNotNil(ReactTestAppSceneDidOpenURLNotification);
}

@end
