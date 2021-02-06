package com.microsoft.reacttestapp

import android.content.Context
import android.content.Context.MODE_PRIVATE
import android.content.SharedPreferences
import androidx.core.content.edit

private const val MANIFEST_CHECKSUM = "ManifestChecksum"
private const val REMEMBER_LAST_COMPONENT_ENABLED = "RememberLastComponent/Enabled"
private const val REMEMBER_LAST_COMPONENT_INDEX = "RememberLastComponent/Index"

class Session(context: Context) {

    private val sharedPreferences: SharedPreferences =
        context.getSharedPreferences(BuildConfig.APPLICATION_ID, MODE_PRIVATE)

    private var lastComponentIndex: Int
        get() = sharedPreferences.getInt(REMEMBER_LAST_COMPONENT_INDEX, -1)
        set(index) = sharedPreferences.edit { putInt(REMEMBER_LAST_COMPONENT_INDEX, index) }

    private var manifestChecksum: String?
        get() = sharedPreferences.getString(MANIFEST_CHECKSUM, null)
        set(checksum) = sharedPreferences.edit { putString(MANIFEST_CHECKSUM, checksum) }

    var shouldRememberLastComponent: Boolean
        get() = sharedPreferences.getBoolean(REMEMBER_LAST_COMPONENT_ENABLED, false)
        set(enabled) = sharedPreferences.edit {
            putBoolean(REMEMBER_LAST_COMPONENT_ENABLED, enabled)
        }

    fun lastOpenedComponent(checksum: String): Int? {
        if (!shouldRememberLastComponent || checksum != manifestChecksum) {
            return null
        }

        val index = lastComponentIndex
        return if (index < 0) null else index
    }

    fun storeComponent(index: Int, checksum: String) {
        lastComponentIndex = index
        manifestChecksum = checksum
    }
}
