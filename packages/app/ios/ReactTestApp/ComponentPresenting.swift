#if !ENABLE_SINGLE_APP_MODE

/// Platform-specific presentation of a selected component. `AppModel` owns the
/// component catalog and selection decisions and drives a presenter; the
/// concrete presenter (a UIKit navigation controller on iOS, an AppKit window
/// presenter on macOS) turns those decisions into on-screen content.
protocol ComponentPresenting: AnyObject {
    /// Presents the given component.
    func present(_ component: Component)

    /// Whether a single, dynamically registered component should be presented
    /// automatically right now. iOS presents while the picker is visible; macOS
    /// presents while nothing is shown yet.
    var shouldAutoPresentRegisteredComponent: Bool { get }
}

#endif // !ENABLE_SINGLE_APP_MODE
