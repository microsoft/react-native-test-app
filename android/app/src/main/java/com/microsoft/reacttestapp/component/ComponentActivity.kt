package com.microsoft.reacttestapp.component

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.view.MenuItem
import androidx.fragment.app.Fragment
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.microsoft.reacttestapp.BuildConfig

class ComponentActivity : ReactActivity() {

    companion object {
        private const val COMPONENT_NAME = "extra:componentName"
        private const val COMPONENT_DISPLAY_NAME = "extra:componentDisplayName"
        const val COMPONENT_INITIAL_PROPERTIES = "extra:componentInitialProperties"

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

    // ReactActivity overrides

    override fun createReactActivityDelegate(): ReactActivityDelegate {
        return ComponentActivityDelegate(this, mainComponentName)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        @Suppress("SENSELESS_COMPARISON")
        if (BuildConfig.ReactTestApp_singleApp === null) {
            supportActionBar?.setHomeButtonEnabled(true)
            supportActionBar?.setDisplayHomeAsUpEnabled(true)
        }

        val componentName = intent.extras?.getString(COMPONENT_NAME, null)
            ?: throw IllegalArgumentException("Component name must be provided.")
        title = intent.extras?.getString(COMPONENT_DISPLAY_NAME, componentName)

        findClass(componentName)?.let {
            @Suppress("UNCHECKED_CAST")
            val fragmentClass = it as Class<Fragment>
            val fragment = fragmentClass.getDeclaredConstructor().newInstance()

            if (savedInstanceState == null) {
                supportFragmentManager.beginTransaction()
                    .replace(android.R.id.content, fragment)
                    .commitNow()
            }
        } ?: loadApp(componentName)
    }

    // Activity overrides

    override fun getSystemService(name: String): Any? {
        if (name == "service:reactNativeHostService") {
            return reactNativeHost
        }

        return super.getSystemService(name)
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        if (android.R.id.home == item.itemId) {
            @Suppress("DEPRECATION")
            onBackPressed()
            return true
        }

        return super.onOptionsItemSelected(item)
    }

    // Private

    private fun findClass(name: String): Class<*>? {
        return try {
            Class.forName(name)
        } catch (e: ClassNotFoundException) {
            null
        }
    }
}
