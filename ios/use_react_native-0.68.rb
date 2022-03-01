require 'open3'

require_relative('pod_helpers')

def use_new_architecture!(options)
  new_arch_enabled = new_architecture_enabled?(options, 10_000_000)

  if new_arch_enabled || options[:fabric_enabled]
    Pod::UI.warn(
      'As of writing, Fabric is still experimental and subject to change. ' \
      'For more information, please see ' \
      'https://reactnative.dev/docs/next/new-architecture-app-renderer-ios.'
    )
    ENV['RCT_NEW_ARCH_ENABLED'] = '1'
  end

  return unless new_arch_enabled

  Pod::UI.warn(
    'As of writing, TurboModule is still experimental and subject to change. ' \
    'For more information, please see ' \
    'https://reactnative.dev/docs/next/new-architecture-app-modules-ios.'
  )
  # At the moment, Fabric and TurboModule code are intertwined. We need to
  # enable Fabric for some code that TurboModule relies on.
  options[:fabric_enabled] = true
  options[:turbomodule_enabled] = true
  ENV['RCT_NEW_ARCH_ENABLED'] = '1'
end

def include_react_native!(options)
  react_native = options[:path]
  flipper_versions = options[:rta_flipper_versions]
  project_root = options[:rta_project_root]
  target_platform = options[:rta_target_platform]

  require_relative(File.join(project_root, react_native, 'scripts', 'react_native_pods'))

  use_new_architecture!(options)
  use_flipper!(flipper_versions) if target_platform == :ios && flipper_versions
  use_react_native!(options)

  # If we're using react-native@main, we'll also need to prepare
  # `react-native-codegen`.
  codegen = File.join(project_root, react_native, 'packages', 'react-native-codegen')
  Open3.popen3('yarn build', :chdir => codegen) if File.directory?(codegen)

  lambda { |installer|
    react_native_post_install(installer)
    if defined?(__apply_Xcode_12_5_M1_post_install_workaround)
      __apply_Xcode_12_5_M1_post_install_workaround(installer)
    end
  }
end
