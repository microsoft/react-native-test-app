import Cocoa

final class ViewController: NSViewController {
    override func viewDidLoad() {
        super.viewDidLoad()

        view.wantsLayer = true
        guard let layer = view.layer,
              let reactMenuImage = NSImage(named: "ReactMenu")
        else {
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
