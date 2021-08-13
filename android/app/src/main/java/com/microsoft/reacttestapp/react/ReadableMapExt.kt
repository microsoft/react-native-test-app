package com.microsoft.reacttestapp.react

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap

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
