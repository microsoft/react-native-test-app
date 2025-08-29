// Disable clang-format because it gets confused when there's a "+" in the
// filename.
// clang-format off
#import "UIViewController+ReactTestApp.h"
// clang-format on

#import <ReactNativeHost/ReactNativeHost.h>

@protocol RTAViewController <NSObject>
- (instancetype)initWithBridge:(RCTBridge *)bridge;
- (instancetype)initWithHost:(ReactNativeHost *)host;
@end

RTAViewController *RTAViewControllerFromString(NSString *name, ReactNativeHost *host)
{
    Class viewController = NSClassFromString(name);
    if ([viewController instancesRespondToSelector:@selector(initWithHost:)]) {
        return [[viewController alloc] initWithHost:host];
    }

    if ([viewController instancesRespondToSelector:@selector(initWithBridge:)]) {
        return [[viewController alloc] initWithBridge:host.bridge];
    }

    return nil;
}
