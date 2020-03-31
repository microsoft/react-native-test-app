package com.sample.component

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.view.MenuItem
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import com.facebook.react.ReactNativeHost
import com.facebook.soloader.SoLoader
import dagger.android.AndroidInjection
import javax.inject.Inject

class NativeComponentActivity : AppCompatActivity() {

    @Inject
    lateinit var reactNativeHost: ReactNativeHost

    companion object {
        private const val COMPONENT_DISPLAY_NAME = "extra:componentDisplayName"
        private const val CLASS_NAME = "extra:className"

        fun newIntent(activity: Activity, componentDisplayName: String, klass: Class<*>): Intent {
            return Intent(activity, NativeComponentActivity::class.java).apply {
                putExtra(COMPONENT_DISPLAY_NAME, componentDisplayName)
                putExtra(CLASS_NAME, klass)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        AndroidInjection.inject(this)

        super.onCreate(savedInstanceState)
        SoLoader.init(this, false)

        val componentDisplayName = intent.extras?.getString(COMPONENT_DISPLAY_NAME, null)
            ?: throw IllegalArgumentException("Component display name has to be provided.")
        val className = intent.extras?.getSerializable(CLASS_NAME)
            ?: throw IllegalArgumentException("Class name has to be provided.")

        title = componentDisplayName

        supportActionBar?.setHomeButtonEnabled(true)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)

        val fragmentClass = className as Class<Fragment>
        val fragment = fragmentClass.newInstance()

        if (savedInstanceState == null) {
            supportFragmentManager.beginTransaction()
                .replace(android.R.id.content, fragment)
                .commitNow()
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
