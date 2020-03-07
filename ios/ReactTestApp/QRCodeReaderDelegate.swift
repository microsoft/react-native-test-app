//
// Copyright (c) Microsoft Corporation. All rights reserved.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

import Foundation
import QRCodeReader

final class QRCodeReaderDelegate: QRCodeReaderViewControllerDelegate {
    func reader(_ reader: QRCodeReaderViewController, didScanResult result: QRCodeReaderResult) {
        readerDidCancel(reader)
        NotificationCenter.default.post(
            name: .didReceiveRemoteBundleURL,
            object: self,
            userInfo: ["value": result.value]
        )
    }

    func readerDidCancel(_ reader: QRCodeReaderViewController) {
        reader.stopScanning()
        reader.dismiss(animated: true, completion: nil)
    }
}

extension Notification.Name {
    static let didReceiveRemoteBundleURL = Notification.Name("didReceiveRemoteBundleURL")
}
