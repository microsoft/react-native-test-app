package com.microsoft.reacttestapp.compat

import android.app.Application
import com.facebook.react.ReactNativeHost
import com.microsoft.reacttestapp.turbomodule.TurboModuleManagerDelegate

abstract class ReactNativeHostCompat(application: Application) : ReactNativeHost(application) {
    override fun getReactPackageTurboModuleManagerDelegateBuilder() =
        TurboModuleManagerDelegate.Builder()
}
