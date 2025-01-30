#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

NSURL *RTADefaultJSBundleURL();

void RTADisableRemoteDebugging();

IMP RTASwizzleSelector(Class class, SEL originalSelector, SEL swizzledSelector);

NS_ASSUME_NONNULL_END
