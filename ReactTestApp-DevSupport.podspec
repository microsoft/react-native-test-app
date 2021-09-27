require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))
version = package['version']

Pod::Spec.new do |s|
  s.name      = 'ReactTestApp-DevSupport'
  s.version   = version
  s.author    = { package['author']['name'] => package['author']['email'] }
  s.license   = package['license']
  s.homepage  = package['homepage']
  s.source    = { :git => package['repository']['url'], :tag => version }
  s.summary   = package['description']

  s.ios.deployment_target = '12.0'
  s.osx.deployment_target = '10.14'

  s.dependency 'React'

  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }

  s.source_files         = 'common/AppRegistry.{cpp,h}',
                           'ios/ReactTestApp/AppRegistryModule.{h,mm}',
                           'ios/ReactTestApp/Public/*.h',
                           'ios/ReactTestApp/ReactTestApp-DevSupport.m'
  s.public_header_files  = 'ios/ReactTestApp/Public/*.h'
end
