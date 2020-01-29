# Copyright (c) Microsoft Corporation. All rights reserved.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

def use_test_app!(packageRoot)
  platform :ios, '12.0'

  xcodeproj = 'ReactTestApp.xcodeproj'
  if packageRoot != __dir__
    src_xcodeproj = File.join(__dir__, "ios", xcodeproj)
    destination = File.join(packageRoot, "node_modules", ".generated")
    dst_xcodeproj = File.join(destination, xcodeproj)

    # Copy/link Xcode project files
    FileUtils.mkdir_p(dst_xcodeproj)
    FileUtils.cp(File.join(src_xcodeproj, 'project.pbxproj'), dst_xcodeproj)
    FileUtils.ln_sf(File.join(src_xcodeproj, 'project.xcworkspace'), dst_xcodeproj)
    FileUtils.ln_sf(File.join(src_xcodeproj, 'xcshareddata'), dst_xcodeproj)

    # Link source files
    ['ReactTestApp', 'ReactTestAppTests', 'ReactTestAppUITests'].each do |file|
      FileUtils.ln_sf(File.join(__dir__, "ios", file), destination)
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

  require_relative File.join(packageRoot, 'node_modules/@react-native-community/cli-platform-ios/native_modules')

  target 'ReactTestApp' do
    pod 'QRCodeReader.swift'
    pod 'SwiftLint'

    # React Native
    pod 'React', :path => 'node_modules/react-native'
    pod 'React-Core', :path => 'node_modules/react-native/React', :inhibit_warnings => true
    pod 'React-DevSupport', :path => 'node_modules/react-native/React'
    pod 'React-RCTActionSheet', :path => 'node_modules/react-native/Libraries/ActionSheetIOS'
    pod 'React-RCTAnimation', :path => 'node_modules/react-native/Libraries/NativeAnimation'
    pod 'React-RCTBlob', :path => 'node_modules/react-native/Libraries/Blob'
    pod 'React-RCTImage', :path => 'node_modules/react-native/Libraries/Image'
    pod 'React-RCTLinking', :path => 'node_modules/react-native/Libraries/LinkingIOS'
    pod 'React-RCTNetwork', :path => 'node_modules/react-native/Libraries/Network'
    pod 'React-RCTSettings', :path => 'node_modules/react-native/Libraries/Settings'
    pod 'React-RCTText', :path => 'node_modules/react-native/Libraries/Text', :inhibit_warnings => true
    pod 'React-RCTVibration', :path => 'node_modules/react-native/Libraries/Vibration'
    pod 'React-RCTWebSocket', :path => 'node_modules/react-native/Libraries/WebSocket'

    pod 'React-cxxreact', :path => 'node_modules/react-native/ReactCommon/cxxreact', :inhibit_warnings => true
    pod 'React-jsi', :path => 'node_modules/react-native/ReactCommon/jsi'
    pod 'React-jsiexecutor', :path => 'node_modules/react-native/ReactCommon/jsiexecutor'
    pod 'React-jsinspector', :path => 'node_modules/react-native/ReactCommon/jsinspector'
    pod 'yoga', :path => 'node_modules/react-native/ReactCommon/yoga'

    pod 'DoubleConversion', :podspec => 'node_modules/react-native/third-party-podspecs/DoubleConversion.podspec'
    pod 'glog', :podspec => 'node_modules/react-native/third-party-podspecs/glog.podspec'
    pod 'Folly', :podspec => 'node_modules/react-native/third-party-podspecs/Folly.podspec'

    pod 'ReactTestApp', :path => Pathname.new(__dir__).relative_path_from(packageRoot).to_s

    yield 'app'

    target 'ReactTestAppTests' do
      inherit! :search_paths
      yield 'tests'
    end

    target 'ReactTestAppUITests' do
      inherit! :search_paths
      yield 'uitests'
    end

    use_native_modules! '.'
  end
end
