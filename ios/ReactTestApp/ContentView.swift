//
// Copyright (c) Microsoft Corporation. All rights reserved.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

import QRCodeReader
import UIKit

typealias NavigationLink = (String, () -> Void)

private struct SectionData {
    var items: [NavigationLink]
    let footer: String?
}

final class ContentViewController: UITableViewController {
    private let reactInstance: ReactInstance
    private var sections: [SectionData]

    // swiftlint:disable:next weak_delegate
    private lazy var qrCodeReaderDelegate = QRCodeReaderDelegate()

    public init() {
        reactInstance = ReactInstance()
        sections = []

        super.init(style: .grouped)

        title = "ReactTestApp"

        #if targetEnvironment(simulator)
            let keyboardShortcut = " (⌃⌘Z)"
        #else
            let keyboardShortcut = ""
        #endif
        sections.append(SectionData(
            items: [],
            footer: "\(runtimeInfo())\n\nShake your device\(keyboardShortcut) to open the React Native debug menu."
        ))
    }

    @available(*, unavailable)
    required init?(coder _: NSCoder) {
        fatalError("\(#function) has not been implemented")
    }

    // MARK: - UIViewController overrides

    override public func viewDidLoad() {
        super.viewDidLoad()

        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            self?.reactInstance.initReact { components in
                let items: [NavigationLink] = components.map { component in
                    (component.displayName ?? component.appKey, { self?.navigate(to: component) })
                }
                DispatchQueue.main.async {
                    guard let strongSelf = self else {
                        return
                    }

                    if components.count == 1, let component = components.first {
                        strongSelf.navigate(to: component)
                    }

                    strongSelf.sections[0].items = items
                    strongSelf.tableView.reloadData()
                }
            }
        }

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(scanForQRCode(_:)),
            name: ReactInstance.scanForQRCodeNotification,
            object: nil
        )
    }

    // MARK: - UITableViewDelegate overrides

    override public func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        let (_, action) = sections[indexPath.section].items[indexPath.row]
        action()
        tableView.deselectRow(at: indexPath, animated: true)
    }

    // MARK: - UITableViewDataSource overrides

    override public func tableView(_: UITableView, numberOfRowsInSection section: Int) -> Int {
        sections[section].items.count
    }

    override public func tableView(_: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let (title, _) = sections[indexPath.section].items[indexPath.row]
        let cell = UITableViewCell(style: .default, reuseIdentifier: "cell")
        let presentsNewContent = indexPath.section == 0
        cell.accessoryType = presentsNewContent ? .disclosureIndicator : .none
        if let textLabel = cell.textLabel {
            textLabel.text = title
            textLabel.textColor = presentsNewContent ? .label : .link
            textLabel.allowsDefaultTighteningForTruncation = true
            textLabel.numberOfLines = 1
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
            return viewController
        }()
        navigationController.pushViewController(viewController, animated: true)
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

    @objc private func scanForQRCode(_: Notification) {
        let builder = QRCodeReaderViewControllerBuilder {
            $0.reader = QRCodeReader(
                metadataObjectTypes: [.qr],
                captureDevicePosition: .back
            )
            $0.showSwitchCameraButton = false
            $0.showOverlayView = true
            $0.rectOfInterest = CGRect(x: 0.2, y: 0.3, width: 0.6, height: 0.4)
        }
        let viewController = QRCodeReaderViewController(builder: builder)
        viewController.delegate = qrCodeReaderDelegate
        present(viewController, animated: true)
    }
}
