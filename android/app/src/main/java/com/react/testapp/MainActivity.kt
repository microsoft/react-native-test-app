//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

package com.react.testapp

import android.os.Bundle
import android.view.LayoutInflater
import android.widget.TextView
import androidx.recyclerview.widget.DividerItemDecoration
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.facebook.react.ReactActivity
import com.facebook.react.modules.systeminfo.ReactNativeVersion
import com.google.android.material.appbar.MaterialToolbar
import com.react.testapp.component.ComponentActivity
import com.react.testapp.component.ComponentListAdapter
import com.react.testapp.component.ComponentViewModel
import com.react.testapp.manifest.Component
import com.react.testapp.manifest.ManifestProvider
import com.react.testapp.react.BundleSource
import com.react.testapp.react.ReactBundleNameProvider
import com.react.testapp.react.TestAppReactNativeHost
import dagger.android.AndroidInjection
import javax.inject.Inject

class MainActivity : ReactActivity() {

    @Inject
    lateinit var manifestProvider: ManifestProvider

    @Inject
    lateinit var bundleNameProvider: ReactBundleNameProvider

    private val testAppReactNativeHost: TestAppReactNativeHost
        get() = reactNativeHost as TestAppReactNativeHost

    private val newComponentActivityIntent = { component: ComponentViewModel ->
        ComponentActivity.newIntent(this, component)
    }

    private val newComponentViewModel = { component: Component ->
        ComponentViewModel(
            component.appKey,
            component.displayName ?: component.appKey,
            component.initialProperties
        )
    }

    private val startComponentActivity = { component: ComponentViewModel ->
        startActivity(newComponentActivityIntent(component))
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        AndroidInjection.inject(this)

        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val manifest = manifestProvider.manifest
            ?: throw IllegalStateException("app.json is not provided or TestApp is misconfigured")

        if (manifest.components.count() == 1) {
            val component = newComponentViewModel(manifest.components[0])
            startComponentActivity(component)
        }

        setupToolbar(manifest.displayName)
        setupRecyclerView(manifest.components)
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
                    reload(BundleSource.Server)
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
        testAppReactNativeHost.onBundleSourceChanged = {
            updateMenuItemState(toolbar, it)
        }
    }

    private fun reload(bundleSource: BundleSource) {
        testAppReactNativeHost.reload(this, bundleSource)
    }

    private fun updateMenuItemState(toolbar: MaterialToolbar, bundleSource: BundleSource) {
        toolbar.menu.apply {
            findItem(R.id.load_embedded_js_bundle).isEnabled = bundleNameProvider.bundleName != null
            findItem(R.id.show_dev_options).isEnabled = bundleSource == BundleSource.Server
        }
    }

    private fun setupRecyclerView(manifestComponents: List<Component>) {
        val components = manifestComponents.map(newComponentViewModel)
        findViewById<RecyclerView>(R.id.recyclerview).apply {
            layoutManager = LinearLayoutManager(context)
            adapter = ComponentListAdapter(
                LayoutInflater.from(context), components, startComponentActivity
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
