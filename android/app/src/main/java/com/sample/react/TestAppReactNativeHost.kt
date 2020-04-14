package com.sample.react

import android.app.Application
import com.facebook.react.*
import com.facebook.react.bridge.ReactMarker
import com.facebook.react.bridge.ReactMarkerConstants
import com.facebook.react.common.LifecycleState
import com.facebook.soloader.SoLoader
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TestAppReactNativeHost @Inject constructor(
        application: Application,
        private val reactBundleNameProvider: ReactBundleNameProvider
) : ReactNativeHost(application) {

    var currentActivity: ReactActivity? = null
    private var useEmbeddedBundle: Boolean = true

    fun reload(useEmbeddedBundle: Boolean) {
        if (hasInstance()) {
            if (!useEmbeddedBundle && useEmbeddedBundle == this.useEmbeddedBundle) {
                reactInstanceManager.devSupportManager.handleReloadJS()
                return
            }
            clear()
        } else {
            SoLoader.init(application, false)
        }

        this.useEmbeddedBundle = useEmbeddedBundle
        reactInstanceManager.createReactContextInBackground()
    }

    override fun createReactInstanceManager(): ReactInstanceManager {
        ReactMarker.logMarker(ReactMarkerConstants.BUILD_REACT_INSTANCE_MANAGER_START)
        val reactInstanceManager = ReactInstanceManager.builder()
                .setApplication(application)
                .setCurrentActivity(currentActivity)
                .setJavaScriptExecutorFactory(javaScriptExecutorFactory)
                .setBundleAssetName(bundleAssetName)
                .setJSMainModulePath(jsMainModuleName)
                .addPackages(packages)
                .setUseDeveloperSupport(useDeveloperSupport && !useEmbeddedBundle)
                .setInitialLifecycleState(LifecycleState.RESUMED)
                .setUIImplementationProvider(uiImplementationProvider)
                .setRedBoxHandler(redBoxHandler)
                .setJSIModulesPackage(jsiModulePackage)
                .build()
        ReactMarker.logMarker(ReactMarkerConstants.BUILD_REACT_INSTANCE_MANAGER_END)
        return reactInstanceManager
    }

    override fun getJSMainModuleName(): String = "index"

    override fun getBundleAssetName(): String? =
            if (useEmbeddedBundle) reactBundleNameProvider.bundleName else null

    override fun getUseDeveloperSupport() = true

    override fun getPackages(): List<ReactPackage> = PackageList(application).packages
}
