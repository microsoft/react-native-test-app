import AVFoundation
import Foundation
import UIKit

final class QRCodeScannerViewController: UIViewController, AVCaptureMetadataOutputObjectsDelegate {
    private lazy var captureSession = AVCaptureSession()
    private lazy var previewLayer = AVCaptureVideoPreviewLayer(session: captureSession)
    private lazy var feedback = UINotificationFeedbackGenerator()

    // MARK: - UIViewController overrides

    override func viewWillTransition(to size: CGSize, with _: UIViewControllerTransitionCoordinator) {
        previewLayer.frame.size = size

        if let captureConnection = previewLayer.connection,
           captureConnection.isVideoOrientationSupported
        {
            captureConnection.videoOrientation = UIDevice.current.videoOrientation
        }
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        view.backgroundColor = .black

        guard let videoCaptureDevice = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
              let videoInput = try? AVCaptureDeviceInput(device: videoCaptureDevice),
              captureSession.canAddInput(videoInput)
        else {
            return
        }

        captureSession.addInput(videoInput)

        let metadataOutput = AVCaptureMetadataOutput()
        guard captureSession.canAddOutput(metadataOutput) else {
            fatalError()
        }

        captureSession.addOutput(metadataOutput)
        metadataOutput.setMetadataObjectsDelegate(self, queue: DispatchQueue.main)
        metadataOutput.metadataObjectTypes = [.qr]

        previewLayer.frame = view.layer.bounds
        previewLayer.videoGravity = .resizeAspectFill
        view.layer.addSublayer(previewLayer)
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)

        if captureSession.isRunnable {
            captureSession.startRunning()
            feedback.prepare()
        } else {
            let alert = UIAlertController(
                title: "Cannot Start Scanner",
                message: """
                This device does not support scanning QR codes. Please use \
                another device with a camera.
                """,
                preferredStyle: .alert
            )
            alert.addAction(UIAlertAction(title: "OK", style: .default) { [weak self] _ in
                self?.dismiss(animated: true)
            })
            present(alert, animated: true)
        }
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)

        if captureSession.isRunning {
            captureSession.stopRunning()
        }
    }

    override var prefersStatusBarHidden: Bool {
        true
    }

    // MARK: - AVCaptureMetadataOutputObjectsDelegate details

    func metadataOutput(_: AVCaptureMetadataOutput,
                        didOutput metadataObjects: [AVMetadataObject],
                        from _: AVCaptureConnection)
    {
        captureSession.stopRunning()
        defer {
            dismiss(animated: true)
        }

        if let metadataObject = metadataObjects.first {
            guard let readableObject = metadataObject as? AVMetadataMachineReadableCodeObject,
                  let stringValue = readableObject.stringValue,
                  let urlComponents = URLComponents(string: stringValue)
            else {
                feedback.notificationOccurred(.error)
                return
            }

            feedback.notificationOccurred(.success)

            NotificationCenter.default.post(
                name: .didReceiveRemoteBundleURL,
                object: self,
                userInfo: ["url": urlComponents]
            )
        }
    }
}

// MARK: - Extensions

extension AVCaptureSession {
    var isRunnable: Bool {
        !inputs.isEmpty && !outputs.isEmpty && !isRunning
    }
}

extension Notification.Name {
    static let didReceiveRemoteBundleURL = Notification.Name("didReceiveRemoteBundleURL")
}

extension UIDevice {
    var videoOrientation: AVCaptureVideoOrientation {
        switch orientation {
        case .unknown:
            return .portrait
        case .portrait:
            return .portrait
        case .portraitUpsideDown:
            return .portraitUpsideDown
        case .landscapeLeft:
            // Flipped otherwise the picture is upside down
            return .landscapeRight
        case .landscapeRight:
            // Flipped otherwise the picture is upside down
            return .landscapeLeft
        case .faceUp, .faceDown:
            return .portrait
        @unknown default:
            return .portrait
        }
    }
}
