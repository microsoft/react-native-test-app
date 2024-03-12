#include <TargetConditionals.h>
#if TARGET_OS_IPHONE
#import <UIKit/UIViewController.h>
#define RTAViewController UIViewController
#else
#import <AppKit/NSViewController.h>
#define RTAViewController NSViewController
#endif

@class ReactNativeHost;

NS_ASSUME_NONNULL_BEGIN

RTAViewController *_Nullable RTAViewControllerFromString(NSString *name, ReactNativeHost *host);

NS_ASSUME_NONNULL_END
