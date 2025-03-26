require('json')
require('pathname')

require_relative('pod_helpers')

IPHONEOS_DEPLOYMENT_TARGET = 'IPHONEOS_DEPLOYMENT_TARGET'.freeze
MACOSX_DEPLOYMENT_TARGET = 'MACOSX_DEPLOYMENT_TARGET'.freeze
XROS_DEPLOYMENT_TARGET = 'XROS_DEPLOYMENT_TARGET'.freeze

CODE_SIGN_IDENTITY = 'CODE_SIGN_IDENTITY'.freeze
DEVELOPMENT_TEAM = 'DEVELOPMENT_TEAM'.freeze
ENABLE_TESTING_SEARCH_PATHS = 'ENABLE_TESTING_SEARCH_PATHS'.freeze
GCC_PREPROCESSOR_DEFINITIONS = 'GCC_PREPROCESSOR_DEFINITIONS'.freeze
WARNING_CFLAGS = 'WARNING_CFLAGS'.freeze

def apply_config_plugins(project_root, target_platform)
  begin
    resolve_module('@expo/config-plugins')
  rescue StandardError
    # Skip if `@expo/config-plugins` cannot be found
    return
  end

  apply_config_plugins = File.join(__dir__, '..', 'scripts', 'apply-config-plugins.mjs')
  result = system("node \"#{apply_config_plugins}\" \"#{project_root}\" --#{target_platform}")
  raise 'Failed to apply config plugins' unless result
end

def autolink_script_path(project_root, react_native_path, react_native_version)
  start_dir = if react_native_version >= v(0, 76, 0)
                project_root
              else
                react_native_path
              end
  package_path = resolve_module('@react-native-community/cli-platform-ios', start_dir)
  File.join(package_path, 'native_modules')
end

def target_product_type(target)
  target.product_type if target.respond_to?(:product_type)
end

def react_native_pods(version)
  if version.zero? || version >= v(0, 71, 0)
    'use_react_native-0.71'
  elsif version >= v(0, 70, 0)
    'use_react_native-0.70'
  else
    raise "Unsupported React Native version: #{version}"
  end
end

def validate_resources(resources, app_dir)
  excluded = []
  not_found = []
  resources.each do |r|
    if r.start_with?('..')
      excluded << r
    elsif !File.exist?(File.join(app_dir, r))
      not_found << r
    end
  end

  unless excluded.empty?
    items = excluded.join("\n  ")
    Pod::UI.warn("CocoaPods does not allow resources outside the project root:\n  #{items}")
  end

  unless not_found.empty?
    items = not_found.join("\n  ")
    Pod::UI.warn(
      "CocoaPods will not include resources it cannot find:\n  #{items}\n\n" \
      'The app will still build and run if they are served by the dev ' \
      'server. To include missing resources, make sure they exist, then run ' \
      '`pod install` again to update the workspace.'
    )
  end

  resources
end

def resources_pod(project_root, target_platform, platforms)
  app_manifest = find_file('app.json', project_root)
  return if app_manifest.nil?

  app_dir = File.dirname(app_manifest)
  resources = resolve_resources(app_manifest(project_root), target_platform)
  return if resources.nil? || resources.empty?

  spec = {
    'name' => 'ReactTestApp-Resources',
    'version' => '1.0.0-dev',
    'summary' => 'Resources for ReactTestApp',
    'homepage' => 'https://github.com/microsoft/react-native-test-app',
    'license' => 'Unlicense',
    'authors' => '@microsoft/react-native-test-app',
    'source' => { 'git' => 'https://github.com/microsoft/react-native-test-app.git' },
    'platforms' => {
      'ios' => platforms[:ios],
      'osx' => platforms[:macos],
      'visionos' => platforms[:visionos],
    },
    'resources' => validate_resources(resources, app_dir),
  }

  podspec_path = File.join(app_dir, 'ReactTestApp-Resources.podspec.json')
  File.open(podspec_path, 'w') do |f|
    # Under certain conditions, the file doesn't get written to disk before it
    # is read by CocoaPods.
    f.write(spec.to_json)
    f.fsync
    ObjectSpace.define_finalizer(self, Remover.new(f))
  end

  Pathname.new(app_dir).relative_path_from(project_root).to_s
