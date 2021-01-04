package com.microsoft.reacttestapp.manifest

import android.content.Context
import com.squareup.moshi.JsonAdapter
import java.security.MessageDigest
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ManifestProvider @Inject constructor(
    private val context: Context,
    private val adapter: JsonAdapter<Manifest>
) {
    fun fromResources(): Pair<Manifest, String>? {
        val appIdentifier = context.resources
            .getIdentifier("raw/app", null, context.packageName)

        return if (appIdentifier == 0) {
            null
        } else {
            val json = context.resources
                .openRawResource(appIdentifier)
                .bufferedReader()
                .use { it.readText() }
            val manifest = adapter.fromJson(json)
            return if (manifest == null) null else Pair(manifest, json.checksum("SHA-256"))
        }
    }
}

fun ByteArray.toHex(): String {
    return joinToString("") { "%02x".format(it) }
}

fun String.checksum(algorithm: String): String {
    return MessageDigest.getInstance(algorithm).digest(toByteArray()).toHex()
}
