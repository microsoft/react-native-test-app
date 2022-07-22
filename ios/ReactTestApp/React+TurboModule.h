#if USE_TURBOMODULE

#import <React/RCTBridgeDelegate.h>

NS_ASSUME_NONNULL_BEGIN

@interface RTATurboModuleManagerDelegate : NSObject <RCTBridgeDelegate>
- (instancetype)initWithBridgeDelegate:(id<RCTBridgeDelegate>)bridgeDelegate;
@end

NS_ASSUME_NONNULL_END

#endif  // USE_TURBOMODULE
