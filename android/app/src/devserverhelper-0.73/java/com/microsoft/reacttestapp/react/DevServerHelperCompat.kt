package com.microsoft.reacttestapp.react

import android.content.Context
import com.facebook.react.devsupport.DevServerHelper
import com.facebook.react.devsupport.InspectorPackagerConnection.BundleStatus
import com.facebook.react.modules.debug.interfaces.DeveloperSettings
import com.facebook.react.packagerconnection.PackagerConnectionSettings

fun createDevServerHelper(context: Context, developerSettings: DeveloperSettings): DevServerHelper =
    DevServerHelper(
        developerSettings,
        context.packageName,
        { BundleStatus() },
        PackagerConnectionSettings(context)
    )
