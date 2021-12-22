#import <XCTest/XCTest.h>

#import <ReactTestApp-DevSupport/ReactTestApp-DevSupport.h>

@interface DevSupportTests : XCTestCase
@end

@implementation DevSupportTests

- (void)testDevSupportIsLinked
{
    XCTAssertNotNil(ReactTestAppDidInitializeNotification);
    XCTAssertNotNil(ReactTestAppWillInitializeReactNativeNotification);
    XCTAssertNotNil(ReactTestAppDidInitializeReactNativeNotification);
    XCTAssertNotNil(ReactTestAppSceneDidOpenURLNotification);
}

@end
