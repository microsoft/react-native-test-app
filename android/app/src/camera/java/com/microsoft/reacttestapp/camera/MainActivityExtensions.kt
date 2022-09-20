package com.microsoft.reacttestapp.camera

import android.Manifest
import android.content.DialogInterface
import android.content.pm.PackageManager
import androidx.appcompat.app.AlertDialog
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.google.android.material.snackbar.Snackbar
import com.microsoft.reacttestapp.MainActivity
import com.microsoft.reacttestapp.R

fun MainActivity.canUseCamera(): Boolean {
    return ContextCompat.checkSelfPermission(
        this,
        Manifest.permission.CAMERA
    ) == PackageManager.PERMISSION_GRANTED
}

fun MainActivity.scanForQrCode() {
    when {
        canUseCamera() -> {
            val fragment = QRCodeScannerFragment(mainThreadHandler) {
                AlertDialog
                    .Builder(this)
                    .setTitle(R.string.is_this_the_right_url)
                    .setMessage(it)
                    .setPositiveButton(R.string.yes) { _: DialogInterface, _: Int ->
                        reloadJSFromServer(it)
                    }
                    .setNegativeButton(R.string.no) { _: DialogInterface, _: Int ->
                        // Nothing to do
                    }
                    .show()
            }
            fragment.show(supportFragmentManager, QRCodeScannerFragment.TAG)
        }
        shouldShowRequestPermissionRationale(Manifest.permission.CAMERA) -> {
            Snackbar
                .make(
                    findViewById(R.id.recyclerview),
                    R.string.camera_usage_description,
                    Snackbar.LENGTH_LONG
                )
                .setAction(android.R.string.ok) {
                    ActivityCompat.requestPermissions(
                        this,
                        arrayOf(Manifest.permission.CAMERA),
                        MainActivity.REQUEST_CODE_PERMISSIONS
                    )
                }
                .show()
        }
        else -> {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.CAMERA),
                MainActivity.REQUEST_CODE_PERMISSIONS
            )
        }
    }
}
