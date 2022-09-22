package com.microsoft.reacttestapp.camera

import android.os.Bundle
import android.os.Handler
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.camera.core.ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY
import androidx.camera.mlkit.vision.MlKitAnalyzer
import androidx.camera.view.CameraController.COORDINATE_SYSTEM_VIEW_REFERENCED
import androidx.camera.view.LifecycleCameraController
import androidx.camera.view.PreviewView
import androidx.core.util.Consumer
import androidx.fragment.app.DialogFragment
import com.google.mlkit.vision.barcode.BarcodeScanner
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.microsoft.reacttestapp.R
import java.util.concurrent.Executors

class QRCodeScannerFragment(
    private val mainThreadHandler: Handler,
    private val consumer: Consumer<String>
) : DialogFragment() {

    companion object {
        const val TAG = "QRCodeScannerFragment"
    }

    private var barcodeScanner: BarcodeScanner? = null

    private val cameraController by lazy {
        LifecycleCameraController(requireContext())
    }

    private val cameraExecutor by lazy {
        Executors.newSingleThreadExecutor()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val scanner = BarcodeScanning.getClient(
            BarcodeScannerOptions.Builder()
                .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
                .build()
        )

        cameraController.imageCaptureMode = CAPTURE_MODE_MINIMIZE_LATENCY
        cameraController.setImageAnalysisAnalyzer(
            cameraExecutor,
            MlKitAnalyzer(
                listOf(scanner),
                COORDINATE_SYSTEM_VIEW_REFERENCED,
                cameraExecutor
            ) {
                it.getValue(scanner)?.let { barcodes ->
                    for (barcode in barcodes) {
                        when (barcode.valueType) {
                            Barcode.TYPE_URL -> {
                                // Close the scanner otherwise it will keep posting results
                                scanner.close()
                                mainThreadHandler.post {
                                    dismiss()
                                    consumer.accept(barcode.url?.url)
                                }
                            }
                        }
                    }
                }
            }
        )

        barcodeScanner = scanner
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        val view = inflater.inflate(R.layout.camera_view, container, false)
        cameraController.bindToLifecycle(viewLifecycleOwner)

        val previewView = view.findViewById<PreviewView>(R.id.preview_view)
        previewView.controller = cameraController

        return view
    }

    override fun onStart() {
        super.onStart()
        dialog?.window?.setLayout(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        )
    }

    override fun onDestroyView() {
        super.onDestroyView()
        barcodeScanner?.close()
    }
}
