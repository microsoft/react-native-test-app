//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

package com.microsoft.reacttestapp.manifest

import android.os.Bundle
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
    val initialProperties: Bundle?,
    val presentationStyle: String?
)
