package com.sample.component

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.view.MenuItem
import androidx.fragment.app.Fragment
import com.facebook.react.ReactActivity
import com.facebook.soloader.SoLoader

class ComponentActivity : ReactActivity() {

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

        supportActionBar?.setHomeButtonEnabled(true)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)

        val componentName = intent.extras?.getString(COMPONENT_NAME, null)
            ?: throw IllegalArgumentException("Class name has to be provided.")
        title = intent.extras?.getString(COMPONENT_DISPLAY_NAME, componentName)

        findClass(componentName)?.let {
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

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        if (android.R.id.home == item.itemId) {
            onBackPressed()
            return true;
        }

        return super.onOptionsItemSelected(item)
    }

    override fun getSystemService(name: String): Any? {
        if (name == "service:reactNativeHostService") {
            return reactNativeHost
        }

        return super.getSystemService(name)
    }
}
