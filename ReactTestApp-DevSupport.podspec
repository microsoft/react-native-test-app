require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))
version = package['version']

Pod::Spec.new do |s|
  s.name      = 'ReactTestApp-DevSupport'
  s.version   = version
  s.author    = { package['author']['name'] => package['author']['email'] }
  s.license   = package['license']
  s.homepage  = package['homepage']
  s.source    = { :git => package['repository']['url'], :tag => "v1.#{version}" }
  s.summary   = package['description']

  s.ios.deployment_target = '12.0'

  s.dependency 'React'

  s.source_files         = 'ios/ReactTestApp/Public/*.h'
  s.public_header_files  = 'ios/ReactTestApp/Public/*.h'
end
