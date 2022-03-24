#import <Foundation/Foundation.h>

#if TARGET_OS_IOS
#define RTAView UIView
@class UIView;
#else
#define RTAView NSView
@class NSView;
#endif

@class RCTBridge;

NS_ASSUME_NONNULL_BEGIN

FOUNDATION_EXTERN RTAView *RTACreateReactRootView(RCTBridge *,
                                                  NSString *moduleName,
                                                  NSDictionary *_Nullable initialProperties);

FOUNDATION_EXTERN NSObject *RTACreateSurfacePresenterBridgeAdapter(RCTBridge *);

NS_ASSUME_NONNULL_END
