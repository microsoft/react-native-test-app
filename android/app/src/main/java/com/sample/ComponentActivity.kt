package com.sample

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.modules.core.DefaultHardwareBackBtnHandler
import com.facebook.soloader.SoLoader

class ComponentActivity : ReactActivity(), DefaultHardwareBackBtnHandler {
    companion object {
        private const val COMPONENT_NAME = "extra:componentName";

        fun newIntent(activity: Activity, componentName: String): Intent {
            return Intent(activity, ComponentActivity::class.java).apply {
                putExtra(COMPONENT_NAME, componentName)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        SoLoader.init(this, false)

        val componentName = intent.getStringExtra(COMPONENT_NAME)
        loadApp(componentName)
    }
}
