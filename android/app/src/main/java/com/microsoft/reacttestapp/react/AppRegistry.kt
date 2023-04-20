package com.microsoft.reacttestapp.react

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.soloader.SoLoader

/**
 * The corresponding C++ implementation is in `android/app/src/main/jni/AppRegistry.cpp`
 */
class AppRegistry {
    companion object {
        init {
            SoLoader.loadLibrary("reacttestapp_appmodules")
        }

        fun getAppKeys(context: ReactApplicationContext): Array<String> {
            val jsContext = context.javaScriptContextHolder?.get() ?: return arrayOf()
            val appKeys = AppRegistry().getAppKeys(jsContext) ?: return arrayOf()
            return appKeys.filterIsInstance<String>().toTypedArray()
        }
    }

    private external fun getAppKeys(jsiPtr: Long): Array<Any>?
}
