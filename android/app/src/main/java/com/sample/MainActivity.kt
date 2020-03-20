package com.sample

import android.os.Bundle
import android.view.LayoutInflater
import android.view.ViewGroup
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.DividerItemDecoration
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.recyclerview.widget.RecyclerView.Adapter
import androidx.recyclerview.widget.RecyclerView.ViewHolder
import com.squareup.moshi.Moshi

class MainActivity : AppCompatActivity() {

    data class ComponentViewModel(val name: String, val displayName: String)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val moshi = Moshi.Builder().build()
        val manifestAdapter = ManifestJsonAdapter(moshi)

        val appJson = resources.openRawResource(R.raw.app)
            .bufferedReader()
            .use { it.readText() }

        val manifest = manifestAdapter.fromJson(appJson)!!

        val components = manifest.components.map {
            ComponentViewModel(it.key, it.value.displayName)
        }

        supportActionBar?.title = manifest.displayName

        findViewById<RecyclerView>(R.id.recyclerview).apply {
            layoutManager = LinearLayoutManager(context)
            adapter = ComponentAdapter(LayoutInflater.from(context), components)

            addItemDecoration(DividerItemDecoration(context, DividerItemDecoration.VERTICAL))
        }
    }

    private inner class ComponentAdapter(
        private val layoutInflater: LayoutInflater,
        private val components: List<ComponentViewModel>
    ) : Adapter<ComponentAdapter.ComponentViewHolder>() {

        override fun getItemCount() = components.size

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ComponentViewHolder {
            return ComponentViewHolder(
                layoutInflater.inflate(
                    R.layout.recyclerview_item_component, parent, false
                ) as TextView
            )
        }

        override fun onBindViewHolder(holder: ComponentViewHolder, position: Int) {
            holder.bindTo(components[position])
        }

        inner class ComponentViewHolder(private val view: TextView) : ViewHolder(view) {
            init {
                view.setOnClickListener {
                    val component = components[adapterPosition]
                    val activity = this@MainActivity

                    activity.startActivity(
                        ComponentActivity.newIntent(activity, component.name)
                    )
                }
            }

            fun bindTo(component: ComponentViewModel) {
                view.text = component.displayName
            }
        }
    }
}
