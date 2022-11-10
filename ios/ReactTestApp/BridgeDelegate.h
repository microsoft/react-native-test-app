#import <React/RCTBridgeDelegate.h>

NS_ASSUME_NONNULL_BEGIN

@interface RTABridgeDelegate : NSObject <RCTBridgeDelegate>
- (instancetype)initWithBridgeDelegate:(id<RCTBridgeDelegate>)bridgeDelegate;
@end

NS_ASSUME_NONNULL_END
