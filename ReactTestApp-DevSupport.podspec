require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))
version = package['version']

# TODO: Find app.json file in user’s project
user_app_root = "/Users/eloy/Code/Microsoft/react-native-test-app/example"
app_manifest = JSON.parse(File.read(File.join(user_app_root, "app.json")))
relative_resources = app_manifest["resources"].map do |r|
  Pathname.new(File.join(user_app_root, r)).relative_path_from(__dir__).to_s
end

Pod::Spec.new do |s|
  s.name      = 'ReactTestApp-DevSupport'
  s.version   = version
  s.author    = { package['author']['name'] => package['author']['email'] }
  s.license   = package['license']
  s.homepage  = package['homepage']
  s.source    = { :git => package['repository']['url'], :tag => version }
  s.summary   = package['description']

  s.ios.deployment_target = '12.0'

  s.source_files         = 'ios/ReactTestApp/Public/*.h'
  s.public_header_files  = 'ios/ReactTestApp/Public/*.h'

  s.resources = relative_resources
end
