package com.microsoft.reacttestapp.react

import android.app.Activity
import android.app.Application
import android.content.Context
import android.net.Uri
import com.facebook.hermes.reactexecutor.HermesExecutorFactory
import com.facebook.react.PackageList
import com.facebook.react.ReactInstanceManager
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.JavaScriptExecutorFactory
import com.facebook.react.bridge.ReactContext
import com.facebook.react.devsupport.interfaces.DevSupportManager
import com.facebook.react.packagerconnection.PackagerConnectionSettings
import com.facebook.soloader.SoLoader
import com.microsoft.reacttestapp.BuildConfig
import com.microsoft.reacttestapp.R
import com.microsoft.reacttestapp.compat.ReactInstanceEventListener
import com.microsoft.reacttestapp.compat.ReactNativeHostCompat
import java.util.Collections.synchronizedList
import java.util.concurrent.CountDownLatch

sealed class BundleSource {
    enum class Action {
        RESTART,
        RELOAD
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

class TestAppReactNativeHost(
    application: Application,
    private val reactBundleNameProvider: ReactBundleNameProvider
) : ReactNativeHostCompat(application) {
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
        if (BuildConfig.DEBUG && hasInstance()) {
            error("init() can only be called once on startup")
        }

        val reactInstanceListener = object : ReactInstanceEventListener {
            override fun onReactContextInitialized(context: ReactContext) {
                afterReactNativeInit()

                // proactively removing the listener to avoid leaking memory
                // and to avoid dupe calls to afterReactNativeInit()
                reactInstanceManager.removeReactInstanceEventListener(this)
            }
        }

        reactInstanceManager.addReactInstanceEventListener(reactInstanceListener)

        beforeReactNativeInit()
        reactInstanceManager.createReactContextInBackground()
    }

    fun addReactInstanceEventListener(listener: ReactInstanceEventListener) {
        reactInstanceEventListeners.add(listener)
        reactInstanceManager.addReactInstanceEventListener(listener)
    }

    fun reload(activity: Activity?, newSource: BundleSource) {
        if (BuildConfig.DEBUG && !hasInstance()) {
            error("init() must be called the first time ReactInstanceManager is created")
        }

        val action = source.moveTo(newSource)
        source = newSource

        when (action) {
            BundleSource.Action.RELOAD -> {
                reactInstanceManager.devSupportManager.handleReloadJS()
            }
            BundleSource.Action.RESTART -> {
                clear()

                reactInstanceManager.run {
                    createReactContextInBackground()
                    if (activity != null) {
                        onHostResume(activity)
                    }
                }
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

    override fun createReactInstanceManager(): ReactInstanceManager {
        val reactInstanceManager = super.createReactInstanceManager()
        addCustomDevOptions(reactInstanceManager.devSupportManager)

        synchronized(reactInstanceEventListeners) {
            val i = reactInstanceEventListeners.iterator()
            while (i.hasNext()) {
                reactInstanceManager.addReactInstanceEventListener(i.next())
            }
        }

        return reactInstanceManager
    }

    override fun getJavaScriptExecutorFactory(): JavaScriptExecutorFactory {
        SoLoader.init(application, false)
        return HermesExecutorFactory()
    }

    override fun getJSMainModuleName() = "index"

    // We may not always have (or need) a JS bundle, but
    // `ReactNativeHost.createReactInstanceManager` asserts it so we need to
    // return something.
    override fun getBundleAssetName() = reactBundleNameProvider.bundleName ?: "main.android.bundle"

    override fun getUseDeveloperSupport() = source == BundleSource.Server

    override fun getPackages(): List<ReactPackage> = PackageList(application).packages

    private fun addCustomDevOptions(devSupportManager: DevSupportManager) {
        val bundleOption = application.resources.getString(
            if (source == BundleSource.Disk) {
                R.string.load_from_dev_server
            } else {
                R.string.load_embedded_js_bundle
            }
        )
        devSupportManager.addCustomDevOption(bundleOption) {
            when (source) {
                BundleSource.Disk -> {
                    val currentActivity = reactInstanceManager.currentReactContext?.currentActivity
                    reload(currentActivity, BundleSource.Server)
                }
                BundleSource.Server -> {
                    val currentActivity = reactInstanceManager.currentReactContext?.currentActivity
                    reload(currentActivity, BundleSource.Disk)
                }
            }
        }
    }

    private fun isPackagerRunning(context: Context): Boolean {
        if (!hasInstance()) {
            // Return early otherwise we will get in an initialization loop.
            // `source` may be initialized by calling this function. Without
            // this check, the `getReactInstanceManager()` call below will
            // instantiate `ReactInstanceManager`, which in turn will try to
            // access `source`.
            return BuildConfig.DEBUG
        }

        val latch = CountDownLatch(1)
        var packagerIsRunning = false

        val devSettings = reactInstanceManager.devSupportManager.devSettings
        createDevServerHelper(context, devSettings).isPackagerRunning {
            packagerIsRunning = it
            latch.countDown()
        }

        latch.await()
        return packagerIsRunning
    }
}
