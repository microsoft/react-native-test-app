// Disable clang-format because it gets confused when there's a "+" in the
// filename.
// clang-format off
#import "UIViewController+ReactTestApp.h"
// clang-format on

#import <ReactNativeHost/ReactNativeHost.h>

@protocol RTAViewController <NSObject>
- (instancetype)initWithBridge:(RCTBridge *)bridge;
@end

RTAViewController *RTAViewControllerFromString(NSString *name, ReactNativeHost *host)
{
    Class viewController = NSClassFromString(name);
    return [viewController instancesRespondToSelector:@selector(initWithBridge:)]
               ? [[viewController alloc] initWithBridge:host.bridge]
               : nil;
}
