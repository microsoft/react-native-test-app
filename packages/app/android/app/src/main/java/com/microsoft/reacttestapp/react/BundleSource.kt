package com.microsoft.reacttestapp.react

sealed class BundleSource {
    enum class Action {
        RESTART,
        RELOAD
    }

    abstract fun moveTo(to: BundleSource): Action

    object Disk : BundleSource() {
        override fun moveTo(to: BundleSource) = Action.RESTART
    }

    object Server : BundleSource() {
        override fun moveTo(to: BundleSource): Action = when (to) {
            Disk -> Action.RESTART
            Server -> Action.RELOAD
        }
    }
}
