package com.sample

import android.os.Bundle
import android.view.LayoutInflater
import androidx.recyclerview.widget.DividerItemDecoration
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.facebook.react.ReactActivity
import com.google.android.material.appbar.MaterialToolbar
import com.sample.component.ComponentActivity
import com.sample.component.ComponentListAdapter
import com.sample.component.ComponentViewModel
import com.sample.manifest.ManifestProvider
import com.sample.react.TestAppReactNativeHost
import dagger.android.AndroidInjection
import javax.inject.Inject

class MainActivity : ReactActivity() {

    @Inject
    lateinit var manifestProvider: ManifestProvider

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

        val reactNativeHost = reactNativeHost
        if (reactNativeHost is TestAppReactNativeHost) {
            reactNativeHost.currentActivity = this
        }

        val manifest = manifestProvider.manifest
                ?: throw IllegalStateException("app.json is not provided or TestApp is misconfigured")
        findViewById<MaterialToolbar>(R.id.top_app_bar).apply {
            title = manifest.displayName
            setOnMenuItemClickListener { menuItem ->
                when (menuItem.itemId) {
                    R.id.load_embedded_js_bundle -> {
                        reload(this, true)
                        true
                    }
                    R.id.load_from_dev_server -> {
                        reload(this, false)
                        true
                    }
                    R.id.show_dev_options -> {
                        reactInstanceManager.devSupportManager.showDevOptionsDialog()
                        true
                    }
                    else -> false
                }
            }
        }

        val components = manifest.components.map {
            ComponentViewModel(it.key, it.value.displayName ?: it.key)
        }
        findViewById<RecyclerView>(R.id.recyclerview).apply {
            layoutManager = LinearLayoutManager(context)
            adapter = ComponentListAdapter(
                    LayoutInflater.from(context), components, listener
            )

            addItemDecoration(DividerItemDecoration(context, DividerItemDecoration.VERTICAL))
        }
    }

    private fun reload(toolbar: MaterialToolbar, useEmbeddedBundle: Boolean) {
        val reactNativeHost = reactNativeHost
        if (reactNativeHost is TestAppReactNativeHost) {
            reactNativeHost.reload(useEmbeddedBundle)
        }

        toolbar.menu.findItem(R.id.show_dev_options)?.apply {
            isEnabled = !useEmbeddedBundle
        }
    }
}
