#import "UIViewController+ReactTestApp.h"

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
