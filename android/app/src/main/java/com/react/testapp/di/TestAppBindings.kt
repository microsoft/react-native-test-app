package com.react.testapp.di

import android.app.Application
import android.content.Context
import com.react.testapp.MainActivity
import dagger.Binds
import dagger.Module
import dagger.android.ContributesAndroidInjector

@Module
abstract class TestAppBindings {

    @Binds
    abstract fun bindsContext(application: Application): Context

    @ActivityScope
    @ContributesAndroidInjector
    abstract fun contributeMainActivityInjector(): MainActivity
}
