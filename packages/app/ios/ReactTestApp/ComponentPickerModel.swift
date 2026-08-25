import Combine

/// Shared state for the component picker. It holds the discovered components,
/// their enabled state, and the remember-last-component preference. It owns no
/// `ReactInstance`, builds no views/controllers, and makes no presentation
/// decisions; those remain in the platform-specific owners.
final class ComponentPickerModel: ObservableObject {
    @Published private(set) var components: [Component] = []
    @Published private(set) var componentsEnabled = false

    #if !ENABLE_SINGLE_APP_MODE

    @Published var rememberLastComponent: Bool {
        didSet { Session.shouldRememberLastComponent = rememberLastComponent }
    }

    private let checksum: String

    init(checksum: String) {
        self.checksum = checksum
        rememberLastComponent = Session.shouldRememberLastComponent
    }

    func rememberedComponentIndex() -> Int? {
        Session.lastOpenedComponent(checksum)
    }

    func recordSelection(at index: Int) {
        Session.storeComponent(index: index, checksum: checksum)
    }

    #else

    @Published var rememberLastComponent = false

    init(checksum _: String) {}

    func rememberedComponentIndex() -> Int? {
        nil
    }

    func recordSelection(at _: Int) {}

    #endif

    func replaceComponents(_ newComponents: [Component], enabled: Bool) {
        components = newComponents
        componentsEnabled = enabled
    }

    func setComponentsEnabled(_ enabled: Bool) {
        componentsEnabled = enabled
    }
}
