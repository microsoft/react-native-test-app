#import "UIViewController+ReactTestApp.h"

@protocol RTAViewController <NSObject>
- (instancetype)initWithBridge:(RCTBridge *)bridge;
@end

RTAViewController *RTAViewControllerFromString(NSString *name, RCTBridge *bridge)
{
    Class viewController = NSClassFromString(name);
    return [viewController instancesRespondToSelector:@selector(initWithBridge:)]
               ? [[viewController alloc] initWithBridge:bridge]
               : nil;
}
