package com.sample

import android.os.Bundle
import android.view.KeyEvent
import androidx.appcompat.app.AppCompatActivity
import com.facebook.react.PackageList
import com.facebook.react.ReactInstanceManager
import com.facebook.react.ReactRootView
import com.facebook.react.TestAppPackageList
import com.facebook.react.common.LifecycleState
import com.facebook.react.modules.core.DefaultHardwareBackBtnHandler
import com.facebook.soloader.SoLoader

class MainActivity : AppCompatActivity(), DefaultHardwareBackBtnHandler {
    private lateinit var reactRootView: ReactRootView
    private lateinit var reactInstanceManager: ReactInstanceManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        SoLoader.init(this, false)

        reactRootView = ReactRootView(this)
        setContentView(reactRootView)

        reactInstanceManager = ReactInstanceManager.builder()
            .setInitialLifecycleState(LifecycleState.BEFORE_RESUME)
            .addPackages(PackageList(application).packages)
            .addPackages(TestAppPackageList().packages)
            .setUseDeveloperSupport(BuildConfig.DEBUG)
            .setCurrentActivity(this@MainActivity)
            .setBundleAssetName("index.android.bundle")
            .setJSMainModulePath("index")
            .setApplication(application)
            .build()

        reactRootView.startReactApplication(
            reactInstanceManager, "TestComponent", null
        )
    }

    override fun invokeDefaultOnBackPressed() {
        onBackPressed()
    }

    override fun onBackPressed() {
        reactInstanceManager.onBackPressed()
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
        reactRootView.unmountReactApplication()
    }
}
