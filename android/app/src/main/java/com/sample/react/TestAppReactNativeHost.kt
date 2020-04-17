package com.sample.react

import android.app.Activity
import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactInstanceManager
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.ReactMarker
import com.facebook.react.bridge.ReactMarkerConstants
import com.facebook.react.common.LifecycleState
import com.facebook.soloader.SoLoader
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
    var source: BundleSource = reactBundleNameProvider.bundleName
        ?.let { BundleSource.Disk } ?: BundleSource.Server

    fun reload(activity: Activity, newSource: BundleSource) {
        assert(hasInstance()) {
            "init() must be called the first time ReactInstanceManager is created"
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
                    onHostResume(activity)
                }
            }
        }
    }

    fun init() {
        assert(!hasInstance()) { "init() can only be called once on startup" }

        SoLoader.init(application, false)
        reactInstanceManager.createReactContextInBackground()
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
        return reactInstanceManager
    }

    override fun getJSMainModuleName() = "index"

    override fun getBundleAssetName() =
        if (source == BundleSource.Disk) reactBundleNameProvider.bundleName else null

    override fun getUseDeveloperSupport() = source == BundleSource.Server

    override fun getPackages(): List<ReactPackage> = PackageList(application).packages
}
