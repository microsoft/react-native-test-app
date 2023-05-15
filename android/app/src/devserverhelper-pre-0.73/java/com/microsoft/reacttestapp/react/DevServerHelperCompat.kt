package com.microsoft.reacttestapp.react

import android.content.Context
import com.facebook.react.devsupport.DevInternalSettings
import com.facebook.react.devsupport.DevServerHelper
import com.facebook.react.devsupport.InspectorPackagerConnection.BundleStatus
import com.facebook.react.modules.debug.interfaces.DeveloperSettings

fun createDevServerHelper(
    context: Context,
    @Suppress("UNUSED_PARAMETER") developerSettings: DeveloperSettings
): DevServerHelper {
    return DevServerHelper(
        DevInternalSettings(context) {},
        context.packageName,
        { BundleStatus() }
    )
}
