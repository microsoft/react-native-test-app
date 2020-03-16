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

def use_test_app!(package_root, extra_pods = {})
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

    unless extra_pods[:add_app_pods].nil?
      extra_pods[:add_app_pods].call()
    end

    target 'ReactTestAppTests' do
      inherit! :search_paths
      unless extra_pods[:add_test_pods].nil?
        extra_pods[:add_test_pods].call()
      end
    end

    target 'ReactTestAppUITests' do
      inherit! :search_paths
      unless extra_pods[:add_uitest_pods].nil?
        extra_pods[:add_uitest_pods].call()
      end
    end

    use_native_modules! '.'
  end
end
