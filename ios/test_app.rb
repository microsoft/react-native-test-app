#
# Copyright (c) Microsoft Corporation. All rights reserved.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.
#

require('json')
require('pathname')
require('rubygems/version')

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

def resolve_module(request)
  script = "console.log(path.dirname(require.resolve('#{request}/package.json')));"
  Pod::Executable.execute_command('node', ['-e', script], true).strip
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
  File.write(podspec_path, spec.to_json)
  at_exit { File.delete(podspec_path) if File.exist?(podspec_path) }
  Pathname.new(app_dir).relative_path_from(project_root).to_s
end

def use_flipper!(versions = {})
  @flipper_versions = versions
end

def use_react_native!(project_root, target_platform)
  react_native = Pathname.new(resolve_module('react-native'))
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

  react_native = Pathname.new(resolve_module('react-native'))
  version = package_version(react_native.to_s).segments
  version = version[0] * 10_000 + version[1] * 100 + version[2]
  version_macro = "REACT_NATIVE_VERSION=#{version}"

  app_project = Xcodeproj::Project.open(dst_xcodeproj)
  app_project.native_targets.each do |target|
    next if target.name != 'ReactTestApp'

    target.build_configurations.each do |config|
      use_flipper = config.name == 'Debug' && flipper_enabled?(version)

      config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= [
        '$(inherited)',
        version_macro,
        'FB_SONARKIT_ENABLED=' + (use_flipper ? '1' : '0'),
        'USE_FLIPPER=' + (use_flipper ? '1' : '0'),
      ]

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
      @podfile.inherit! :search_paths
      yield if block_given?
    end
  end

  def ui_tests
    @podfile.target 'ReactTestAppUITests' do
      @podfile.inherit! :search_paths
      yield if block_given?
    end
  end
end
