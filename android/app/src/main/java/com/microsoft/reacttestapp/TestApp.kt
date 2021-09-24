package com.microsoft.reacttestapp

import android.app.Application
import android.content.Context
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.microsoft.reacttestapp.manifest.ManifestProvider
import com.microsoft.reacttestapp.react.ReactBundleNameProvider
import com.microsoft.reacttestapp.react.TestAppReactNativeHost
import com.microsoft.reacttestapp.support.ReactTestAppLifecycleEvents

val Context.testApp: TestApp
    get() = applicationContext as TestApp

class TestApp : Application(), ReactApplication {
    private lateinit var manifestProviderInternal: ManifestProvider
    private lateinit var reactNativeBundleNameProvider: ReactBundleNameProvider
    private lateinit var reactNativeHostInternal: TestAppReactNativeHost

    override fun onCreate() {
        super.onCreate()

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
            },
        )
    }

    val bundleNameProvider: ReactBundleNameProvider
        get() = reactNativeBundleNameProvider

    val manifestProvider: ManifestProvider
        get() = manifestProviderInternal

    override fun getReactNativeHost() = reactNativeHostInternal
}
