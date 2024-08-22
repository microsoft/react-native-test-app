require 'json'

package = JSON.parse(File.read(File.join('..', 'package.json')))

Pod::Spec.new do |s|
  s.name      = File.basename(__FILE__, '.podspec')
  s.version   = package['version']
  s.author    = { package['author']['name'] => package['author']['email'] }
  s.license   = package['license']
  s.homepage  = package['homepage']
  s.source    = { :git => package['repository']['url'] }
  s.summary   = 'Example tests'

  s.ios.deployment_target = '15.1'
  s.osx.deployment_target = '12.0'
  s.visionos.deployment_target = '1.0'

  s.dependency 'React'
  s.dependency 'ReactTestApp-DevSupport'

  s.framework             = 'XCTest'
  s.user_target_xcconfig  = { 'ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES' => '$(inherited)' }

  s.source_files = 'ios/ExampleTests/**/*.{m,swift}'
end
