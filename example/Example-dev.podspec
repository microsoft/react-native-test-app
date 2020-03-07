require 'json'

package = JSON.parse(File.read(File.join('..', 'package.json')))

Pod::Spec.new do |s|
  s.name      = 'Example-dev'
  s.version   = package['version']
  s.author    = { package['author']['name'] => package['author']['email'] }
  s.license   = package['license']
  s.homepage  = package['homepage']
  s.source    = { :git => package['repository']['url'] }
  s.summary   = 'Assets for Example app'

  s.ios.deployment_target = '12.0'

  s.dependency 'React'

  s.resources       = ['dist/assets', 'dist/main.jsbundle']
  s.preserve_paths  = 'dist/*'
end
