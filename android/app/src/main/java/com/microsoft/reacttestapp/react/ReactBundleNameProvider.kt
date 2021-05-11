package com.microsoft.reacttestapp.react

import android.content.Context

class ReactBundleNameProvider(private val context: Context) {
    val bundleName: String? by lazy {
        val entryFileNames = listOf(
            "index.android",
            "main.android",
            "index.mobile",
            "main.mobile",
            "index.native",
            "main.native",
            "index",
            "main"
        )
        val possibleEntryFiles = entryFileNames.map { "$it.jsbundle" } +
            entryFileNames.map { "$it.bundle" }

        context.resources.assets.list("")
            ?.firstOrNull { possibleEntryFiles.contains(it) }
    }
}
