package com.microsoft.reacttestapp.component

import android.os.Bundle

data class ComponentViewModel(
    val name: String,
    val displayName: String,
    val initialProperties: Bundle?,
    val presentationStyle: String?
)
