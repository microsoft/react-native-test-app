# rubocop:disable Metrics/CyclomaticComplexity,Metrics/PerceivedComplexity

require 'open3'

require_relative('pod_helpers')

def include_react_native!(options)
  react_native = options[:path]
  flipper_versions = options[:rta_flipper_versions]
  project_root = options[:rta_project_root]
  target_platform = options[:rta_target_platform]

  require_relative(File.join(project_root, react_native, 'scripts', 'react_native_pods'))

  if target_platform == :ios && (flipper_versions || options.key?(:flipper_configuration))
    Pod::UI.warn('Flipper is deprecated and is removed from react-native in 0.74')
    Pod::UI.warn('Flipper will be removed from react-native-test-app in 3.0')
    if flipper_versions && defined?(FlipperConfiguration)
      options[:flipper_configuration] = FlipperConfiguration.enabled(['Debug'], flipper_versions)
    end
  end

  use_new_architecture!(options)
  if defined?(FlipperConfiguration)
    # TODO: Remove this branch in 3.0
    use_react_native!(
      path: react_native,
      fabric_enabled: options[:fabric_enabled] == true,
      new_arch_enabled: options[:new_arch_enabled] == true,
      production: options.key?(:production) ? options[:production] : ENV['PRODUCTION'] == '1',
      hermes_enabled: options[:hermes_enabled] == true,
      flipper_configuration: options[:flipper_configuration] || FlipperConfiguration.disabled,
      app_path: options[:app_path] || '..',
      config_file_dir: options[:config_file_dir] || ''
    )
  else
    use_react_native!(
      path: react_native,
      fabric_enabled: options[:fabric_enabled] == true,
      new_arch_enabled: options[:new_arch_enabled] == true,
      production: options.key?(:production) ? options[:production] : ENV['PRODUCTION'] == '1',
      hermes_enabled: options[:hermes_enabled] == true,
      app_path: options[:app_path] || '..',
      config_file_dir: options[:config_file_dir] || ''
    )
  end

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

# rubocop:enable Metrics/CyclomaticComplexity,Metrics/PerceivedComplexity
