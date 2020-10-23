//
// Copyright (c) Microsoft Corporation. All rights reserved.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

import Cocoa

final class ViewController: NSViewController {

    override func viewDidLoad() {
        super.viewDidLoad()

        view.wantsLayer = true
        guard let layer = view.layer,
              let reactMenuImage = NSImage(named: "ReactMenu") else {
            return
        }

        layer.contents = reactMenuImage
        layer.contentsGravity = .center
    }

    override var representedObject: Any? {
        didSet {
        // Update the view, if already loaded.
        }
    }

}
