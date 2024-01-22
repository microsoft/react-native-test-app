package com.microsoft.reacttestapp

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.os.Looper
import android.view.LayoutInflater
import android.widget.TextView
import androidx.core.os.HandlerCompat
import androidx.recyclerview.widget.DividerItemDecoration
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.facebook.react.ReactActivity
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.systeminfo.ReactNativeVersion
import com.facebook.react.packagerconnection.PackagerConnectionSettings
import com.google.android.material.appbar.MaterialToolbar
import com.microsoft.reacttestapp.camera.canUseCamera
import com.microsoft.reacttestapp.camera.scanForQrCode
import com.microsoft.reacttestapp.compat.ReactInstanceEventListener
import com.microsoft.reacttestapp.component.ComponentActivity
import com.microsoft.reacttestapp.component.ComponentBottomSheetDialogFragment
import com.microsoft.reacttestapp.component.ComponentListAdapter
import com.microsoft.reacttestapp.component.ComponentViewModel
import com.microsoft.reacttestapp.manifest.Component
import com.microsoft.reacttestapp.react.AppRegistry
import com.microsoft.reacttestapp.react.BundleSource

class MainActivity : ReactActivity() {

    companion object {
        const val REQUEST_CODE_PERMISSIONS = 42
    }

    val mainThreadHandler by lazy {
        HandlerCompat.createAsync(Looper.getMainLooper())
    }

    private lateinit var componentListAdapter: ComponentListAdapter
    private var isTopResumedActivity = false

    private val newComponentViewModel = { component: Component ->
        ComponentViewModel(
            component.appKey,
            component.displayName ?: component.appKey,
            component.initialProperties,
            component.presentationStyle
        )
    }

    private val session by lazy {
        Session(applicationContext)
    }

    private var useAppRegistry: Boolean = false

