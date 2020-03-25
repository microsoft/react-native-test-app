package com.sample.manifest

import android.content.Context
import com.sample.R
import com.squareup.moshi.JsonAdapter
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ManifestProvider @Inject constructor(
    private val context: Context,
    private val adapter: JsonAdapter<Manifest>
) {
    val manifest: Manifest? by lazy {
        val appJson = context.resources
            .openRawResource(R.raw.app)
            .bufferedReader()
            .use { it.readText() }

        adapter.fromJson(appJson)
    }
}
