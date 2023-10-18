require 'open3'

require_relative('pod_helpers')

def include_react_native!(options)
  react_native = options[:path]
  flipper_versions = options[:rta_flipper_versions]
  project_root = options[:rta_project_root]
  target_platform = options[:rta_target_platform]

  require_relative(File.join(project_root, react_native, 'scripts', 'react_native_pods'))

  if target_platform == :ios && flipper_versions
    Pod::UI.warn('Flipper is deprecated and is removed from react-native in 0.74')
    Pod::UI.warn('Flipper will be removed from react-native-test-app in 3.0')
  end

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
