package com.microsoft.reacttestapp

import android.app.Activity
import android.app.Application
import android.content.Context
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.soloader.SoLoader
import com.microsoft.reacttestapp.manifest.ManifestProvider
import com.microsoft.reacttestapp.react.ReactBundleNameProvider
import com.microsoft.reacttestapp.react.TestAppReactNativeHost
import com.microsoft.reacttestapp.support.ReactTestAppLifecycleEvents

class TestApp : Application(), ReactApplication {
    val bundleNameProvider: ReactBundleNameProvider
        get() = reactNativeBundleNameProvider

    val manifestProvider: ManifestProvider
        get() = manifestProviderInternal

    private lateinit var manifestProviderInternal: ManifestProvider
    private lateinit var reactNativeBundleNameProvider: ReactBundleNameProvider
    private lateinit var reactNativeHostInternal: TestAppReactNativeHost

    fun reloadJSFromServer(activity: Activity?, bundleURL: String) {
        reactNativeHostInternal.reloadJSFromServer(activity, bundleURL)
    }

    override fun onCreate() {
        super.onCreate()

        // We need to initialize SoLoader early because ManifestProvider may
        // need to use WritableNativeMap when parsing initial properties.
        SoLoader.init(this, false)

        manifestProviderInternal = ManifestProvider.create(this)
        val (manifest, _) = manifestProvider.fromResources()

        reactNativeBundleNameProvider = ReactBundleNameProvider(this, manifest.bundleRoot)
        reactNativeHostInternal =
            TestAppReactNativeHost(this, reactNativeBundleNameProvider)

        val eventConsumers = PackageList(this).packages
            .filter { it is ReactTestAppLifecycleEvents }
            .map { it as ReactTestAppLifecycleEvents }

        eventConsumers.forEach { it.onTestAppInitialized() }

        reactNativeHostInternal.init(
            beforeReactNativeInit = {
                eventConsumers.forEach { it.onTestAppWillInitializeReactNative() }
            },
            afterReactNativeInit = {
                eventConsumers.forEach { it.onTestAppDidInitializeReactNative() }
            }
        )
    }

    override fun getReactNativeHost() = reactNativeHostInternal
}

val Context.testApp: TestApp
    get() = applicationContext as TestApp
