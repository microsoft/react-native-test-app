#
# Copyright (c) Microsoft Corporation. All rights reserved.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.
#
# rubocop:disable Layout/LineLength

def include_react_native!(react_native, target_platform, project_root)
  react_native = "#{react_native}-macos" if target_platform == :macos

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
  pod 'ReactCommon/jscallinvoker', :path => "#{react_native}/ReactCommon"
  pod 'ReactCommon/turbomodule/core', :path => "#{react_native}/ReactCommon"
  pod 'Yoga', :path => "#{react_native}/ReactCommon/yoga"

  pod 'DoubleConversion', :podspec => "#{react_native}/third-party-podspecs/DoubleConversion.podspec"
  pod 'glog', :podspec => "#{react_native}/third-party-podspecs/glog.podspec"
  pod 'Folly', :podspec => "#{react_native}/third-party-podspecs/Folly.podspec"

  # Required by `react-native-macos` otherwise it will find Boost elsewhere
  boost = "#{react_native}/third-party-podspecs/boost-for-react-native.podspec"
  pod 'boost-for-react-native', :podspec => boost if File.exist?(File.join(project_root, boost))
end

# rubocop:enable Layout/LineLength
