package com.microsoft.reacttestapp.component

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.ReactRootView
import com.microsoft.reacttestapp.BuildConfig

class ComponentActivityDelegate(activity: ReactActivity, mainComponentName: String?) :
    ReactActivityDelegate(activity, mainComponentName) {

    override fun getLaunchOptions(): Bundle? = plainActivity.intent.extras?.getBundle(
        ComponentActivity.COMPONENT_INITIAL_PROPERTIES
    )

    override fun createRootView(): ReactRootView {
        val rootView = super.createRootView()
        rootView.setIsFabric(BuildConfig.REACTAPP_USE_FABRIC)
        return rootView
    }

    override fun createRootView(bundle: Bundle?): ReactRootView {
        val rootView = super.createRootView(bundle)
        rootView.setIsFabric(BuildConfig.REACTAPP_USE_FABRIC)
        return rootView
    }
}
