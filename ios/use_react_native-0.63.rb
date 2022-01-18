def include_react_native!(options)
  react_native, flipper_versions, project_root, target_platform = options.values_at(
    :path, :rta_flipper_versions, :rta_project_root, :rta_target_platform
  )

  require_relative(File.join(project_root, react_native, 'scripts', 'react_native_pods'))

  use_flipper!(flipper_versions) if target_platform == :ios && flipper_versions
  use_react_native!(options)

  if target_platform == :macos
    return lambda { |installer|
      begin
        flipper_post_install(installer)
      rescue TypeError
        # In https://github.com/microsoft/react-native-macos/pull/803,
        # `flipper_post_install` assumes that the Xcode project file lives next
        # to the `Podfile`. Since the script isn't really do anything that we
        # aren't already handling, and it doesn't look like the change exists
        # upstream, we'll ignore the error for now.
      end
    }
  end

  ->(installer) { flipper_post_install(installer) }
end
