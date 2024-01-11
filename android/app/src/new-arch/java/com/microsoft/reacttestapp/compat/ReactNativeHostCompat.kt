package com.microsoft.reacttestapp.compat

import android.app.Application
import com.facebook.react.ReactInstanceManager
import com.facebook.react.ReactNativeHost
import com.facebook.react.bridge.JSIModulePackage
import com.facebook.react.bridge.JSIModuleProvider
import com.facebook.react.bridge.JSIModuleSpec
import com.facebook.react.bridge.JSIModuleType
import com.facebook.react.bridge.JavaScriptContextHolder
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UIManager
import com.facebook.react.fabric.ComponentFactory
import com.facebook.react.fabric.CoreComponentsRegistry
import com.facebook.react.fabric.EmptyReactNativeConfig
import com.facebook.react.fabric.FabricJSIModuleProvider
import com.facebook.react.uimanager.ViewManagerRegistry
import com.microsoft.reacttestapp.BuildConfig
import com.microsoft.reacttestapp.fabric.ComponentsRegistry
import com.microsoft.reacttestapp.turbomodule.TurboModuleManagerDelegate
import java.lang.ref.WeakReference

abstract class ReactNativeHostCompat(application: Application) : ReactNativeHost(application) {
    override fun getReactPackageTurboModuleManagerDelegateBuilder() =
        TurboModuleManagerDelegate.Builder()

    override fun getJSIModulePackage(): JSIModulePackage? {
        return if (BuildConfig.ReactTestApp_useFabric) {
            object : JSIModulePackage {

                private val reactInstanceManager: ReactInstanceManager?
                    get() = reactNativeHost.get()?.reactInstanceManager

                private val reactNativeHost: WeakReference<ReactNativeHost> =
                    WeakReference(this@ReactNativeHostCompat)

                override fun getJSIModules(
                    reactApplicationContext: ReactApplicationContext,
                    jsContext: JavaScriptContextHolder?
                ): ArrayList<JSIModuleSpec<*>> {
                    return arrayListOf(object : JSIModuleSpec<UIManager?> {
                        override fun getJSIModuleType(): JSIModuleType = JSIModuleType.UIManager

                        override fun getJSIModuleProvider(): JSIModuleProvider<UIManager?> {
                            val componentFactory = ComponentFactory()
                            CoreComponentsRegistry.register(componentFactory)

                            ComponentsRegistry.register(componentFactory)

                            return FabricJSIModuleProvider(
                                reactApplicationContext,
                                componentFactory,
                                EmptyReactNativeConfig(),
                                ViewManagerRegistry(
                                    reactInstanceManager?.getOrCreateViewManagers(
                                        reactApplicationContext
                                    )
                                )
                            )
                        }
                    })
                }
            }
        } else {
            null
        }
    }
}
