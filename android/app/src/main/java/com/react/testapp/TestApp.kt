package com.react.testapp

import android.app.Application
import com.facebook.react.ReactApplication
import com.react.testapp.di.DaggerTestAppComponent
import com.react.testapp.react.TestAppReactNativeHost
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

        val testAppComponent = DaggerTestAppComponent.builder()
            .binds(this)
            .build()

        testAppComponent.inject(this)

        reactNativeHostInternal.init()
    }

    override fun androidInjector(): AndroidInjector<Any> = dispatchingAndroidInjector

    override fun getReactNativeHost() = reactNativeHostInternal
}
