package com.microsoft.reacttestapp.react

import android.content.Context

class ReactBundleNameProvider(private val context: Context, private val bundleRoot: String?) {
    val bundleName: String? by lazy {
        val possibleEntryFiles = getPossibleEntryFiles(bundleRoot)
        context.resources.assets.list("")
            ?.firstOrNull { possibleEntryFiles.contains(it) }
    }

    private fun getPossibleEntryFiles(bundleRoot: String?): List<String> {
        val extensions = listOf(
            ".android.bundle",
            ".android.jsbundle",
            ".mobile.bundle",
            ".mobile.jsbundle",
            ".native.bundle",
            ".native.jsbundle",
            ".bundle",
            ".jsbundle"
        )

        if (bundleRoot == null) {
            val candidates = mutableListOf<String>()
            extensions.forEach {
                candidates.add("index$it")
                candidates.add("main$it")
            }
            return candidates
        }

        return extensions.map { bundleRoot + it }
    }
}
