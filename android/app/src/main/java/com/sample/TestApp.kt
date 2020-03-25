package com.sample

import android.app.Application
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.sample.di.DaggerTestAppComponent
import dagger.android.AndroidInjector
import dagger.android.DispatchingAndroidInjector
import dagger.android.HasAndroidInjector
import javax.inject.Inject

class TestApp : Application(), HasAndroidInjector, ReactApplication {

    @Inject
    lateinit var dispatchingAndroidInjector: DispatchingAndroidInjector<Any>

    @Inject
    lateinit var reactNativeHostInternal: ReactNativeHost

    override fun onCreate() {
        super.onCreate()

        val testAppComponent = DaggerTestAppComponent.builder()
            .binds(this)
            .build()

        testAppComponent.inject(this)
    }

    override fun androidInjector(): AndroidInjector<Any> = dispatchingAndroidInjector

    override fun getReactNativeHost() = reactNativeHostInternal
}
