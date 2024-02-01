package com.microsoft.reacttestapp.compat

import android.app.Application
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader
import com.microsoft.reacttestapp.BuildConfig

abstract class ReactNativeHostCompat(application: Application) : DefaultReactNativeHost(
    application
) {
    companion object {
        init {
            try {
                DefaultNewArchitectureEntryPoint.load(
                    turboModulesEnabled = BuildConfig.ReactTestApp_useFabric,
                    fabricEnabled = BuildConfig.ReactTestApp_useFabric,
                    bridgelessEnabled = BuildConfig.ReactTestApp_useBridgeless
                )
            } catch (e: UnsatisfiedLinkError) {
                // Older versions of `DefaultNewArchitectureEntryPoint` is
                // hard coded to load `libappmodules.so`
            }
            SoLoader.loadLibrary("reacttestapp_appmodules")
        }
    }

    override val isNewArchEnabled: Boolean = BuildConfig.ReactTestApp_useFabric
    override val isHermesEnabled: Boolean? = true
}
