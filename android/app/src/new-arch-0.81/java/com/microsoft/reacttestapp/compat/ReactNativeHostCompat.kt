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
            DefaultNewArchitectureEntryPoint.load()
            SoLoader.loadLibrary("reacttestapp_appmodules")
        }
    }

    override val isNewArchEnabled: Boolean = BuildConfig.REACTAPP_USE_FABRIC
}