end

def use_react_native!(project_root, react_native, version, options)
  require_relative(react_native_pods(version))

  include_react_native!(**options,
                        app_path: find_file('package.json', project_root).parent.to_s,
                        path: Pathname.new(react_native).relative_path_from(project_root).to_s,
                        rta_project_root: project_root,
                        version: version)
end

def make_project!(project_root, target_platform, options)
  generate_project = File.join(__dir__, 'app.mjs')
  options_json = JSON.fast_generate(options.transform_keys { |key| key.to_s.camelize(:lower) })
  result = `node "#{generate_project}" "#{project_root}" #{target_platform} '#{options_json}'`
  project = JSON.parse(result)

  xcodeproj_path = project['xcodeprojPath']
  build_settings = project['buildSettings']

  app_project = Xcodeproj::Project.open(xcodeproj_path)
  app_project.native_targets.each do |target|
    case target.name
    when 'ReactTestApp'
      target.build_configurations.each do |config|
        build_settings.each do |setting, value|
          if value.is_a? Array
            arr = config.build_settings[setting] || ['$(inherited)']
            value.each { |v| arr << v }
            config.build_settings[setting] = arr
          else
            config.build_settings[setting] = value
          end
        end
      end
    when 'ReactTestAppTests'
      target.build_configurations.each do |config|
        project['testsBuildSettings'].each do |setting, value|
          config.build_settings[setting] = value
        end
      end
    when 'ReactTestAppUITests'
      target.build_configurations.each do |config|
        project['uitestsBuildSettings'].each do |setting, value|
          config.build_settings[setting] = value
        end
      end
    end
  end
  app_project.save

  config = app_project.build_configurations[0]
  {
    :xcodeproj_path => xcodeproj_path,
    :platforms => {
      :ios => config.resolve_build_setting(IPHONEOS_DEPLOYMENT_TARGET),
      :macos => config.resolve_build_setting(MACOSX_DEPLOYMENT_TARGET),
      :visionos => config.resolve_build_setting(XROS_DEPLOYMENT_TARGET),
    },
    :react_native_path => project['reactNativePath'],
    :react_native_version => project['reactNativeVersion'],
    :use_new_arch => project['useNewArch'],
    :code_sign_identity => build_settings[CODE_SIGN_IDENTITY] || '',
    :development_team => build_settings[DEVELOPMENT_TEAM] || '',
  }
end

