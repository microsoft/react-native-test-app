#import <Foundation/Foundation.h>

@class RCTBridge;

IMP RTASwizzleSelector(Class class, SEL originalSelector, SEL swizzledSelector);

void RTATriggerReloadCommand(RCTBridge *, NSString *reason);
