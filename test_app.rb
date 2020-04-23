#
# Copyright (c) Microsoft Corporation. All rights reserved.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.
#

require('json')
require('pathname')

def autolink_script_path
  package_path = resolve_module('@react-native-community/cli-platform-ios')
  File.join(package_path, 'native_modules')
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
  raise "Could not find 'Podfile'" if podfile_path.nil?

  Pathname.new(File.dirname(podfile_path.absolute_path))
end

def nearest_node_modules(project_root)
  path = find_file('node_modules', project_root)
  raise "Could not find 'node_modules'" if path.nil?

  path
end

def resolve_module(request)
  script = "console.log(path.dirname(require.resolve('#{request}/package.json')));"
  Pod::Executable.execute_command('node', ['-e', script], true).strip
end

def resolve_resources(manifest)
  resources = manifest['resources']
  return if !resources || resources.empty?

  resources.instance_of?(Array) ? resources : resources['ios']
end

def resources_pod(project_root)
  app_manifest = find_file('app.json', project_root)
  return if app_manifest.nil?

  resources = resolve_resources(JSON.parse(File.read(app_manifest)))
  return if !resources.instance_of?(Array) || resources.empty?

  spec = {
    'name' => 'ReactTestApp-Resources',
    'version' => '1.0.0-dev',
    'summary' => 'Resources for ReactTestApp',
    'homepage' => 'https://github.com/microsoft/react-native-test-app',
    'license' => 'Unlicense',
    'authors' => '@microsoft/react-native-test-app',
    'source' => { 'git' => 'https://github.com/microsoft/react-native-test-app.git' },
    'resources' => resources
  }

  app_dir = File.dirname(app_manifest)
  podspec_path = File.join(app_dir, 'ReactTestApp-Resources.podspec.json')
  File.write(podspec_path, spec.to_json)
  at_exit { File.delete(podspec_path) if File.exist?(podspec_path) }
  Pathname.new(app_dir).relative_path_from(project_root).to_s
end

def use_react_native!(project_root)
  react_native = Pathname.new(resolve_module('react-native'))

  package_json = JSON.parse(File.read(File.join(react_native.to_s, 'package.json')))
  version = package_json['version'].match(/(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)/)

  if version[:major] == '0' && version[:minor] == '60'
    require_relative('ios/use_react_native-0.60')
  elsif version[:major] == '0' && version[:minor] == '61'
    require_relative('ios/use_react_native-0.61')
  else
    throw "Unsupported React Native version: #{version[0]}"
  end

  include_react_native!(react_native.relative_path_from(project_root).to_s)
end

def use_test_app!
  xcodeproj = 'ReactTestApp.xcodeproj'
  src_xcodeproj = File.join(__dir__, 'ios', xcodeproj)
  project_root = find_project_root
  destination = File.join(nearest_node_modules(project_root), '.generated')
  dst_xcodeproj = File.join(destination, xcodeproj)

  # Copy/link Xcode project files
  FileUtils.mkdir_p(dst_xcodeproj)
  FileUtils.cp(File.join(src_xcodeproj, 'project.pbxproj'), dst_xcodeproj)
  FileUtils.ln_sf(File.join(src_xcodeproj, 'xcshareddata'), dst_xcodeproj)

  # Link source files
  %w[ReactTestApp ReactTestAppTests ReactTestAppUITests].each do |file|
    FileUtils.ln_sf(File.join(__dir__, 'ios', file), destination)
  end

  require_relative(autolink_script_path)

  platform :ios, '12.0'

  project dst_xcodeproj

  target 'ReactTestApp' do
    pod 'QRCodeReader.swift'
    pod 'SwiftLint'

    use_react_native!(project_root)

    if (resources_pod_path = resources_pod(project_root))
      pod 'ReactTestApp-Resources', :path => resources_pod_path
    end

    yield ReactTestAppTargets.new(self) if block_given?

    use_native_modules! '.'
  end

  post_install do
    puts ''
    puts 'NOTE'
    puts "  `#{xcodeproj}` was sourced from `react-native-test-app`"
    puts '  All modifications will be overwritten next time you run `pod install`'
    puts ''
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