def use_test_app_internal!(target_platform, options)
  assert_version(Pod::VERSION)
  assert(%i[ios macos visionos].include?(target_platform),
         "Unsupported platform: #{target_platform}")

  xcodeproj = 'ReactTestApp.xcodeproj'
  project_root = Pod::Config.instance.installation_root
  project_target = make_project!(project_root, target_platform, options)
  xcodeproj_dst, platforms, react_native_path, react_native_version = project_target.values_at(
    :xcodeproj_path, :platforms, :react_native_path, :react_native_version
  )

  if project_target[:use_new_arch] || react_native_version >= v(0, 73, 0)
    install! 'cocoapods', :deterministic_uuids => false
  end

  # As of 0.75, we should use `use_native_modules!` from `react-native` instead
  if react_native_version < v(0, 75, 0)
    require_relative(autolink_script_path(project_root, react_native_path, react_native_version))
  end

  begin
    platform :ios, platforms[:ios] if target_platform == :ios
    platform :osx, platforms[:macos] if target_platform == :macos
    platform :visionos, platforms[:visionos] if target_platform == :visionos
  rescue StandardError
    # Allow platform deployment target to be overridden
  end

  project xcodeproj_dst

  react_native_post_install = nil

  target 'ReactTestApp' do
    react_native_post_install = use_react_native!(project_root,
                                                  react_native_path,
                                                  react_native_version,
                                                  options)

    pod 'ReactNativeHost', :path => resolve_module_relative('@rnx-kit/react-native-host')

    if (resources_pod_path = resources_pod(project_root, target_platform, platforms))
      pod 'ReactTestApp-Resources', :path => resources_pod_path
    end

    yield ReactTestAppTargets.new(self) if block_given?

    use_native_modules!
  end

  post_install do |installer|
    react_native_post_install&.call(installer)
    options[:post_install]&.call(installer)

    test_dependencies = {}
    %w[ReactTestAppTests ReactTestAppUITests].each do |target|
      definition = target_definitions[target]
      next if definition.nil?

      definition.non_inherited_dependencies.each do |dependency|
        test_dependencies[dependency.name] = dependency
      end
    end

    installer.pods_project.targets.each do |target|
      case target.name
      when /\AReact/, 'RCT-Folly', 'SocketRocket', 'Yoga', 'fmt', 'glog', 'libevent'
        target.build_configurations.each do |config|
          # TODO: Drop `_LIBCPP_ENABLE_CXX17_REMOVED_UNARY_BINARY_FUNCTION` when
          #       we no longer support 0.72
          config.build_settings[GCC_PREPROCESSOR_DEFINITIONS] ||= ['$(inherited)']
          config.build_settings[GCC_PREPROCESSOR_DEFINITIONS] <<
            '_LIBCPP_ENABLE_CXX17_REMOVED_UNARY_BINARY_FUNCTION=1'
          config.build_settings[WARNING_CFLAGS] ||= []
          config.build_settings[WARNING_CFLAGS] << '-w'
        end
      when 'RNReanimated'
        # Reanimated tries to automatically install itself by swizzling a method
        # in `RCTAppDelegate`. We don't use it since it doesn't exist on older
        # versions of React Native. Redirect users to the config plugin instead.
        # See https://github.com/microsoft/react-native-test-app/issues/1195 and
        # https://github.com/software-mansion/react-native-reanimated/commit/a8206f383e51251e144cb9fd5293e15d06896df0.
        target.build_configurations.each do |config|
          config.build_settings[GCC_PREPROCESSOR_DEFINITIONS] ||= ['$(inherited)']
          config.build_settings[GCC_PREPROCESSOR_DEFINITIONS] << 'DONT_AUTOINSTALL_REANIMATED'
        end
      else
        # Ensure `ENABLE_TESTING_SEARCH_PATHS` is always set otherwise Xcode may
        # fail to properly import XCTest
        unless test_dependencies.assoc(target.name).nil?
          target.build_configurations.each do |config|
            setting = config.resolve_build_setting(ENABLE_TESTING_SEARCH_PATHS)
            config.build_settings[ENABLE_TESTING_SEARCH_PATHS] = 'YES' if setting.nil?
          end
        end
      end

      next unless target_product_type(target) == 'com.apple.product-type.bundle'

      # Code signing of resource bundles was enabled in Xcode 14. Not sure if
      # this is intentional, or if there's a bug in CocoaPods, but Xcode will
      # fail to build when targeting devices. Until this is resolved, we'll just
      # just have to make sure it's consistent with what's set in `app.json`.
      # See also https://github.com/CocoaPods/CocoaPods/issues/11402.
      target.build_configurations.each do |config|
        config.build_settings[CODE_SIGN_IDENTITY] ||= project_target[:code_sign_identity]
        config.build_settings[DEVELOPMENT_TEAM] ||= project_target[:development_team]
      end
    end

    apply_config_plugins(project_root, target_platform)

    Pod::UI.notice(
      "`#{xcodeproj}` was sourced from `react-native-test-app`. " \
      'All modifications will be overwritten next time you run `pod install`.'
    )
  end
end

class ReactTestAppTargets
  def initialize(podfile)
    @podfile = podfile
  end

  def app
    yield if block_given?
  end

  def tests
    @podfile.target 'ReactTestAppTests' do
      @podfile.inherit! :complete
      yield if block_given?
    end
  end

  def ui_tests
    @podfile.target 'ReactTestAppUITests' do
      @podfile.inherit! :complete
      yield if block_given?
    end
  end
end

class Remover
  def initialize(tmpfile)
    @pid = Process.pid
    @tmpfile = tmpfile
  end

  def call(*_args)
    return if @pid != Process.pid

    @tmpfile.close
    FileUtils.rm_rf(@tmpfile.path)
  end
end
