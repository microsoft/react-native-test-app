#
# Copyright (c) Microsoft Corporation. All rights reserved.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.
#

require('json')
require('pathname')
require('rubygems/version')

require_relative('pod_helpers.rb')

def assert(condition, message)
  raise message unless condition
end

def autolink_script_path
  package_path = resolve_module('@react-native-community/cli-platform-ios')
  File.join(package_path, 'native_modules')
end

def autolink_script_version
  package_version(resolve_module('@react-native-community/cli-platform-ios'))
end

def bundle_identifier(project_root, target_platform)
  manifest_path = find_file('app.json', project_root)
  unless manifest_path.nil?
    manifest = JSON.parse(File.read(manifest_path))
    platform_config = manifest[target_platform.to_s]
    if !platform_config.nil? && !platform_config.empty?
      bundle_identifier = platform_config['bundleIdentifier']
      return bundle_identifier if bundle_identifier.is_a? String
    end
  end

  @test_app_bundle_identifier
end

def react_native_path_from_manifest(project_root, target_platform) 
  manifest_path = find_file('app.json', project_root)
  unless manifest_path.nil?
      manifest = JSON.parse(File.read(manifest_path))
      platform_config = manifest[target_platform]
      if !platform_config.nil? && !platform_config.empty?
        reactNativePath = platform_config['reactNativePath']
        return reactNativePath if reactNativePath.is_a? String
      end
  end
end

def find_file(file_name, current_dir)
  return if current_dir.expand_path.to_s == '/'

  path = current_dir + file_name
  return path if File.exist?(path)

  find_file(file_name, current_dir.parent)
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
  react_native_from_manifest = react_native_path_from_manifest(project_root, target_platform)
  if !react_native_from_manifest.nil?
    Pathname.new(resolve_module(react_native_from_manifest))
  else
    react_native = case target_platform
                  when :ios then 'react-native'
                  when :macos then 'react-native-macos'
                  else raise "Unsupported target platform: #{target_platform}"
                  end
    Pathname.new(resolve_module(react_native))
  end
end

def react_native_pods(version)
  v = version.release
  if v >= Gem::Version.new('0.63')
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

def resources_pod(project_root, target_platform)
  app_manifest = find_file('app.json', project_root)
  return if app_manifest.nil?

  resources = resolve_resources(JSON.parse(File.read(app_manifest)), target_platform)
  spec = {
    'name' => 'ReactTestApp-Resources',
    'version' => '1.0.0-dev',
    'summary' => 'Resources for ReactTestApp',
    'homepage' => 'https://github.com/microsoft/react-native-test-app',
    'license' => 'Unlicense',
    'authors' => '@microsoft/react-native-test-app',
    'source' => { 'git' => 'https://github.com/microsoft/react-native-test-app.git' },
    'platforms' => {
      'ios' => '12.0',
      'osx' => '10.14',
    },
    'resources' => ['app.json', *resources],
  }

  app_dir = File.dirname(app_manifest)
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

def use_react_native!(project_root, target_platform)
  react_native = react_native_path(project_root, target_platform)
  version = package_version(react_native.to_s)

  require_relative(react_native_pods(version))

  include_react_native!(react_native: react_native.relative_path_from(project_root).to_s,
                        target_platform: target_platform,
                        project_root: project_root,
                        flipper_versions: flipper_versions)
end

def make_project!(xcodeproj, project_root, target_platform)
  src_xcodeproj = project_path(xcodeproj, target_platform)
  destination = File.join(nearest_node_modules(project_root), '.generated', target_platform.to_s)
  dst_xcodeproj = File.join(destination, xcodeproj)

  # Copy/link Xcode project files
  FileUtils.mkdir_p(dst_xcodeproj)
  FileUtils.cp(File.join(src_xcodeproj, 'project.pbxproj'), dst_xcodeproj)
  FileUtils.ln_sf(File.join(src_xcodeproj, 'xcshareddata'), dst_xcodeproj)

  # Link source files
  %w[ReactTestApp ReactTestAppTests ReactTestAppUITests].each do |file|
    FileUtils.ln_sf(project_path(file, target_platform), destination)
  end

  # Shared code lives in `ios/ReactTestApp/`
  if target_platform != :ios
    source = File.expand_path('ReactTestApp', __dir__)
    FileUtils.ln_sf(source, File.join(destination, 'ReactTestAppShared'))
  end

  react_native = react_native_path(project_root, target_platform)
  version = package_version(react_native.to_s).segments
  version = version[0] * 10_000 + version[1] * 100 + version[2]
  version_macro = "REACT_NATIVE_VERSION=#{version}"

  product_bundle_identifier = bundle_identifier(project_root, target_platform)
  supports_flipper = target_platform == :ios && flipper_enabled?(version)

  app_project = Xcodeproj::Project.open(dst_xcodeproj)
  app_project.native_targets.each do |target|
    next if target.name != 'ReactTestApp'

    target.build_configurations.each do |config|
      use_flipper = config.name == 'Debug' && supports_flipper

      config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= [
        '$(inherited)',
        version_macro,
        'FB_SONARKIT_ENABLED=' + (use_flipper ? '1' : '0'),
        'USE_FLIPPER=' + (use_flipper ? '1' : '0'),
      ]

      if product_bundle_identifier.is_a? String
        config.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = product_bundle_identifier
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

  dst_xcodeproj
end

def use_test_app_internal!(target_platform)
  assert(%i[ios macos].include?(target_platform), "Unsupported platform: #{target_platform}")

  xcodeproj = 'ReactTestApp.xcodeproj'
  project_root = find_project_root
  dst_xcodeproj = make_project!(xcodeproj, project_root, target_platform)

  require_relative(autolink_script_path)

  platform :ios, '12.0' if target_platform == :ios
  platform :osx, '10.14' if target_platform == :macos

  project dst_xcodeproj

  target 'ReactTestApp' do
    pod 'QRCodeReader.swift' if target_platform == :ios
    pod 'SwiftLint'

    use_react_native!(project_root, target_platform)

    if (resources_pod_path = resources_pod(project_root, target_platform))
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
    puts ''
    puts 'NOTE'
    puts "  `#{xcodeproj}` was sourced from `react-native-test-app`"
    puts '  All modifications will be overwritten next time you run `pod install`'
    puts ''

    installer.pods_project.targets.each do |target|
      case target.name
      when 'SwiftLint'
        # Let SwiftLint inherit the deployment target from the Pods project
        target.build_configurations.each do |config|
          config.build_settings.delete('IPHONEOS_DEPLOYMENT_TARGET')
          config.build_settings.delete('MACOSX_DEPLOYMENT_TARGET')
        end
      when 'YogaKit' # Flipper
        target.build_configurations.each do |config|
          config.build_settings['SWIFT_VERSION'] = '4.1'
        end
      end
    end
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
