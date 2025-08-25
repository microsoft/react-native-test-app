package com.microsoft.reacttestapp.react

import android.app.Activity
import android.app.Application.ActivityLifecycleCallbacks
import android.os.Bundle
import java.lang.ref.WeakReference

class CurrentActivityTracker : ActivityLifecycleCallbacks {
    private var currentActivity: WeakReference<Activity> = WeakReference(null)

    fun get(): Activity? = currentActivity.get()

    override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {
        // ignore
    }

    override fun onActivityStarted(activity: Activity) {
        // ignore
    }

    override fun onActivityResumed(activity: Activity) {
        currentActivity = WeakReference(activity)
    }

    override fun onActivityPaused(activity: Activity) {
        // ignore
    }

    override fun onActivityStopped(activity: Activity) {
        if (activity == currentActivity.get()) {
            currentActivity.clear()
        }
    }

    override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {
        // ignore
    }

    override fun onActivityDestroyed(activity: Activity) {
        // ignore
    }
}
