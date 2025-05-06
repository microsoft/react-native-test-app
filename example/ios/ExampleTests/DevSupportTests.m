#import <XCTest/XCTest.h>

#import <ReactTestApp-DevSupport/ReactTestApp-DevSupport.h>

@interface DevSupportTests : XCTestCase
@end

@implementation DevSupportTests

- (void)testDevSupportIsLinked
{
    XCTAssertNotNil(ReactAppDidInitializeNotification);
    XCTAssertNotNil(ReactAppWillInitializeReactNativeNotification);
    XCTAssertNotNil(ReactAppDidInitializeReactNativeNotification);
    XCTAssertNotNil(ReactAppSceneDidOpenURLNotification);
}

@end
