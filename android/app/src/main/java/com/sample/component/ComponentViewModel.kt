package com.sample.component

sealed class ComponentViewModel(val name: String, val displayName: String) {
    class JsComponentViewModel(name: String, displayName: String) :
        ComponentViewModel(name, displayName)

    class NativeComponentViewModel(name: String, displayName: String, val klass: Class<*>) :
        ComponentViewModel(name, displayName)

    object Factory {
        fun create(name: String, displayName: String): ComponentViewModel {
            return findClass(name)?.let { NativeComponentViewModel(name, displayName, it) }
                ?: JsComponentViewModel(name, displayName)
        }

        private fun findClass(name: String): Class<*>? {
            return try {
                Class.forName(name)
            } catch (e: ClassNotFoundException) {
                null
            }
        }
    }
}
