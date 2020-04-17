package com.sample

import android.os.Bundle
import android.view.LayoutInflater
import android.widget.TextView
import androidx.recyclerview.widget.DividerItemDecoration
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.facebook.react.ReactActivity
import com.facebook.react.modules.systeminfo.ReactNativeVersion
import com.google.android.material.appbar.MaterialToolbar
import com.sample.component.ComponentActivity
import com.sample.component.ComponentListAdapter
import com.sample.component.ComponentViewModel
import com.sample.manifest.Components
import com.sample.manifest.ManifestProvider
import com.sample.react.BundleSource
import com.sample.react.ReactBundleNameProvider
import com.sample.react.TestAppReactNativeHost
import dagger.android.AndroidInjection
import javax.inject.Inject

class MainActivity : ReactActivity() {

    @Inject
    lateinit var manifestProvider: ManifestProvider

    @Inject
    lateinit var bundleNameProvider: ReactBundleNameProvider

    private val testAppReactNativeHost: TestAppReactNativeHost
        get() = reactNativeHost as TestAppReactNativeHost

    private val listener = { component: ComponentViewModel ->
        startActivity(
                ComponentActivity.newIntent(
                        this, component.name, component.displayName
                )
        )
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        AndroidInjection.inject(this)

        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val manifest = manifestProvider.manifest
                ?: throw IllegalStateException("app.json is not provided or TestApp is misconfigured")

        setupToolbar(manifest.displayName)
        setupRecyclerView(manifest.components)
    }

    private fun setupToolbar(displayName: String) {
        val toolbar = findViewById<MaterialToolbar>(R.id.top_app_bar)

        toolbar.title = displayName
        toolbar.setOnMenuItemClickListener { menuItem ->
            when (menuItem.itemId) {
                R.id.load_embedded_js_bundle -> {
                    reload(toolbar, BundleSource.Disk)
                    true
                }
                R.id.load_from_dev_server -> {
                    reload(toolbar, BundleSource.Server)
                    true
                }
                R.id.show_dev_options -> {
                    reactInstanceManager.devSupportManager.showDevOptionsDialog()
                    true
                }
                else -> false
            }
        }

        updateMenuItemState(toolbar, testAppReactNativeHost.source)
    }

    private fun reload(toolbar: MaterialToolbar, bundleSource: BundleSource) {
        testAppReactNativeHost.reload(this, bundleSource)
        updateMenuItemState(toolbar, bundleSource)
    }

    private fun updateMenuItemState(toolbar: MaterialToolbar, bundleSource: BundleSource) {
        toolbar.menu.apply {
            findItem(R.id.load_embedded_js_bundle).isEnabled = bundleNameProvider.bundleName != null
            findItem(R.id.show_dev_options).isEnabled = bundleSource == BundleSource.Server
        }
    }

    private fun setupRecyclerView(manifestComponents: Components) {
        val components = manifestComponents.map {
            ComponentViewModel(it.key, it.value.displayName ?: it.key)
        }
        findViewById<RecyclerView>(R.id.recyclerview).apply {
            layoutManager = LinearLayoutManager(context)
            adapter = ComponentListAdapter(
                    LayoutInflater.from(context), components, listener
            )

            addItemDecoration(DividerItemDecoration(context, DividerItemDecoration.VERTICAL))
        }

        findViewById<TextView>(R.id.runtime_info).apply {
            text = resources.getString(
                    R.string.runtime_info,
                    ReactNativeVersion.VERSION["major"] as Int,
                    ReactNativeVersion.VERSION["minor"] as Int,
                    ReactNativeVersion.VERSION["patch"] as Int,
                    reactInstanceManager.jsExecutorName
            )
        }
    }
}
