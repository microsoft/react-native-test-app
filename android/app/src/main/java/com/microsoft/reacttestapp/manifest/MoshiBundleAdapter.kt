package com.microsoft.reacttestapp.manifest

import android.os.Bundle
import com.facebook.react.bridge.Arguments
import com.microsoft.reacttestapp.react.toReadableMap
import com.squareup.moshi.FromJson
import com.squareup.moshi.ToJson

class MoshiBundleAdapter {

    @ToJson
    @Suppress("unused")
    fun toJson(@Suppress("UNUSED_PARAMETER") bundle: Bundle): String {
        throw NotImplementedError()
    }

    @FromJson
    @Suppress("unused")
    fun fromJson(map: Map<String, Any?>): Bundle? {
        return Arguments.toBundle(map.toReadableMap())
    }
}