    private fun findActivityClass(name: String): Class<*>? {
        return try {
            val result = Class.forName(name)
            val isActivity = Activity::class.java.isAssignableFrom(result)

            return if (isActivity) result else null
        } catch (e: ClassNotFoundException) {
            null
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val (manifest, checksum) = testApp.manifestProvider.fromResources()
        val components = manifest.components ?: listOf()

        @Suppress("SENSELESS_COMPARISON")
        when {
            BuildConfig.ReactTestApp_singleApp === null -> {
                setContentView(R.layout.activity_main)

                useAppRegistry = components.isEmpty()
                if (useAppRegistry) {
                    testApp.reactNativeHost.addReactInstanceEventListener(
                        object : ReactInstanceEventListener {
                            override fun onReactContextInitialized(context: ReactContext) {
                                val ctx = context as ReactApplicationContext
                                ctx.runOnJSQueueThread {
                                    val appKeys = AppRegistry.getAppKeys(ctx)
                                    val viewModels = appKeys.map { appKey ->
                                        ComponentViewModel(appKey, appKey, null, null)
                                    }
                                    mainThreadHandler.post {
                                        componentListAdapter.setComponents(viewModels)
                                        if (isTopResumedActivity && viewModels.count() == 1) {
                                            startComponent(viewModels[0])
                                        }
                                    }
                                }
                            }
                        }
                    )
                } else {
                    val index =
                        if (components.count() == 1) 0 else session.lastOpenedComponent(checksum)
                    index?.let {
                        val component = newComponentViewModel(components[it])
                        val startInitialComponent = object : ReactInstanceEventListener {
                            override fun onReactContextInitialized(context: ReactContext) {
                                if (isTopResumedActivity) {
                                    startComponent(component)
                                }
                            }
                        }
                        testApp.reactNativeHost.apply {
                            addReactInstanceEventListener(startInitialComponent)
                            reactInstanceManager.currentReactContext?.let {
                                startInitialComponent.onReactContextInitialized(it)
                            }
                        }
                    }
                }

                setupToolbar(manifest.displayName)
                setupRecyclerView(components, checksum)
            }

            components.isNotEmpty() -> {
                val slug = BuildConfig.ReactTestApp_singleApp
                val component = components.find { it.slug == slug }
                    ?: throw IllegalArgumentException("No component with slug: $slug")
                val intent = ComponentActivity.newIntent(this, newComponentViewModel(component))
                intent.flags = Intent.FLAG_ACTIVITY_TASK_ON_HOME or Intent.FLAG_ACTIVITY_NEW_TASK
                startActivity(intent)
                finish()
            }

            else -> throw IllegalArgumentException("At least one component must be declared")
        }
    }

    override fun onTopResumedActivityChanged(isTopResumedActivity: Boolean) {
        super.onTopResumedActivityChanged(isTopResumedActivity)
        this.isTopResumedActivity = isTopResumedActivity
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        if (requestCode == REQUEST_CODE_PERMISSIONS) {
            if (canUseCamera()) {
                scanForQrCode()
            }
        } else {
            super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        }
    }

    internal fun reloadJSFromServer(bundleURL: String) {
        componentListAdapter.clear()
        testApp.reloadJSFromServer(this, bundleURL)
    }

    private fun reload(bundleSource: BundleSource) {
        if (useAppRegistry) {
            componentListAdapter.clear()
        }
        testApp.reactNativeHost.reload(this, bundleSource)
    }

    private fun setupRecyclerView(manifestComponents: List<Component>, manifestChecksum: String) {
        componentListAdapter = ComponentListAdapter(
            LayoutInflater.from(applicationContext),
            manifestComponents.map(newComponentViewModel)
        ) { component, index ->
            startComponent(component)
            session.storeComponent(index, manifestChecksum)
        }

        findViewById<RecyclerView>(R.id.recyclerview).apply {
            layoutManager = LinearLayoutManager(context)
            adapter = componentListAdapter

            addItemDecoration(DividerItemDecoration(context, DividerItemDecoration.VERTICAL))
        }

        findViewById<TextView>(R.id.runtime_info).apply {
            text = resources.getString(
                R.string.runtime_info,
                ReactNativeVersion.VERSION["major"] as Int,
                ReactNativeVersion.VERSION["minor"] as Int,
                ReactNativeVersion.VERSION["patch"] as Int,
                testApp.reactNativeHost.jsExecutorName,
                if (BuildConfig.ReactTestApp_useFabric) "+Fabric" else ""
            )
        }
    }

    private fun setupToolbar(displayName: String) {
        val toolbar = findViewById<MaterialToolbar>(R.id.top_app_bar)

        toolbar.title = displayName
        toolbar.setOnMenuItemClickListener { menuItem ->
            when (menuItem.itemId) {
                R.id.load_embedded_js_bundle -> {
                    reload(BundleSource.Disk)
                    true
                }
                R.id.load_from_dev_server -> {
                    PackagerConnectionSettings(this).debugServerHost = ""
                    reload(BundleSource.Server)
                    true
                }
                R.id.remember_last_component -> {
                    val enable = !menuItem.isChecked
                    menuItem.isChecked = enable
                    session.shouldRememberLastComponent = enable
                    true
                }
                R.id.scan_qr_code -> {
                    scanForQrCode()
                    true
                }
                R.id.show_dev_options -> {
                    reactInstanceManager.devSupportManager.showDevOptionsDialog()
                    true
                }
                else -> false
            }
        }

        updateMenuItemState(toolbar, testApp.reactNativeHost.source)
        testApp.reactNativeHost.onBundleSourceChanged = {
            updateMenuItemState(toolbar, it)
        }
    }

    private fun startComponent(component: ComponentViewModel) {
        when (component.presentationStyle) {
            "modal" -> {
                ComponentBottomSheetDialogFragment
                    .newInstance(component)
                    .show(supportFragmentManager, ComponentBottomSheetDialogFragment.TAG)
            }
            else -> {
                findActivityClass(component.name)?.let {
                    startActivity(Intent(this, it))
                } ?: startActivity(ComponentActivity.newIntent(this, component))
            }
        }
    }

    private fun updateMenuItemState(toolbar: MaterialToolbar, bundleSource: BundleSource) {
        toolbar.menu.apply {
            findItem(R.id.load_embedded_js_bundle).isEnabled =
                testApp.bundleNameProvider.bundleName != null
            findItem(R.id.remember_last_component).isChecked = session.shouldRememberLastComponent
            findItem(R.id.show_dev_options).isEnabled = bundleSource == BundleSource.Server
        }
    }
}
