package com.react.testapp.di

import android.app.Application
import com.react.testapp.TestApp
import com.react.testapp.manifest.ManifestModule
import dagger.BindsInstance
import dagger.Component
import dagger.android.AndroidInjectionModule
import javax.inject.Singleton

@Singleton
@Component(
    modules = [
        ManifestModule::class,
        TestAppBindings::class,
        AndroidInjectionModule::class
    ]
)
interface TestAppComponent {
    fun inject(testApp: TestApp)

    @Component.Builder
    interface Builder {

        @BindsInstance
        fun binds(application: Application): Builder

        fun build(): TestAppComponent
    }
}
