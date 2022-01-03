#
# Copyright (c) Microsoft Corporation. All rights reserved.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.
#

require('json')
require('pathname')
require('rubygems/version')

require_relative('pod_helpers')

def assert(condition, message)
  raise message unless condition
end

def app_manifest(project_root)
  @app_manifest ||= {}
  return @app_manifest[project_root] if @app_manifest.key?(project_root)

  manifest_path = find_file('app.json', project_root)
  return if manifest_path.nil?

  @app_manifest[project_root] = JSON.parse(File.read(manifest_path))
end

def app_name(project_root)
  manifest = app_manifest(project_root)
  return [nil, nil] if manifest.nil?

  [manifest['name'], manifest['displayName']]
end

def autolink_script_path
  package_path = resolve_module('@react-native-community/cli-platform-ios')
  File.join(package_path, 'native_modules')
end

def autolink_script_version
  package_version(resolve_module('@react-native-community/cli-platform-ios'))
end

def platform_config(key, project_root, target_platform)
  manifest = app_manifest(project_root)
  return if manifest.nil?

  config = manifest[target_platform.to_s]
  return config[key] if !config.nil? && !config.empty?
end

def bundle_identifier(project_root, target_platform)
  bundle_identifier = platform_config('bundleIdentifier', project_root, target_platform)
  return bundle_identifier if bundle_identifier.is_a? String

  @test_app_bundle_identifier
end

def find_project_root
  podfile_path = Thread.current.backtrace_locations.find do |location|
    File.basename(location.absolute_path) == 'Podfile'
  end
  assert(!podfile_path.nil?, "Could not find 'Podfile'")

  Pathname.new(File.dirname(podfile_path.absolute_path))
end

def flipper_enabled?(react_native_version)
  react_native_version >= 6200 && @flipper_versions != false
end

def flipper_versions
  @flipper_versions != false && (@flipper_versions || {})
end

def nearest_node_modules(project_root)
  path = find_file('node_modules', project_root)
  assert(!path.nil?, "Could not find 'node_modules'")

  path
end

def package_version(package_path)
  package_json = JSON.parse(File.read(File.join(package_path, 'package.json')))
  Gem::Version.new(package_json['version'])
end

def project_path(file, target_platform)
  File.expand_path(file, File.join(__dir__, '..', target_platform.to_s))
end

def react_native_path(project_root, target_platform)
  react_native_path = platform_config('reactNativePath', project_root, target_platform)
  return Pathname.new(resolve_module(react_native_path)) if react_native_path.is_a? String

  react_native = case target_platform
                 when :ios then 'react-native'
                 when :macos then 'react-native-macos'
                 else raise "Unsupported target platform: #{target_platform}"
                 end
  Pathname.new(resolve_module(react_native))
end

def react_native_pods(version)
  v = version.release
  if v == Gem::Version.new('0.0.0') || v >= Gem::Version.new('0.63')
    'use_react_native-0.63'
  elsif v >= Gem::Version.new('0.62')
    'use_react_native-0.62'
  elsif v >= Gem::Version.new('0.61')
    'use_react_native-0.61'
  elsif v >= Gem::Version.new('0.60')
    'use_react_native-0.60'
  else
    raise "Unsupported React Native version: #{version}"
  end
end

def resolve_resources(manifest, target_platform)
  resources = manifest['resources']
  return if !resources || resources.empty?

  resources.instance_of?(Array) ? resources : resources[target_platform.to_s]
end

def resources_pod(project_root, target_platform, platforms)
  app_manifest = find_file('app.json', project_root)
  return if app_manifest.nil?

  app_dir = File.dirname(app_manifest)
  resources = resolve_resources(app_manifest(project_root), target_platform)

  if !resources.nil? && resources.any? { |r| !File.exist?(File.join(app_dir, r)) }
    Pod::UI.notice(
      'One or more resources were not found and will not be included in the project. ' \
      'If they are found later and you want to include them, run `pod install` again.'
    )
  end

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
    },
    'resources' => ['app.json', *resources],
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

def test_app_bundle_identifier(identifier)
  warn <<~HEREDOC
    Warning: test_app_bundle_identifier() is deprecated
      Please set the bundle identifier in `app.json`, e.g.

        {
          "name": "Example",
          "displayName": "Example",
          "components": [],
          "resources": {},
          "ios": {
            "bundleIdentifier": "#{identifier}"
          },
          "macos": {
            "bundleIdentifier": "#{identifier}"
          }
        }
  HEREDOC
  @test_app_bundle_identifier = identifier
end

def use_flipper!(versions = {})
  @flipper_versions = versions
end

def use_react_native!(project_root, target_platform, options)
  react_native = react_native_path(project_root, target_platform)
  version = package_version(react_native.to_s)

  require_relative(react_native_pods(version))

  include_react_native!(**options,
                        path: react_native.relative_path_from(project_root).to_s,
                        rta_flipper_versions: flipper_versions,
                        rta_project_root: project_root,
                        rta_target_platform: target_platform)
end

