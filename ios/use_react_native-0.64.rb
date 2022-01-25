require 'open3'

def include_react_native!(options)
  react_native, flipper_versions, project_root, target_platform = options.values_at(
    :path, :rta_flipper_versions, :rta_project_root, :rta_target_platform
  )

  require_relative(File.join(project_root, react_native, 'scripts', 'react_native_pods'))

  use_flipper!(flipper_versions) if target_platform == :ios && flipper_versions
  use_react_native!(options)

  # If we're using react-native@main, we'll also need to prepare
  # `react-native-codegen`.
  codegen = File.join(project_root, react_native, 'packages', 'react-native-codegen')
  Open3.popen3('yarn', :chdir => codegen) if File.directory?(codegen)

  lambda { |installer|
    react_native_post_install(installer)
    if defined?(__apply_Xcode_12_5_M1_post_install_workaround)
      __apply_Xcode_12_5_M1_post_install_workaround(installer)
    end
  }
end
