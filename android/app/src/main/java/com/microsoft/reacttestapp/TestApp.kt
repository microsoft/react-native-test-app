package com.microsoft.reacttestapp

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.microsoft.reacttestapp.di.DaggerTestAppComponent
import com.microsoft.reacttestapp.react.TestAppReactNativeHost
import com.microsoft.reacttestapp.support.ReactTestAppLifecycleEvents
import dagger.android.AndroidInjector
import dagger.android.DispatchingAndroidInjector
import dagger.android.HasAndroidInjector
import javax.inject.Inject

class TestApp : Application(), HasAndroidInjector, ReactApplication {

    @Inject
    lateinit var dispatchingAndroidInjector: DispatchingAndroidInjector<Any>

    @Inject
    lateinit var reactNativeHostInternal: TestAppReactNativeHost

    override fun onCreate() {
        super.onCreate()

        val eventConsumers = PackageList(this).packages
            .filter { it is ReactTestAppLifecycleEvents }
            .map { it as ReactTestAppLifecycleEvents }

        eventConsumers.forEach { it.onTestAppInitialized() }

        val testAppComponent = DaggerTestAppComponent.builder()
            .binds(this)
            .build()
        testAppComponent.inject(this)

        reactNativeHostInternal.init(
            beforeReactNativeInit = {
                eventConsumers.forEach { it.onTestAppWillInitializeReactNative() }
            },
            afterReactNativeInit = {
                eventConsumers.forEach { it.onTestAppDidInitializeReactNative() }
            },
        )
    }

    override fun androidInjector(): AndroidInjector<Any> = dispatchingAndroidInjector

    override fun getReactNativeHost() = reactNativeHostInternal
}
