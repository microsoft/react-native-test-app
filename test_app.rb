#
# Copyright (c) Microsoft Corporation. All rights reserved.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.
#

def autolink_script_path()
  package_path = resolve_module('@react-native-community/cli-platform-ios')
  File.join(package_path, 'native_modules')
end

def resolve_module(request)
  script = "console.log(path.dirname(require.resolve('#{request}/package.json')));"
  Pod::Executable.execute_command('node', ['-e', script], true).strip
end

def resources_pod(package_root, current_dir = package_root)
  return if File.expand_path(current_dir) == '/'

  app_manifest = File.join(current_dir, 'app.json')
  return resources_pod(package_root, File.join(current_dir, '..')) if !File.exist?(app_manifest)

  resources = JSON.parse(File.read(app_manifest))['resources']
  return if !resources.instance_of? Array or resources.empty?

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

  podspec_path = File.join(current_dir, 'ReactTestApp-Resources.podspec.json')
  File.write(podspec_path, spec.to_json())
  at_exit { File.delete(podspec_path) }
  Pathname.new(current_dir).relative_path_from(package_root).to_s()
end

def use_test_app!(package_root)
  platform :ios, '12.0'

  xcodeproj = 'ReactTestApp.xcodeproj'
  if package_root != __dir__
    src_xcodeproj = File.join(__dir__, 'ios', xcodeproj)
    destination = File.join(package_root, 'node_modules', '.generated')
    dst_xcodeproj = File.join(destination, xcodeproj)

    # Copy/link Xcode project files
    FileUtils.mkdir_p(dst_xcodeproj)
    FileUtils.cp(File.join(src_xcodeproj, 'project.pbxproj'), dst_xcodeproj)
    FileUtils.ln_sf(File.join(src_xcodeproj, 'xcshareddata'), dst_xcodeproj)

    # Link source files
    ['ReactTestApp', 'ReactTestAppTests', 'ReactTestAppUITests'].each do |file|
      FileUtils.ln_sf(File.join(__dir__, 'ios', file), destination)
    end

    project dst_xcodeproj

    post_install do |installer|
      puts ''
      puts 'NOTE'
      puts "  `#{xcodeproj}` was sourced from `react-native-test-app`"
      puts '  All modifications will be overwritten next time you run `pod install`'
      puts ''
    end
  else
    project xcodeproj
  end

  require_relative autolink_script_path

  react_native = Pathname.new(resolve_module('react-native'))
    .relative_path_from(Pathname.new(package_root))
    .to_s

  target 'ReactTestApp' do
    pod 'QRCodeReader.swift'
    pod 'SwiftLint'

    # React Native
    pod 'React', :path => react_native
    pod 'React-Core', :path => "#{react_native}/React", :inhibit_warnings => true
    pod 'React-DevSupport', :path => "#{react_native}/React"
    pod 'React-RCTActionSheet', :path => "#{react_native}/Libraries/ActionSheetIOS"
    pod 'React-RCTAnimation', :path => "#{react_native}/Libraries/NativeAnimation"
    pod 'React-RCTBlob', :path => "#{react_native}/Libraries/Blob"
    pod 'React-RCTImage', :path => "#{react_native}/Libraries/Image"
    pod 'React-RCTLinking', :path => "#{react_native}/Libraries/LinkingIOS"
    pod 'React-RCTNetwork', :path => "#{react_native}/Libraries/Network"
    pod 'React-RCTSettings', :path => "#{react_native}/Libraries/Settings"
    pod 'React-RCTText', :path => "#{react_native}/Libraries/Text", :inhibit_warnings => true
    pod 'React-RCTVibration', :path => "#{react_native}/Libraries/Vibration"
    pod 'React-RCTWebSocket', :path => "#{react_native}/Libraries/WebSocket"

    pod 'React-cxxreact', :path => "#{react_native}/ReactCommon/cxxreact", :inhibit_warnings => true
    pod 'React-jsi', :path => "#{react_native}/ReactCommon/jsi"
    pod 'React-jsiexecutor', :path => "#{react_native}/ReactCommon/jsiexecutor"
    pod 'React-jsinspector', :path => "#{react_native}/ReactCommon/jsinspector"
    pod 'yoga', :path => "#{react_native}/ReactCommon/yoga"

    pod 'DoubleConversion', :podspec => "#{react_native}/third-party-podspecs/DoubleConversion.podspec"
    pod 'glog', :podspec => "#{react_native}/third-party-podspecs/glog.podspec"
    pod 'Folly', :podspec => "#{react_native}/third-party-podspecs/Folly.podspec"

    resources_pod_path = resources_pod(package_root)
    pod 'ReactTestApp-Resources', :path => resources_pod_path unless resources_pod_path.nil?

    yield ReactTestAppTargets.new(self) if block_given?

    use_native_modules! '.'
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
