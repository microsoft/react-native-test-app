package com.sample.di

import android.app.Application
import android.content.Context
import com.facebook.react.ReactNativeHost
import com.sample.MainActivity
import com.sample.component.NativeComponentActivity
import com.sample.react.TestAppReactNativeHost
import dagger.Binds
import dagger.Module
import dagger.android.ContributesAndroidInjector

@Module
abstract class TestAppBindings {

    @Binds
    abstract fun bindsContext(application: Application): Context

    @Binds
    abstract fun bindsReactNativeHost(reactNativeHost: TestAppReactNativeHost): ReactNativeHost

    @ActivityScope
    @ContributesAndroidInjector
    abstract fun contributeMainActivityInjector(): MainActivity

    @ActivityScope
    @ContributesAndroidInjector
    abstract fun contributeNativeComponentActivityInjector(): NativeComponentActivity
}
