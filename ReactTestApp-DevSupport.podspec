require 'json'

# For some reason, functions defined here are not visible in the Podspec:
#     undefined method `deployment_target' for Pod:Module.
# But procedures and lambdas work fine.
deployment_target = lambda do |target_platform|
  xcodeproj = File.join(__dir__, target_platform.to_s, 'ReactTestApp.xcodeproj')
  project = Xcodeproj::Project.open(xcodeproj)
  settings = {
    ios: 'IPHONEOS_DEPLOYMENT_TARGET',
    macos: 'MACOSX_DEPLOYMENT_TARGET',
    visionos: 'XROS_DEPLOYMENT_TARGET',
  }
  setting = settings[target_platform]
  project.build_configurations[0].resolve_build_setting(setting)
end

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))
version = package['version']

Pod::Spec.new do |s|
  s.name      = File.basename(__FILE__, '.podspec')
  s.version   = version
  s.author    = { package['author']['name'] => package['author']['email'] }
  s.license   = package['license']
  s.homepage  = package['homepage']
  s.source    = { :git => package['repository']['url'], :tag => version }
  s.summary   = package['description']

  s.ios.deployment_target = deployment_target.call('ios')
  s.osx.deployment_target = deployment_target.call('macos')
  s.visionos.deployment_target = deployment_target.call('visionos')

  s.dependency 'React-Core'
  s.dependency 'React-jsi'

  s.pod_target_xcconfig = {
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++20',
    'DEFINES_MODULE' => 'YES',
    'SWIFT_OBJC_BRIDGING_HEADER' =>
      'ios/ReactTestApp/Public/ReactTestApp-DevSupport-Bridging-Header.h',
  }

  s.source_files         = 'common/AppRegistry.{cpp,h}',
                           'ios/ReactTestApp/AppRegistryModule.{h,mm}',
                           'ios/ReactTestApp/Public/*.h',
                           'ios/ReactTestApp/ReactTestApp-DevSupport.m'
  s.public_header_files  = 'ios/ReactTestApp/Public/*.h'
end
