import AVFoundation
import Combine
import UIKit

#if !ENABLE_SINGLE_APP_MODE

private struct NavigationLink {
    let title: String
    let action: (() -> Void)?
    let accessoryView: UIView?

    init(title: String, action: @escaping () -> Void) {
        self.title = title
        self.action = action
        accessoryView = nil
    }

    init(title: String, accessoryView: UIView) {
        self.title = title
        action = nil
        self.accessoryView = accessoryView
    }
}

private struct SectionData {
    var items: [NavigationLink]
    let footer: String?
}

final class ContentViewController: UITableViewController {
    private enum Section {
        static let components = 0
        static let settings = 1
    }

    private var isVisible: Bool {
        self == navigationController?.visibleViewController
    }

    private let appModel: AppModel
    private var sections: [SectionData]
    private var cancellables: Set<AnyCancellable> = []
    private weak var rememberLastComponentSwitch: UISwitch?

    init(reactInstance: ReactInstance) {
        appModel = AppModel(reactInstance: reactInstance)
        sections = []

        super.init(style: .grouped)
    }

    @available(*, unavailable)
    required init?(coder _: NSCoder) {
        fatalError("\(#function) has not been implemented")
    }

    // MARK: - UIResponder overrides

    override func motionEnded(_: UIEvent.EventSubtype, with event: UIEvent?) {
        guard event?.subtype == .motionShake, let host = appModel.reactInstance.host else {
            return
        }

        host.using(module: RCTDevSettings.self) { settings in
            let settings = settings as? RCTDevSettings
            guard settings?.isShakeToShowDevMenuEnabled == true else {
                return
            }

            host.using(module: RCTDevMenu.self) { devMenu in
                let devMenu = devMenu as? RCTDevMenu
                devMenu?.show()
            }
        }
    }

    // MARK: - UIViewController overrides

