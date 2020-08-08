//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

package com.react.testapp.component

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.view.MenuItem
import androidx.fragment.app.Fragment
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate

class ComponentActivity : ReactActivity() {

    private inner class ComponentActivityDelegate(
        activity: ReactActivity,
        mainComponentName: String?
    ) : ReactActivityDelegate(activity, mainComponentName) {
        override fun getLaunchOptions(): Bundle? {
            return intent.extras?.getBundle(COMPONENT_INITIAL_PROPERTIES)
        }
    }

    companion object {
        private const val COMPONENT_NAME = "extra:componentName"
        private const val COMPONENT_DISPLAY_NAME = "extra:componentDisplayName"
        private const val COMPONENT_INITIAL_PROPERTIES = "extra:componentInitialProperties"

        fun newIntent(activity: Activity, component: ComponentViewModel): Intent {
            return Intent(activity, ComponentActivity::class.java).apply {
                putExtra(COMPONENT_NAME, component.name)
                putExtra(COMPONENT_DISPLAY_NAME, component.displayName)

                if (component.initialProperties != null) {
                    putExtra(COMPONENT_INITIAL_PROPERTIES, component.initialProperties)
                }
            }
        }
    }

    override fun createReactActivityDelegate(): ReactActivityDelegate {
        return ComponentActivityDelegate(this, mainComponentName)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        supportActionBar?.setHomeButtonEnabled(true)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)

        val componentName = intent.extras?.getString(COMPONENT_NAME, null)
            ?: throw IllegalArgumentException("Class name has to be provided.")
        title = intent.extras?.getString(COMPONENT_DISPLAY_NAME, componentName)

        findClass(componentName)?.let {
            @Suppress("UNCHECKED_CAST")
            val fragmentClass = it as Class<Fragment>
            val fragment = fragmentClass.newInstance()

            if (savedInstanceState == null) {
                supportFragmentManager.beginTransaction()
                    .replace(android.R.id.content, fragment)
                    .commitNow()
            }
        } ?: loadApp(componentName)
    }

    private fun findClass(name: String): Class<*>? {
        return try {
            Class.forName(name)
        } catch (e: ClassNotFoundException) {
            null
        }
    }

    override fun getSystemService(name: String): Any? {
        if (name == "service:reactNativeHostService") {
            return reactNativeHost
        }

        return super.getSystemService(name)
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)

        supportFragmentManager.fragments.forEach {
            it.onActivityResult(requestCode, resultCode, data)
        }
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        if (android.R.id.home == item.itemId) {
            onBackPressed()
            return true
        }

        return super.onOptionsItemSelected(item)
    }
}
