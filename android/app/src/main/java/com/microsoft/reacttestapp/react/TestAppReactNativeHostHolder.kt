package com.microsoft.reacttestapp.react

import android.app.Activity
import android.app.Application
import android.content.Context
import android.net.Uri
import com.facebook.react.PackageList
import com.facebook.react.devsupport.DevInternalSettings
import com.facebook.react.devsupport.DevServerHelper
import com.facebook.react.devsupport.InspectorPackagerConnection.BundleStatus
import com.facebook.react.devsupport.interfaces.DevOptionHandler
import com.facebook.react.packagerconnection.PackagerConnectionSettings
import com.microsoft.reactnativehost.ReactNativeHost
import com.microsoft.reactnativehost.compat.ReactInstanceEventListener
import com.microsoft.reacttestapp.BuildConfig
import com.microsoft.reacttestapp.R
import java.util.Collections.synchronizedList
import java.util.concurrent.CountDownLatch

sealed class BundleSource {
    enum class Action {
        RESTART, RELOAD
    }

    abstract fun moveTo(to: BundleSource): Action

    object Disk : BundleSource() {
        override fun moveTo(to: BundleSource) = Action.RESTART
    }

    object Server : BundleSource() {
        override fun moveTo(to: BundleSource): Action {
            return when (to) {
                Disk -> Action.RESTART
                Server -> Action.RELOAD
            }
        }
    }
}

class TestAppReactNativeHostHolder(
    private val application: Application,
    private val reactBundleNameProvider: ReactBundleNameProvider
) {

    var coreReactNativeHost : ReactNativeHost? = null

    var source: BundleSource =
        if (reactBundleNameProvider.bundleName == null || isPackagerRunning(application)) {
            BundleSource.Server
        } else {
            BundleSource.Disk
        }

    var onBundleSourceChanged: ((newSource: BundleSource) -> Unit)? = null

    private val reactInstanceEventListeners =
        synchronizedList<ReactInstanceEventListener>(arrayListOf())

    fun init(beforeReactNativeInit: () -> Unit, afterReactNativeInit: () -> Unit) {
        val reactNativeHostbuilder = ReactNativeHost.Builder()
            .beforeReactNativeInit(beforeReactNativeInit)
            .afterReactNativeInit(afterReactNativeInit)
            .bundleName(reactBundleNameProvider.bundleName ?: "main.android.bundle")
            .isDev(source == BundleSource.Server)
            .application(application)
            .nativeModulePackages(PackageList(application).packages)

        val bundleOption = application.resources.getString(
            if (source == BundleSource.Disk) {
                R.string.load_from_dev_server
            } else {
                R.string.load_embedded_js_bundle
            }
        )

        val customDevOptions = mutableListOf(Pair(bundleOption,
            DevOptionHandler { when (source) {
                BundleSource.Disk -> {
                    val currentActivity = coreReactNativeHost?.reactInstanceManager?.currentReactContext?.currentActivity
                    reload(currentActivity, BundleSource.Server)
                }
                BundleSource.Server -> {
                    val currentActivity = coreReactNativeHost?.reactInstanceManager?.currentReactContext?.currentActivity
                    reload(currentActivity, BundleSource.Disk)
                }
            } }))

        reactNativeHostbuilder.customDevOptions(customDevOptions)
        coreReactNativeHost = reactNativeHostbuilder.build()
    }

    fun reload(activity: Activity?, newSource: BundleSource) {
        if (BuildConfig.DEBUG && coreReactNativeHost != null && !coreReactNativeHost?.hasInstance()!!) {
            error("init() must be called the first time ReactInstanceManager is created")
        }

        val action = source.moveTo(newSource)
        source = newSource

        when (action) {
            BundleSource.Action.RELOAD -> {
                coreReactNativeHost?.reloadFromServer()
            }
            BundleSource.Action.RESTART -> {
                coreReactNativeHost?.restartFromDisk(activity)
            }
        }

        onBundleSourceChanged?.invoke(newSource)
    }

    fun reloadJSFromServer(activity: Activity?, bundleURL: String) {
        val uri = Uri.parse(bundleURL)
        PackagerConnectionSettings(activity).debugServerHost =
            if (uri.port > 0) {
                "${uri.host}:${uri.port}"
            } else {
                uri.host
            }
        reload(activity, BundleSource.Server)
    }

    private fun isPackagerRunning(context: Context): Boolean {
        val latch = CountDownLatch(1)
        var packagerIsRunning = false

        DevServerHelper(
            DevInternalSettings(context) {},
            context.packageName
        ) { BundleStatus() }.isPackagerRunning {
            packagerIsRunning = it
            latch.countDown()
        }
        latch.await()
        return packagerIsRunning
    }
}
