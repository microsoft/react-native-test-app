//
// Copyright (c) Microsoft Corporation. All rights reserved.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

import AVFoundation
import UIKit

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

    private let reactInstance: ReactInstance
    private var sections: [SectionData]

    public init() {
        reactInstance = ReactInstance()
        sections = []

        super.init(style: .grouped)
    }

    @available(*, unavailable)
    required init?(coder _: NSCoder) {
        fatalError("\(#function) has not been implemented")
    }

    // MARK: - UIViewController overrides

    override public func viewDidLoad() {
        super.viewDidLoad()

        guard let (manifest, checksum) = Manifest.fromFile() else {
            return
        }

        title = manifest.displayName

        let components = manifest.components ?? []
        if components.isEmpty {
            NotificationCenter.default.addObserver(
                forName: .ReactTestAppDidRegisterApps,
                object: nil,
                queue: .main,
                using: { [weak self] note in
                    guard let strongSelf = self,
                          let appKeys = note.userInfo?["appKeys"] as? [String]
                    else {
                        return
                    }

                    let components = appKeys.map { Component(appKey: $0) }
                    strongSelf.onComponentsRegistered(components, checksum: checksum)
                }
            )
        }

        onComponentsRegistered(components, checksum: checksum)

        let bundleRoot = manifest.bundleRoot
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            self?.reactInstance.initReact(bundleRoot: bundleRoot) {
                if !components.isEmpty,
                   let index = components.count == 1 ? 0 : Session.lastOpenedComponent(checksum)
                {
                    DispatchQueue.main.async {
                        self?.navigate(to: components[index])
                    }
                }
            }
        }

        let rememberLastComponentSwitch = UISwitch()
        rememberLastComponentSwitch.isOn = Session.shouldRememberLastComponent
        rememberLastComponentSwitch.addTarget(
            self,
            action: #selector(rememberLastComponentSwitchDidChangeValue(_:)),
            for: .valueChanged
        )
        sections.append(SectionData(
            items: [
                NavigationLink(
                    title: "Remember Last Opened Component",
                    accessoryView: rememberLastComponentSwitch
                ),
            ],
            footer: nil
        ))

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(scanForQRCode(_:)),
            name: ReactInstance.scanForQRCodeNotification,
            object: nil
        )
    }

    // MARK: - UITableViewDelegate overrides

    override public func tableView(_: UITableView, shouldHighlightRowAt indexPath: IndexPath) -> Bool {
        indexPath.section == Section.components
    }

    override public func tableView(_: UITableView, didSelectRowAt indexPath: IndexPath) {
        sections[indexPath.section].items[indexPath.row].action?()
    }

    // MARK: - UITableViewDataSource overrides

    override public func tableView(_: UITableView, numberOfRowsInSection section: Int) -> Int {
        sections[section].items.count
    }

    override public func tableView(_: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
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

    override public func numberOfSections(in _: UITableView) -> Int {
        sections.count
    }

    override public func tableView(_: UITableView, titleForFooterInSection section: Int) -> String? {
        sections[section].footer
    }

    // MARK: - Private

    private func navigate(to component: Component) {
        guard let bridge = reactInstance.bridge,
              let navigationController = navigationController
        else {
            return
        }

        let viewController: UIViewController = {
            if let viewController = RTAViewControllerFromString(component.appKey, bridge) {
                return viewController
            }

            let viewController = UIViewController(nibName: nil, bundle: nil)
            viewController.view = RCTRootView(
                bridge: bridge,
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

    private func onComponentsRegistered(_ components: [Component], checksum: String) {
        let items = components.enumerated().map { index, component in
            NavigationLink(title: component.displayName ?? component.appKey) { [weak self] in
                self?.navigate(to: component)
                Session.storeComponent(index: index, checksum: checksum)
            }
        }

        if sections.isEmpty {
            #if targetEnvironment(simulator)
                let keyboardShortcut = " (⌃⌘Z)"
            #else
                let keyboardShortcut = ""
            #endif
            sections.append(SectionData(
                items: items,
                footer: "\(runtimeInfo())\n\nShake your device\(keyboardShortcut) to open the React Native debug menu."
            ))
        } else {
            sections[0].items = items
            tableView.reloadSections(IndexSet(integer: 0), with: .automatic)

            if components.count == 1, isVisible {
                navigate(to: components[0])
            }
        }
    }

    @objc
    private func rememberLastComponentSwitchDidChangeValue(_ sender: UISwitch) {
        Session.shouldRememberLastComponent = sender.isOn
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
        return "React Native version: \(version)"
    }
}

extension ContentViewController {
    @objc
    private func scanForQRCode(_: Notification) {
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
