package com.sample.react

import android.content.Context
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ReactBundleNameProvider @Inject constructor(private val context: Context) {
    val bundleName: String? by lazy {
        val possibleEntryFiles = listOf(
            "index.android",
            "main.android",
            "index.mobile",
            "main.mobile",
            "index.native",
            "main.native",
            "index",
            "main"
        ).map { "$it.jsbundle" }

        context.resources.assets.list("")
            ?.firstOrNull { possibleEntryFiles.contains(it) }
    }
}
