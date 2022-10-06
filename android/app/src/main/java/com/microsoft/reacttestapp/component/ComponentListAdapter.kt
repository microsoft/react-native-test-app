package com.microsoft.reacttestapp.component

import android.annotation.SuppressLint
import android.view.LayoutInflater
import android.view.ViewGroup
import android.widget.TextView
import androidx.annotation.UiThread
import androidx.recyclerview.widget.RecyclerView
import com.microsoft.reacttestapp.R

class ComponentListAdapter(
    private val layoutInflater: LayoutInflater,
    private var components: List<ComponentViewModel>,
    private val listener: (ComponentViewModel, Int) -> Unit
) : RecyclerView.Adapter<ComponentListAdapter.ComponentViewHolder>() {

    @UiThread
    fun clear() {
        val itemCount = components.size
        components = listOf()
        notifyItemRangeRemoved(0, itemCount)
    }

    @SuppressLint("NotifyDataSetChanged")
    @UiThread
    fun setComponents(components: List<ComponentViewModel>) {
        this.components = components
        notifyDataSetChanged()
    }

    override fun getItemCount() = components.size

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ComponentViewHolder {
        return ComponentViewHolder(
            layoutInflater.inflate(
                R.layout.recyclerview_item_component,
                parent,
                false
            ) as TextView
        )
    }

    override fun onBindViewHolder(holder: ComponentViewHolder, position: Int) {
        holder.bindTo(components[position])
    }

    inner class ComponentViewHolder(private val view: TextView) : RecyclerView.ViewHolder(view) {
        init {
            view.setOnClickListener {
                listener(components[bindingAdapterPosition], bindingAdapterPosition)
            }
        }

        fun bindTo(component: ComponentViewModel) {
            view.text = component.displayName
        }
    }
}
