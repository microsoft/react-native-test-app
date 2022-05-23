require 'open3'

require_relative('pod_helpers')

def include_react_native!(options)
  fabric_enabled = options[:fabric_enabled]
  react_native = options[:path]
  flipper_versions = options[:rta_flipper_versions]
  project_root = options[:rta_project_root]
  target_platform = options[:rta_target_platform]

  require_relative(File.join(project_root, react_native, 'scripts', 'react_native_pods'))

  if fabric_enabled
    Pod::UI.warn(
      'As of writing, Fabric is still experimental and subject to change. ' \
      'For more information, please see ' \
      'https://reactnative.dev/docs/next/new-architecture-app-renderer-ios.'
    )
    ENV['RCT_NEW_ARCH_ENABLED'] = '1'
  end

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
