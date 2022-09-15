package com.microsoft.reacttestapp.react

import android.app.Activity
import android.app.Application
import android.content.Context
import android.util.Log
import com.facebook.hermes.reactexecutor.HermesExecutor
import com.facebook.hermes.reactexecutor.HermesExecutorFactory
import com.facebook.react.PackageList
import com.facebook.react.ReactInstanceManager
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.JSIModulePackage
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.ReactMarker
import com.facebook.react.bridge.ReactMarkerConstants
import com.facebook.react.common.LifecycleState
import com.facebook.react.devsupport.DevInternalSettings
import com.facebook.react.devsupport.DevServerHelper
import com.facebook.react.devsupport.InspectorPackagerConnection.BundleStatus
import com.facebook.react.devsupport.interfaces.DevSupportManager
import com.facebook.react.modules.systeminfo.ReactNativeVersion
import com.facebook.soloader.SoLoader
import com.microsoft.reacttestapp.BuildConfig
import com.microsoft.reacttestapp.R
import com.microsoft.reacttestapp.compat.ReactInstanceEventListener
import com.microsoft.reacttestapp.compat.ReactNativeHostCompat
import com.microsoft.reacttestapp.fabric.FabricJSIModulePackage
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

    fun init(beforeReactNativeInit: () -> Unit, afterReactNativeInit: () -> Unit) {
        if (BuildConfig.DEBUG && hasInstance()) {
            error("init() can only be called once on startup")
        }

        val reactInstanceListener = object : ReactInstanceEventListener {
            override fun onReactContextInitialized(context: ReactContext?) {
                afterReactNativeInit()

                // proactively removing the listener to avoid leaking memory
                // and to avoid dupe calls to afterReactNativeInit()
                reactInstanceManager.removeReactInstanceEventListener(this)
            }
        }

        reactInstanceManager.addReactInstanceEventListener(reactInstanceListener)

        beforeReactNativeInit()
        SoLoader.init(application, false)
        reactInstanceManager.createReactContextInBackground()

        if (BuildConfig.DEBUG) {
            try {
                Class.forName("com.microsoft.reacttestapp.ReactNativeFlipper")
                    .getMethod("initialize", Context::class.java, ReactInstanceManager::class.java)
                    .invoke(null, application, reactInstanceManager)
            } catch (e: ClassNotFoundException) {
                val flipperVersion = BuildConfig.ReactTestApp_recommendedFlipperVersion
                if (flipperVersion != "0") {
                    val major = ReactNativeVersion.VERSION["major"] as Int
                    val minor = ReactNativeVersion.VERSION["minor"] as Int
                    Log.i(
                        "ReactTestApp",
                        "To use Flipper, define `FLIPPER_VERSION` in your `gradle.properties`. " +
                            "Since you're using React Native $major.$minor, we recommend setting " +
                            "`FLIPPER_VERSION=$flipperVersion`."
                    )
                }
            }
        }
    }

    fun addReactInstanceEventListener(listener: (ReactContext) -> Unit) {
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

    override fun createReactInstanceManager(): ReactInstanceManager {
        ReactMarker.logMarker(ReactMarkerConstants.BUILD_REACT_INSTANCE_MANAGER_START)
        val reactInstanceManager = ReactInstanceManager.builder()
            .setApplication(application)
            .setJavaScriptExecutorFactory(javaScriptExecutorFactory)
            .setBundleAssetName(bundleAssetName)
            .setJSMainModulePath(jsMainModuleName)
            .addPackages(packages)
            .setUseDeveloperSupport(useDeveloperSupport)
            .setInitialLifecycleState(LifecycleState.BEFORE_CREATE)
            .setUIImplementationProvider(uiImplementationProvider)
            .setRedBoxHandler(redBoxHandler)
            .setJSIModulesPackage(jsiModulePackage)
            .build()
        ReactMarker.logMarker(ReactMarkerConstants.BUILD_REACT_INSTANCE_MANAGER_END)
        addCustomDevOptions(reactInstanceManager.devSupportManager)
        return reactInstanceManager
    }

    override fun getJavaScriptExecutorFactory(): JavaScriptExecutorFactory {
        SoLoader.init(application, false)
        HermesExecutor.loadLibrary()
        return HermesExecutorFactory()
    }

    override fun getJSIModulePackage(): JSIModulePackage? {
        return if (BuildConfig.ReactTestApp_useFabric) {
            FabricJSIModulePackage(this)
        } else {
            null
        }
    }

    override fun getJSMainModuleName() = "index"

    override fun getBundleAssetName() =
        if (source == BundleSource.Disk) reactBundleNameProvider.bundleName else null

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
