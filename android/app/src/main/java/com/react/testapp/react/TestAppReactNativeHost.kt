package com.react.testapp.react

import android.app.Activity
import android.app.Application
import android.content.Context
import android.util.Log
import com.facebook.react.PackageList
import com.facebook.react.ReactInstanceManager
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.ReactMarker
import com.facebook.react.bridge.ReactMarkerConstants
import com.facebook.react.common.LifecycleState
import com.facebook.react.devsupport.DevInternalSettings
import com.facebook.react.devsupport.DevServerHelper
import com.facebook.react.devsupport.InspectorPackagerConnection.BundleStatus
import com.facebook.react.devsupport.InspectorPackagerConnection.BundleStatusProvider
import com.facebook.react.devsupport.interfaces.DevSupportManager
import com.facebook.soloader.SoLoader
import com.react.testapp.BuildConfig
import com.react.testapp.R
import java.util.concurrent.CountDownLatch
import javax.inject.Inject
import javax.inject.Singleton

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

@Singleton
class TestAppReactNativeHost @Inject constructor(
    application: Application,
    private val reactBundleNameProvider: ReactBundleNameProvider
) : ReactNativeHost(application) {
    var source: BundleSource =
        if (reactBundleNameProvider.bundleName == null || isPackagerRunning(application)) {
            BundleSource.Server
        } else {
            BundleSource.Disk
        }

    var onBundleSourceChanged: ((newSource: BundleSource) -> Unit)? = null

    fun init() {
        if (BuildConfig.DEBUG && hasInstance()) {
            error("init() can only be called once on startup")
        }

        SoLoader.init(application, false)
        reactInstanceManager.createReactContextInBackground()

        if (BuildConfig.DEBUG) {
            try {
                Class.forName("com.react.testapp.ReactNativeFlipper")
                    .getMethod("initialize", Context::class.java, ReactInstanceManager::class.java)
                    .invoke(null, application, reactInstanceManager)
            } catch (e: ClassNotFoundException) {
                Log.i(
                    "ReactTestApp",
                    "To use Flipper, define `FLIPPER_VERSION` in your `gradle.properties`. "
                        + "If you're using React Native 0.62, you should use `FLIPPER_VERSION=0.33.1`."
                )
            }
        }
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
            context.packageName,
            BundleStatusProvider { BundleStatus() }
        ).isPackagerRunning {
            packagerIsRunning = it
            latch.countDown()
        }
        latch.await()
        return packagerIsRunning
    }
}
