require 'open3'

require_relative('pod_helpers')

def include_react_native!(options)
  react_native, project_root = options.values_at(:path, :rta_project_root)

  require_relative(File.join(project_root, react_native, 'scripts', 'react_native_pods'))

  options[:hermes_enabled] = use_hermes?(options)
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
