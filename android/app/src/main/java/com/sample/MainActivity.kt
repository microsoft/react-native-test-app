package com.sample

import android.os.Bundle
import android.view.LayoutInflater
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.DividerItemDecoration
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.sample.component.ComponentActivity
import com.sample.component.ComponentListAdapter
import com.sample.component.ComponentViewModel
import com.sample.component.ComponentViewModel.NativeComponentViewModel
import com.sample.component.ComponentViewModel.JsComponentViewModel
import com.sample.component.NativeComponentActivity
import com.sample.manifest.ManifestProvider
import dagger.android.AndroidInjection
import javax.inject.Inject

class MainActivity : AppCompatActivity() {

    @Inject
    lateinit var manifestProvider: ManifestProvider

    private val listener = { component: ComponentViewModel ->
        val intent = when (component) {
            is JsComponentViewModel -> ComponentActivity.newIntent(this, component.name, component.displayName)
            is NativeComponentViewModel -> NativeComponentActivity.newIntent(this, component.displayName, component.klass)
        }

        startActivity(intent)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        AndroidInjection.inject(this)

        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val manifest = manifestProvider.manifest
            ?: throw IllegalStateException("app.json is not provided or TestApp is misconfigured")
        val components = manifest.components.map {
            ComponentViewModel.Factory.create(it.key, it.value.displayName)
        }

        supportActionBar?.title = manifest.displayName

        findViewById<RecyclerView>(R.id.recyclerview).apply {
            layoutManager = LinearLayoutManager(context)
            adapter = ComponentListAdapter(
                LayoutInflater.from(context), components, listener
            )

            addItemDecoration(DividerItemDecoration(context, DividerItemDecoration.VERTICAL))
        }
    }
}
