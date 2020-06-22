#
# Copyright (c) Microsoft Corporation. All rights reserved.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.
#
# rubocop:disable Layout/LineLength

def add_flipper_pods!(versions = {})
  versions['Flipper'] ||= '~> 0.33.1'
  versions['DoubleConversion'] ||= '1.1.7'
  versions['Flipper-Folly'] ||= '~> 2.1'
  versions['Flipper-Glog'] ||= '0.3.6'
  versions['Flipper-PeerTalk'] ||= '~> 0.0.4'
  versions['Flipper-RSocket'] ||= '~> 1.0'

  pod 'FlipperKit', versions['Flipper'], :configuration => 'Debug'
  pod 'FlipperKit/FlipperKitLayoutPlugin', versions['Flipper'], :configuration => 'Debug'
  pod 'FlipperKit/SKIOSNetworkPlugin', versions['Flipper'], :configuration => 'Debug'
  pod 'FlipperKit/FlipperKitUserDefaultsPlugin', versions['Flipper'], :configuration => 'Debug'
  pod 'FlipperKit/FlipperKitReactPlugin', versions['Flipper'], :configuration => 'Debug'

  # List all transitive dependencies for FlipperKit pods
  # to avoid them being linked in Release builds
  pod 'Flipper', versions['Flipper'], :configuration => 'Debug'
  pod 'Flipper-DoubleConversion', versions['DoubleConversion'], :configuration => 'Debug'
  pod 'Flipper-Folly', versions['Flipper-Folly'], :configuration => 'Debug'
  pod 'Flipper-Glog', versions['Flipper-Glog'], :configuration => 'Debug'
  pod 'Flipper-PeerTalk', versions['Flipper-PeerTalk'], :configuration => 'Debug'
  pod 'Flipper-RSocket', versions['Flipper-RSocket'], :configuration => 'Debug'
  pod 'FlipperKit/Core', versions['Flipper'], :configuration => 'Debug'
  pod 'FlipperKit/CppBridge', versions['Flipper'], :configuration => 'Debug'
  pod 'FlipperKit/FBCxxFollyDynamicConvert', versions['Flipper'], :configuration => 'Debug'
  pod 'FlipperKit/FBDefines', versions['Flipper'], :configuration => 'Debug'
  pod 'FlipperKit/FKPortForwarding', versions['Flipper'], :configuration => 'Debug'
  pod 'FlipperKit/FlipperKitHighlightOverlay', versions['Flipper'], :configuration => 'Debug'
  pod 'FlipperKit/FlipperKitLayoutTextSearchable', versions['Flipper'], :configuration => 'Debug'
  pod 'FlipperKit/FlipperKitNetworkPlugin', versions['Flipper'], :configuration => 'Debug'
end

def include_react_native!(react_native:, target_platform:, project_root:, flipper_versions:)
  add_flipper_pods!(flipper_versions) if target_platform == :ios && flipper_versions

  pod 'FBLazyVector', :path => "#{react_native}/Libraries/FBLazyVector"
  pod 'FBReactNativeSpec', :path => "#{react_native}/Libraries/FBReactNativeSpec"
  pod 'RCTRequired', :path => "#{react_native}/Libraries/RCTRequired"
  pod 'RCTTypeSafety', :path => "#{react_native}/Libraries/TypeSafety"
  pod 'React', :path => "#{react_native}/"
  pod 'React-Core', :path => "#{react_native}/", :inhibit_warnings => true
  pod 'React-CoreModules', :path => "#{react_native}/React/CoreModules"
  pod 'React-Core/DevSupport', :path => "#{react_native}/"
  pod 'React-RCTActionSheet', :path => "#{react_native}/Libraries/ActionSheetIOS"
  pod 'React-RCTAnimation', :path => "#{react_native}/Libraries/NativeAnimation"
  pod 'React-RCTBlob', :path => "#{react_native}/Libraries/Blob"
  pod 'React-RCTImage', :path => "#{react_native}/Libraries/Image"
  pod 'React-RCTLinking', :path => "#{react_native}/Libraries/LinkingIOS"
  pod 'React-RCTNetwork', :path => "#{react_native}/Libraries/Network"
  pod 'React-RCTSettings', :path => "#{react_native}/Libraries/Settings"
  pod 'React-RCTText', :path => "#{react_native}/Libraries/Text", :inhibit_warnings => true
  pod 'React-RCTVibration', :path => "#{react_native}/Libraries/Vibration"
  pod 'React-Core/RCTWebSocket', :path => "#{react_native}/"

  pod 'React-cxxreact', :path => "#{react_native}/ReactCommon/cxxreact", :inhibit_warnings => true
  pod 'React-jsi', :path => "#{react_native}/ReactCommon/jsi"
  pod 'React-jsiexecutor', :path => "#{react_native}/ReactCommon/jsiexecutor"
  pod 'React-jsinspector', :path => "#{react_native}/ReactCommon/jsinspector"
  pod 'ReactCommon/callinvoker', :path => "#{react_native}/ReactCommon"
  pod 'ReactCommon/turbomodule/core', :path => "#{react_native}/ReactCommon"
  pod 'Yoga', :path => "#{react_native}/ReactCommon/yoga", :modular_headers => true

  pod 'DoubleConversion', :podspec => "#{react_native}/third-party-podspecs/DoubleConversion.podspec"
  pod 'glog', :podspec => "#{react_native}/third-party-podspecs/glog.podspec"
  pod 'Folly', :podspec => "#{react_native}/third-party-podspecs/Folly.podspec"
end

# rubocop:enable Layout/LineLength
