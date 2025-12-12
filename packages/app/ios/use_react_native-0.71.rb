require 'open3'

require_relative('pod_helpers')

def include_react_native!(options)
  react_native, project_root, version = options.values_at(:path, :rta_project_root, :version)

  require_relative(File.join(project_root, react_native, 'scripts', 'react_native_pods'))

  use_new_architecture!(options, version)
  use_react_native!(
    path: react_native,
    fabric_enabled: options[:fabric_enabled] == true,
    new_arch_enabled: options[:new_arch_enabled] == true,
    production: options.key?(:production) ? options[:production] : ENV['PRODUCTION'] == '1',
    hermes_enabled: use_hermes?(options),
    app_path: options[:app_path] || '..',
    config_file_dir: options[:config_file_dir] || ''
  )

  # If we're using react-native@main, we'll also need to prepare
  # `react-native-codegen`.
  codegen = File.join(project_root, react_native, 'packages', 'react-native-codegen')
  Open3.popen3('node scripts/build.js', :chdir => codegen) if File.directory?(codegen)

  lambda { |installer|
    react_native_post_install(installer, react_native)
    if defined?(__apply_Xcode_12_5_M1_post_install_workaround)
      __apply_Xcode_12_5_M1_post_install_workaround(installer)
    end
  }
end
