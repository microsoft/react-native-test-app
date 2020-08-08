//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

package com.react.testapp.react

import com.facebook.react.bridge.*

fun Map<*, *>.toReadableMap(): ReadableMap {
    return Arguments.createMap().also { map ->
        for ((k, v) in this) {
            map.putValue(k as String, v)
        }
    }
}

private fun WritableArray.pushValue(value: Any?) {
    when (value) {
        null -> pushNull()
        is Boolean -> pushBoolean(value)
        is Double -> pushDouble(value)
        is String -> pushString(value)
        is ArrayList<*> -> pushArray(toReadableArray(value))
        else -> {
            pushMap(toReadableMap(value))
        }
    }
}

private fun WritableMap.putValue(key: String, value: Any?) {
    when (value) {
        null -> putNull(key)
        is Boolean -> putBoolean(key, value)
        is Double -> putDouble(key, value)
        is String -> putString(key, value)
        is ArrayList<*> -> putArray(key, toReadableArray(value))
        else -> {
            putMap(key, toReadableMap(value))
        }
    }
}

private fun toReadableArray(list: ArrayList<*>): ReadableArray {
    return Arguments.createArray().also { array ->
        list.forEach { array.pushValue(it) }
    }
}

private fun toReadableMap(obj: Any): ReadableMap {
    val map = obj as? Map<*, *> ?: throw NotImplementedError(
        "Encountered unknown type while parsing manifest: ${obj::class.qualifiedName}"
    )
    return map.toReadableMap()
}
