package com.microsoft.reacttestapp.compat

import android.app.Application
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader
import com.microsoft.reacttestapp.BuildConfig

abstract class ReactNativeHostCompat(application: Application) :
    DefaultReactNativeHost(application) {

    companion object {
        init {
            try {
                DefaultNewArchitectureEntryPoint.load(
                    turboModulesEnabled = BuildConfig.REACTAPP_USE_FABRIC,
                    fabricEnabled = BuildConfig.REACTAPP_USE_FABRIC,
                    bridgelessEnabled = BuildConfig.REACTAPP_USE_BRIDGELESS
                )
            } catch (e: UnsatisfiedLinkError) {
                // Older versions of `DefaultNewArchitectureEntryPoint` is
                // hard coded to load `libappmodules.so`
            }
            SoLoader.loadLibrary("reacttestapp_appmodules")
        }
    }

    override val isNewArchEnabled: Boolean = BuildConfig.REACTAPP_USE_FABRIC
    override val isHermesEnabled: Boolean? = true
}
