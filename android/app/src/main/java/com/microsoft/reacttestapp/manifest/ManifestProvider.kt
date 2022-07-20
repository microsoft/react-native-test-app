package com.microsoft.reacttestapp.manifest

import android.content.Context
import com.microsoft.reacttestapp.BuildConfig
import com.squareup.moshi.JsonAdapter
import com.squareup.moshi.Moshi

class ManifestProvider(private val context: Context, private val adapter: JsonAdapter<Manifest>) {

    companion object {
        fun create(context: Context): ManifestProvider {
            val moshi = Moshi.Builder()
                .add(MoshiBundleAdapter())
                .build()

            return ManifestProvider(context, ManifestJsonAdapter(moshi))
        }
    }

    private val manifestAndChecksum: Pair<Manifest, String> by lazy {
        val manifest = adapter.fromJson(BuildConfig.ReactTestApp_appManifest)
            ?: throw IllegalStateException("Could not parse `app.json`")

        Pair(manifest, BuildConfig.ReactTestApp_appManifestChecksum)
    }

    fun fromResources(): Pair<Manifest, String> {
        return manifestAndChecksum
    }
}
