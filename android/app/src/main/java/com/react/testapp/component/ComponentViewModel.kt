//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

package com.react.testapp.component

import android.os.Bundle

data class ComponentViewModel(
    val name: String,
    val displayName: String,
    val initialProperties: Bundle?
)
