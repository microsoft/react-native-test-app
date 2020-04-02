package com.sample.react

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TestAppReactNativeHost @Inject constructor(
    application: Application,
    private val reactBundleNameProvider: ReactBundleNameProvider
) : ReactNativeHost(application) {

    override fun getBundleAssetName() =
        reactBundleNameProvider.bundleName ?: super.getBundleAssetName()

    override fun getUseDeveloperSupport() = reactBundleNameProvider.bundleName == null

    override fun getPackages(): List<ReactPackage> = PackageList(application).packages
}
