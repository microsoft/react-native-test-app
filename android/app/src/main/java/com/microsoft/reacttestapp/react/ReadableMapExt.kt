package com.microsoft.reacttestapp.react

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap

// TODO: Change the return type to `ReadableMap` when RN 0.60 is deprecated
fun Map<*, *>.toReadableMap(): WritableMap {
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

// TODO: Change the return type to `ReadableArray` when RN 0.60 is deprecated
private fun toReadableArray(list: ArrayList<*>): WritableArray {
    return Arguments.createArray().also { array ->
        list.forEach { array.pushValue(it) }
    }
}

// TODO: Change the return type to `ReadableMap` when RN 0.60 is deprecated
private fun toReadableMap(obj: Any): WritableMap {
    val map = obj as? Map<*, *> ?: throw NotImplementedError(
        "Encountered unknown type while parsing manifest: ${obj::class.qualifiedName}"
    )
    return map.toReadableMap()
}
