package com.sample.manifest

import com.squareup.moshi.JsonClass

typealias Components = Map<String, Component>

@JsonClass(generateAdapter = true)
data class Manifest(
    val name: String,
    val displayName: String,
    val components: Components
)

@JsonClass(generateAdapter = true)
data class Component(val displayName: String)
