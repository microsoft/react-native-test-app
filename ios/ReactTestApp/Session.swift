import Foundation

/// `UserDefaults` can be misused for fingerprinting and developers are now
/// required to provide a reason for using it. This was announced at WWDC 2023
/// (see https://developer.apple.com/videos/play/wwdc2023/10060/?time=457). By
/// excluding unused modules when in single app mode, we also conveniently
/// remove all uses of it.
#if !ENABLE_SINGLE_APP_MODE

enum Session {
    private enum Keys {
        static let checksum = "ManifestChecksum"
        static let rememberLastComponentEnabled = "RememberLastComponent/Enabled"
        static let rememberLastComponentIndex = "RememberLastComponent/Index"
    }

    private static var lastComponentIndex: Int {
        get { UserDefaults.standard.integer(forKey: Keys.rememberLastComponentIndex) }
        set { UserDefaults.standard.set(newValue, forKey: Keys.rememberLastComponentIndex) }
    }

    private static var manifestChecksum: String? {
        get { UserDefaults.standard.string(forKey: Keys.checksum) }
        set { UserDefaults.standard.set(newValue, forKey: Keys.checksum) }
    }

    static var shouldRememberLastComponent: Bool {
        get { UserDefaults.standard.bool(forKey: Keys.rememberLastComponentEnabled) }
        set { UserDefaults.standard.set(newValue, forKey: Keys.rememberLastComponentEnabled) }
    }

    static func lastOpenedComponent(_ checksum: String) -> Int? {
        guard shouldRememberLastComponent, checksum == manifestChecksum else {
            return nil
        }

        return lastComponentIndex
    }

    static func storeComponent(index: Int, checksum: String) {
        lastComponentIndex = index
        manifestChecksum = checksum
    }
}

#endif // !ENABLE_SINGLE_APP_MODE
