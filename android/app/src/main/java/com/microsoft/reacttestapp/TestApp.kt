package com.microsoft.reacttestapp

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.microsoft.reacttestapp.di.DaggerTestAppComponent
import com.microsoft.reacttestapp.react.TestAppReactNativeHost
import dagger.android.AndroidInjector
import dagger.android.DispatchingAndroidInjector
import dagger.android.HasAndroidInjector
import javax.inject.Inject

private fun PackageList.invokeLifecycleMethod(name: String) {
    packages.forEach {
        try {
            val methodToFind = it.javaClass.getMethod(name)
            methodToFind.invoke(it)
        } catch (e: NoSuchMethodException) {
        }
    }
}

class TestApp : Application(), HasAndroidInjector, ReactApplication {

    @Inject
    lateinit var dispatchingAndroidInjector: DispatchingAndroidInjector<Any>

    @Inject
    lateinit var reactNativeHostInternal: TestAppReactNativeHost

    override fun onCreate() {
        super.onCreate()

        val packageList = PackageList(this)
        packageList.invokeLifecycleMethod("onAppCreated")

        val testAppComponent = DaggerTestAppComponent.builder()
                .binds(this)
                .build()
        testAppComponent.inject(this)

        packageList.invokeLifecycleMethod("onPreReactNativeInit")
        reactNativeHostInternal.init()
    }

    override fun androidInjector(): AndroidInjector<Any> = dispatchingAndroidInjector

    override fun getReactNativeHost() = reactNativeHostInternal
}