    override func viewDidLoad() {
        super.viewDidLoad()

        title = Manifest.load().displayName

        #if os(iOS)
        navigationItem.rightBarButtonItem = UIBarButtonItem(
            image: UIImage(systemName: "qrcode.viewfinder"),
            style: .plain,
            target: self,
            action: #selector(scanForQRCode)
        )
        #endif

        appModel.presenter = self
        appModel.initialize()
        buildInitialSections()

        appModel.picker.$components
            .dropFirst()
            .receive(on: DispatchQueue.main)
            .sink { [weak self] components in
                self?.onComponentsRegistered(components)
            }
            .store(in: &cancellables)

        #if os(iOS)
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(scanForQRCode),
            name: ReactInstance.scanForQRCodeNotification,
            object: nil
        )
        #endif
    }

    // MARK: - UITableViewDelegate overrides

    override func tableView(_: UITableView, shouldHighlightRowAt indexPath: IndexPath) -> Bool {
        indexPath.section == Section.components
    }

    override func tableView(_: UITableView, didSelectRowAt indexPath: IndexPath) {
        sections[indexPath.section].items[indexPath.row].action?()
    }

    // MARK: - UITableViewDataSource overrides

    override func tableView(_: UITableView, numberOfRowsInSection section: Int) -> Int {
        sections[section].items.count
    }

    override func tableView(_: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let link = sections[indexPath.section].items[indexPath.row]
        let cell = UITableViewCell(style: .default, reuseIdentifier: "cell")

        if let textLabel = cell.textLabel {
            textLabel.text = link.title
            textLabel.textColor = .label
            textLabel.allowsDefaultTighteningForTruncation = true
            textLabel.numberOfLines = 1
        }

        switch indexPath.section {
        case Section.components:
            cell.accessoryType = .disclosureIndicator
            cell.accessoryView = nil
        case Section.settings:
            cell.accessoryType = .none
            cell.accessoryView = link.accessoryView
        default:
            assertionFailure()
        }

        return cell
    }

    override func numberOfSections(in _: UITableView) -> Int {
        sections.count
    }

    override func tableView(_: UITableView, titleForFooterInSection section: Int) -> String? {
        sections[section].footer
    }

    // MARK: - Private

    private func navigate(to component: Component) {
        guard let host = appModel.reactInstance.host, let navigationController else {
            return
        }

        let viewController: UIViewController = {
            if let viewController = RTAViewControllerFromString(component.appKey, host) {
                return viewController
            }

            let viewController = UIViewController(nibName: nil, bundle: nil)
            viewController.view = host.view(
                moduleName: component.appKey,
                initialProperties: component.initialProperties
            )
            viewController.view.backgroundColor = UIColor.systemBackground
            return viewController
        }()

        switch component.presentationStyle {
        case "modal":
            present(viewController, animated: true, completion: nil)
        default:
            navigationController.pushViewController(viewController, animated: true)
        }
    }

    private func componentLinks(for components: [Component]) -> [NavigationLink] {
        components.enumerated().map { index, component in
            NavigationLink(title: component.displayName ?? component.appKey) { [weak self] in
                self?.appModel.selectComponent(component, at: index)
            }
        }
    }

    private func buildInitialSections() {
        #if targetEnvironment(simulator)
        let keyboardShortcut = " (⌃⌘Z)"
        #else
        let keyboardShortcut = ""
        #endif
        sections.append(SectionData(
            items: componentLinks(for: appModel.picker.components),
            footer: "\(runtimeInfo())\n\nShake your device\(keyboardShortcut) to open the React Native debug menu."
        ))

        let rememberLastComponentSwitch = UISwitch()
        rememberLastComponentSwitch.isOn = appModel.picker.rememberLastComponent
        rememberLastComponentSwitch.addTarget(
            self,
            action: #selector(rememberLastComponentSwitchDidChangeValue(_:)),
            for: .valueChanged
        )
        self.rememberLastComponentSwitch = rememberLastComponentSwitch
        sections.append(SectionData(
            items: [
                NavigationLink(
                    title: "Remember Last Opened Component",
                    accessoryView: rememberLastComponentSwitch
                ),
            ],
            footer: nil
        ))

        appModel.picker.$rememberLastComponent
            .receive(on: DispatchQueue.main)
            .sink { [weak self] isOn in
                self?.rememberLastComponentSwitch?.setOn(isOn, animated: false)
            }
            .store(in: &cancellables)
    }

    private func onComponentsRegistered(_ components: [Component]) {
        sections[Section.components].items = componentLinks(for: components)
        tableView.reloadSections(IndexSet(integer: Section.components), with: .automatic)
    }

    @objc
    private func rememberLastComponentSwitchDidChangeValue(_ sender: UISwitch) {
        appModel.picker.rememberLastComponent = sender.isOn
    }

    private func runtimeInfo() -> String {
        let version: String = {
            guard let version = RCTGetReactNativeVersion() else {
                return "0"
            }

            let major = version[RCTVersionMajor] ?? "0"
            let minor = version[RCTVersionMinor] ?? "0"
            let patch = version[RCTVersionPatch] ?? "0"
            return "\(major).\(minor).\(patch)"
        }()
        #if USE_FABRIC
        let fabric = " (Fabric)"
        #else
        let fabric = ""
        #endif
        return "React Native version: \(version)\(fabric)"
    }
}

// MARK: - ComponentPresenting

extension ContentViewController: ComponentPresenting {
    func present(_ component: Component) {
        navigate(to: component)
    }

    var shouldAutoPresentRegisteredComponent: Bool {
        isVisible
    }
}

#if os(iOS)
extension ContentViewController {
    @objc
    private func scanForQRCode() {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
                if granted {
                    DispatchQueue.main.async {
                        self?.navigationController?.present(QRCodeScannerViewController(), animated: true)
                    }
                }
            }

        case .restricted:
            let alert = UIAlertController(
                title: "Restricted Camera Access",
                message: """
                You've been restricted from using the camera on this device. \
                Without camera access, this feature won't work. Please contact \
                the device owner so they can give you access.
                """,
                preferredStyle: .alert
            )
            alert.addAction(UIAlertAction(title: "OK", style: .default, handler: nil))
            navigationController?.present(alert, animated: true)

        case .denied:
            let alert = UIAlertController(
                title: "Camera Access Needed",
                message: "To scan QR codes, please enable camera access in Settings.",
                preferredStyle: .alert
            )
            alert.addAction(UIAlertAction(title: "Open Settings", style: .default) { _ in
                UIApplication.shared.open(URL(string: UIApplication.openSettingsURLString)!)
            })
            alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
            navigationController?.present(alert, animated: true)

        case .authorized:
            navigationController?.present(QRCodeScannerViewController(), animated: true)

        @unknown default:
            fatalError()
        }
    }
}
#endif // os(iOS)

#endif // !ENABLE_SINGLE_APP_MODE
