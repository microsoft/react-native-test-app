# rubocop:disable Metrics/CyclomaticComplexity,Metrics/PerceivedComplexity

require 'open3'

require_relative('pod_helpers')

def include_react_native!(options)
  react_native = options[:path]
  flipper_versions = options[:rta_flipper_versions]
  project_root = options[:rta_project_root]
  target_platform = options[:rta_target_platform]

  require_relative(File.join(project_root, react_native, 'scripts', 'react_native_pods'))

  # TODO: Remove this block when react-native-macos catches up to core.
  unless defined?(FlipperConfiguration)
    require_relative('use_react_native-0.68')
    return include_react_native!(options)
  end

  if target_platform == :ios && flipper_versions
    Pod::UI.warn(
      'use_flipper is deprecated from 0.70; use the flipper_configuration ' \
      'option in the use_test_app! function instead if you don\'t need to ' \
      'support older versions of react-native.'
    )
    options[:flipper_configuration] = FlipperConfiguration.enabled(['Debug'], flipper_versions)
  end

  use_new_architecture!(options)
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
