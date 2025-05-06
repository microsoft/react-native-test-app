#import <XCTest/XCTest.h>

#import <ReactTestApp-DevSupport/ReactTestApp-DevSupport.h>

@interface DevSupportTests : XCTestCase
@end

@implementation DevSupportTests

- (void)testDevSupportIsLinked
{
    XCTAssertNotNil(ReactAppDidFinishLaunchingNotification);
    XCTAssertNotNil(ReactAppWillInitializeReactNativeNotification);
    XCTAssertNotNil(ReactAppDidInitializeReactNativeNotification);
    XCTAssertNotNil(ReactAppSceneDidOpenURLNotification);
}

@end
