package com.react.testapp.manifest

import com.squareup.moshi.JsonAdapter
import com.squareup.moshi.Moshi
import dagger.Module
import dagger.Provides
import javax.inject.Singleton

@Module
class ManifestModule {

    @Provides
    @Singleton
    fun providesMoshi(): Moshi = Moshi.Builder().build()

    @Provides
    @Singleton
    fun providesManifestMoshiAdapter(moshi: Moshi): JsonAdapter<Manifest> =
        ManifestJsonAdapter(moshi)
}
