#import <Foundation/Foundation.h>

#if TARGET_OS_IOS
#define RTAView UIView
@class UIView;
#else
#define RTAView NSView
@class NSView;
#endif

@class RCTBridge;

FOUNDATION_EXTERN RTAView *RTACreateReactRootView(RCTBridge *,
                                                  NSString *moduleName,
                                                  NSDictionary *initialProperties);

FOUNDATION_EXTERN NSObject *RTACreateSurfacePresenterBridgeAdapter(RCTBridge *);
