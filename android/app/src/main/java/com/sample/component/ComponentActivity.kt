package com.sample.component

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.view.MenuItem
import com.facebook.react.ReactActivity
import com.facebook.react.modules.core.DefaultHardwareBackBtnHandler
import com.facebook.soloader.SoLoader

class ComponentActivity : ReactActivity(), DefaultHardwareBackBtnHandler {
    companion object {
        private const val COMPONENT_NAME = "extra:componentName"
        private const val COMPONENT_DISPLAY_NAME = "extra:componentDisplayName"

        fun newIntent(
            activity: Activity,
            componentName: String,
            componentDisplayName: String
        ): Intent {
            return Intent(activity, ComponentActivity::class.java).apply {
                putExtra(COMPONENT_NAME, componentName)
                putExtra(COMPONENT_DISPLAY_NAME, componentDisplayName)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        SoLoader.init(this, false)

        title = intent.extras?.getString(COMPONENT_DISPLAY_NAME, null)
            ?: throw IllegalArgumentException("Component display name has to be provided.")

        supportActionBar?.setHomeButtonEnabled(true)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)

        val componentName = intent.getStringExtra(COMPONENT_NAME)
        loadApp(componentName)
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        if (android.R.id.home == item.itemId) {
            onBackPressed()
            return true;
        }

        return super.onOptionsItemSelected(item)
    }
}