def make_project!(xcodeproj, project_root, target_platform)
  src_xcodeproj = project_path(xcodeproj, target_platform)
  destination = File.join(nearest_node_modules(project_root), '.generated', target_platform.to_s)
  dst_xcodeproj = File.join(destination, xcodeproj)

  # Copy Xcode project files
  FileUtils.mkdir_p(destination)
  FileUtils.cp_r(src_xcodeproj, destination)
  name, display_name = app_name(project_root)
  unless name.nil?
    xcschemes_path = File.join(dst_xcodeproj, 'xcshareddata', 'xcschemes')
    FileUtils.cp(File.join(xcschemes_path, 'ReactTestApp.xcscheme'),
                 File.join(xcschemes_path, "#{name}.xcscheme"))
  end

  # Link source files
  %w[ReactTestApp ReactTestAppTests ReactTestAppUITests].each do |file|
    FileUtils.ln_sf(project_path(file, target_platform), destination)
  end

  # Shared code lives in `ios/ReactTestApp/`
  if target_platform != :ios
    source = File.expand_path('ReactTestApp', __dir__)
    shared_path = File.join(destination, 'ReactTestAppShared')
    FileUtils.ln_sf(source, shared_path) unless File.exist?(shared_path)
  end

  react_native = react_native_path(project_root, target_platform)
  version = package_version(react_native.to_s).segments
  version = (version[0] * 10_000) + (version[1] * 100) + version[2]
  version_macro = "REACT_NATIVE_VERSION=#{version}"

  build_settings = {}

  code_sign_entitlements = platform_config('codeSignEntitlements', project_root, target_platform)
  if code_sign_entitlements.is_a? String
    package_root = File.dirname(find_file('app.json', project_root))
    entitlements = Pathname.new(File.join(package_root, code_sign_entitlements))
    build_settings['CODE_SIGN_ENTITLEMENTS'] = entitlements.relative_path_from(destination).to_s
  end

  code_sign_identity = platform_config('codeSignIdentity', project_root, target_platform)
  build_settings['CODE_SIGN_IDENTITY'] = code_sign_identity if code_sign_identity.is_a? String

  development_team = platform_config('developmentTeam', project_root, target_platform)
  build_settings['DEVELOPMENT_TEAM'] = development_team if development_team.is_a? String

  product_bundle_identifier = bundle_identifier(project_root, target_platform)
  if product_bundle_identifier.is_a? String
    build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = product_bundle_identifier
  end

  product_name = display_name || name
  build_settings['PRODUCT_DISPLAY_NAME'] = if product_name.is_a? String
                                             product_name
                                           else
                                             target.name
                                           end

  supports_flipper = target_platform == :ios && flipper_enabled?(version)

  app_project = Xcodeproj::Project.open(dst_xcodeproj)
  app_project.native_targets.each do |target|
    next if target.name != 'ReactTestApp'

    target.build_configurations.each do |config|
      use_flipper = config.name == 'Debug' && supports_flipper

      config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= [
        '$(inherited)',
        version_macro,
        "FB_SONARKIT_ENABLED=#{use_flipper ? 1 : 0}",
        "USE_FLIPPER=#{use_flipper ? 1 : 0}",
      ]

      build_settings.each do |setting, value|
        config.build_settings[setting] = value
      end

      next unless use_flipper

      config.build_settings['OTHER_SWIFT_FLAGS'] ||= [
        '$(inherited)',
        '-DFB_SONARKIT_ENABLED',
        '-DUSE_FLIPPER',
      ]
    end
  end
  app_project.save

  config = app_project.build_configurations[0]
  {
    :xcodeproj_path => dst_xcodeproj,
    :platforms => {
      :ios => config.resolve_build_setting('IPHONEOS_DEPLOYMENT_TARGET'),
      :macos => config.resolve_build_setting('MACOSX_DEPLOYMENT_TARGET'),
    },
  }
end

def use_test_app_internal!(target_platform, options)
  assert(%i[ios macos].include?(target_platform), "Unsupported platform: #{target_platform}")

  xcodeproj = 'ReactTestApp.xcodeproj'
  project_root = find_project_root
  dst_xcodeproj, platforms = make_project!(xcodeproj, project_root, target_platform).values_at(
    :xcodeproj_path, :platforms
  )

  require_relative(autolink_script_path)

  begin
    platform :ios, platforms[:ios] if target_platform == :ios
    platform :osx, platforms[:macos] if target_platform == :macos
  rescue StandardError
    # Allow platform deployment target to be overridden
  end

  project dst_xcodeproj

  react_native_post_install = nil

  target 'ReactTestApp' do
    pod 'SwiftLint'

    react_native_post_install = use_react_native!(project_root, target_platform, options)

    if (resources_pod_path = resources_pod(project_root, target_platform, platforms))
      pod 'ReactTestApp-Resources', :path => resources_pod_path
    end

    yield ReactTestAppTargets.new(self) if block_given?

    if autolink_script_version < Gem::Version.new('3.0')
      use_native_modules! '.'
    else
      use_native_modules!
    end
  end

  post_install do |installer|
    react_native_post_install&.call(installer)

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
      when 'SwiftLint'
        # Let SwiftLint inherit the deployment target from the Pods project
        target.build_configurations.each do |config|
          config.build_settings.delete('IPHONEOS_DEPLOYMENT_TARGET')
          config.build_settings.delete('MACOSX_DEPLOYMENT_TARGET')
        end
      when /\AFlipper/, 'libevent'
        target.build_configurations.each do |config|
          # Flipper and its dependencies log too many warnings
          config.build_settings['WARNING_CFLAGS'] ||= ['"-w"']
        end
      when /\AReact/
        target.build_configurations.each do |config|
          # Xcode 10.2 requires suppression of nullability for React
          # https://stackoverflow.com/questions/37691049/xcode-compile-flag-to-suppress-nullability-warnings-not-working
          config.build_settings['WARNING_CFLAGS'] ||= ['"-Wno-nullability-completeness"']
        end
      else
        # Ensure `ENABLE_TESTING_SEARCH_PATHS` is always set otherwise Xcode may
        # fail to properly import XCTest
        unless test_dependencies.assoc(target.name).nil?
          key = 'ENABLE_TESTING_SEARCH_PATHS'
          target.build_configurations.each do |config|
            setting = config.resolve_build_setting(key)
            config.build_settings[key] = 'YES' if setting.nil?
          end
        end
      end
    end

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
    File.unlink(@tmpfile.path) if File.exist?(@tmpfile.path)
  end
end
