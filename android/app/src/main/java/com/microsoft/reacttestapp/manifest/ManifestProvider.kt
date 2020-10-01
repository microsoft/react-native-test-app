package com.microsoft.reacttestapp.manifest

import android.content.Context
import com.squareup.moshi.JsonAdapter
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ManifestProvider @Inject constructor(
    private val context: Context,
    private val adapter: JsonAdapter<Manifest>
) {
    val manifest: Manifest? by lazy {
        val appIdentifier = context.resources
            .getIdentifier("raw/app", null, context.packageName)

        if (appIdentifier != 0) {
            val manifest = context.resources
                .openRawResource(appIdentifier)
                .bufferedReader()
                .use { it.readText() }
            adapter.fromJson(manifest)
        } else null
    }
}
