#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

NSURL *RTADefaultJSBundleURL();

IMP RTASwizzleSelector(Class class, SEL originalSelector, SEL swizzledSelector);

NS_ASSUME_NONNULL_END
