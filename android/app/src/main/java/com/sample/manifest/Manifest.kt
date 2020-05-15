package com.sample.manifest

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class Manifest(
    val name: String,
    val displayName: String,
    val components: List<Component>
)

@JsonClass(generateAdapter = true)
data class Component(
    val appKey: String,
    val displayName: String?,
    val initialProperties: Map<String, String?>?
)
