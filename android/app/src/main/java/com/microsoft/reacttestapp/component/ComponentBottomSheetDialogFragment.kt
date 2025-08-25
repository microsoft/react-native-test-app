package com.microsoft.reacttestapp.component

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import com.facebook.react.ReactActivity
import com.facebook.react.ReactRootView
import com.facebook.react.interfaces.fabric.ReactSurface
import com.google.android.material.bottomsheet.BottomSheetDialogFragment
import com.microsoft.reacttestapp.BuildConfig
import com.microsoft.reacttestapp.TestApp

class ComponentBottomSheetDialogFragment : BottomSheetDialogFragment() {

    companion object {
        const val TAG = "ReactComponentBottomSheetDialog"

        private const val DISPLAY_NAME = "displayName"
        private const val INITIAL_PROPERTIES = "initialProperties"
        private const val NAME = "name"

        fun newInstance(component: ComponentViewModel): ComponentBottomSheetDialogFragment {
            val args = Bundle()
            args.putString(NAME, component.name)
            args.putString(DISPLAY_NAME, component.displayName)
            args.putBundle(INITIAL_PROPERTIES, component.initialProperties)

            val fragment = ComponentBottomSheetDialogFragment()
            fragment.arguments = args
            return fragment
        }
    }

    private var surface: ReactSurface? = null

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        val activity = requireActivity() as ReactActivity
        val application = activity.application as TestApp
        if (BuildConfig.REACTAPP_USE_BRIDGELESS) {
            @Suppress("UNNECESSARY_SAFE_CALL")
            val surface = application.reactHost?.createSurface(
                activity,
                requireNotNull(requireArguments().getString(NAME)),
                requireArguments().getBundle(INITIAL_PROPERTIES)
            )
            this.surface = requireNotNull(surface)
            surface.start()
            return surface.view as View
        } else {
            return ReactRootView(context).apply {
                setIsFabric(BuildConfig.REACTAPP_USE_FABRIC)
                @Suppress("DEPRECATION")
                startReactApplication(
                    application.reactNativeHost.reactInstanceManager,
                    requireArguments().getString(NAME),
                    requireArguments().getBundle(INITIAL_PROPERTIES)
                )
            }
        }
    }
}
