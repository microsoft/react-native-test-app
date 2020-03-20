package com.sample

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.view.KeyEvent
import androidx.appcompat.app.AppCompatActivity
import com.facebook.react.PackageList
import com.facebook.react.ReactInstanceManager
import com.facebook.react.ReactRootView
import com.facebook.react.common.LifecycleState
import com.facebook.react.modules.core.DefaultHardwareBackBtnHandler
import com.facebook.soloader.SoLoader

class ComponentActivity : AppCompatActivity(), DefaultHardwareBackBtnHandler {
    private lateinit var reactRootView: ReactRootView
    private lateinit var reactInstanceManager: ReactInstanceManager

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

        reactRootView = ReactRootView(this)
        setContentView(reactRootView)

        val reactInstanceManagerBuilder = ReactInstanceManager.builder()
            .setInitialLifecycleState(LifecycleState.BEFORE_RESUME)
            .addPackages(PackageList(application).packages)
            .setApplication(application)
            .setCurrentActivity(this)

        val bundleName = findBundleFile()
        if (bundleName == null) {
            reactInstanceManagerBuilder
                .setUseDeveloperSupport(BuildConfig.DEBUG)
                .setJSMainModulePath("index")
        } else {
            reactInstanceManagerBuilder.setBundleAssetName(bundleName)
        }

        reactInstanceManager = reactInstanceManagerBuilder.build()

        componentName?.let {
            reactRootView.startReactApplication(
                reactInstanceManager, it, null
            )
        }
    }

    private fun findBundleFile(): String? {
        val possibleEntryFiles = listOf(
            "index.ios",
            "main.ios",
            "index.mobile",
            "main.mobile",
            "index.native",
            "main.native",
            "index",
            "main"
        ).map { "$it.jsbundle" }

        return resources.assets.list("")
            ?.firstOrNull { possibleEntryFiles.contains(it) }
    }

    override fun getSystemService(name: String): Any? {
        if ("react-instance-manager" == name) {
            return reactInstanceManager
        }

        return super.getSystemService(name)
    }

    override fun invokeDefaultOnBackPressed() {
    }

    override fun onKeyUp(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_MENU) {
            reactInstanceManager.showDevOptionsDialog()
            return true
        }

        return super.onKeyUp(keyCode, event)
    }

    override fun onPause() {
        super.onPause()

        reactInstanceManager.onHostPause(this)
    }

    override fun onResume() {
        super.onResume()

        reactInstanceManager.onHostResume(this, this)
    }

    override fun onDestroy() {
        super.onDestroy()

        reactInstanceManager.onHostDestroy(this)
    }
}
