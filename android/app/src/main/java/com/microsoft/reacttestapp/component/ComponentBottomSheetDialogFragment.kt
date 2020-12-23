//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

package com.microsoft.reacttestapp.component

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import com.facebook.react.ReactApplication
import com.facebook.react.ReactRootView
import com.google.android.material.bottomsheet.BottomSheetDialogFragment

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

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        val reactApplication = requireActivity().application as ReactApplication
        return ReactRootView(context).apply {
            startReactApplication(
                reactApplication.reactNativeHost.reactInstanceManager,
                requireArguments().getString(NAME),
                requireArguments().getBundle(INITIAL_PROPERTIES)
            )
        }
    }
}
