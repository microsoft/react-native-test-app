package com.microsoft.reacttestapp.camera

import android.os.Bundle
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.camera.core.ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY
import androidx.camera.mlkit.vision.MlKitAnalyzer
import androidx.camera.view.CameraController.COORDINATE_SYSTEM_VIEW_REFERENCED
import androidx.camera.view.LifecycleCameraController
import androidx.camera.view.PreviewView
import androidx.core.os.HandlerCompat
import androidx.core.util.Consumer
import androidx.fragment.app.DialogFragment
import com.google.mlkit.vision.barcode.BarcodeScanner
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.microsoft.reacttestapp.R
import java.util.concurrent.Executors

class QRCodeScannerFragment(private val consumer: Consumer<String>) : DialogFragment() {

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

    private lateinit var previewView: PreviewView

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        val view = inflater.inflate(R.layout.camera_view, container, false)
        previewView = view.findViewById(R.id.preview_view)

        val barcodeScanner = BarcodeScanning.getClient(
            BarcodeScannerOptions.Builder()
                .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
                .build()
        )
        cameraController.setImageAnalysisAnalyzer(
            cameraExecutor,
            MlKitAnalyzer(
                listOf(barcodeScanner),
                COORDINATE_SYSTEM_VIEW_REFERENCED,
                cameraExecutor
            ) {
                it.getValue(barcodeScanner)?.let { barcodes ->
                    for (barcode in barcodes) {
                        when (barcode.valueType) {
                            Barcode.TYPE_URL -> {
                                barcodeScanner.close()
                                val handler = HandlerCompat.createAsync(Looper.getMainLooper())
                                handler.post {
                                    this.dismiss()
                                    consumer.accept(barcode.url?.url)
                                }
                                break
                            }
                        }
                    }
                }
            }
        )
        cameraController.imageCaptureMode = CAPTURE_MODE_MINIMIZE_LATENCY
        cameraController.bindToLifecycle(viewLifecycleOwner)
        previewView.controller = cameraController

        this.barcodeScanner = barcodeScanner

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
