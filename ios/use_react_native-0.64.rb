# rubocop:disable Metrics/CyclomaticComplexity

require 'open3'

def include_react_native!(options)
  react_native, flipper_versions, project_root, target_platform = options.values_at(
    :path, :rta_flipper_versions, :rta_project_root, :rta_target_platform
  )

  require_relative(File.join(project_root, react_native, 'scripts', 'react_native_pods'))

  if target_platform == :ios && flipper_versions
    Pod::UI.warn('Flipper is deprecated and is removed from react-native in 0.74')
    Pod::UI.warn('Flipper will be removed from react-native-test-app in 3.0')
  end

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

      # The path to `Time.h` is hard-coded in 0.66.0 - 0.67.1, and does not take
      # `--project-directory` into consideration. Re-applying the "patch" here
      # in case we missed it the first time.
      time_header = "#{installer.sandbox.root}/RCT-Folly/folly/portability/Time.h"
      if File.exist?(time_header)
        `sed -i -e $'s/VERSION_MIN_REQUIRED </VERSION_MIN_REQUIRED >=/' #{time_header}`
      end
    end
  }
end

# rubocop:enable Metrics/CyclomaticComplexity
