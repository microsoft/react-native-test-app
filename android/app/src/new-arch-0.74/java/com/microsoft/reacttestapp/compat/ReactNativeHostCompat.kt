package com.microsoft.reacttestapp.compat

import android.app.Application
import com.facebook.react.JSEngineResolutionAlgorithm
import com.facebook.react.ReactNativeHost
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UIManagerProvider
import com.facebook.react.fabric.ComponentFactory
import com.facebook.react.fabric.FabricUIManagerProviderImpl
import com.facebook.react.fabric.ReactNativeConfig
import com.facebook.react.uimanager.ViewManagerRegistry
import com.microsoft.reacttestapp.BuildConfig
import com.microsoft.reacttestapp.fabric.ComponentsRegistry
import com.microsoft.reacttestapp.turbomodule.TurboModuleManagerDelegate

abstract class ReactNativeHostCompat(application: Application) : ReactNativeHost(application) {
    override fun getReactPackageTurboModuleManagerDelegateBuilder() =
        TurboModuleManagerDelegate.Builder()

    override fun getUIManagerProvider(): UIManagerProvider? =
        if (BuildConfig.ReactTestApp_useFabric) {
            UIManagerProvider { reactApplicationContext: ReactApplicationContext ->
                val componentFactory = ComponentFactory()

                ComponentsRegistry.register(componentFactory)

                val viewManagers = reactInstanceManager.getOrCreateViewManagers(
                    reactApplicationContext
                )
                val viewManagerRegistry = ViewManagerRegistry(viewManagers)
                FabricUIManagerProviderImpl(
                    componentFactory,
                    ReactNativeConfig.DEFAULT_CONFIG,
                    viewManagerRegistry
                )
                    .createUIManager(reactApplicationContext)
            }
        } else {
            null
        }

    override fun getJSEngineResolutionAlgorithm(): JSEngineResolutionAlgorithm? =
        JSEngineResolutionAlgorithm.HERMES
}
