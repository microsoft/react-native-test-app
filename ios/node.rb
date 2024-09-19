require('json')
require_relative('pod_helpers')

def find_node
  # If `pod install` is run inside a "virtual" environment like
  # [Yarn](https://yarnpkg.com/), we might find Node wrappers instead of the
  # actual binary.
  paths = `type --all --path node`.split("\n")
  i = paths.find_index { |bin| `file #{bin}`.include? 'Mach-O' }
  raise 'Could not find Node' if i.nil?

  paths[i]
end

def nearest_node_modules(project_root)
  path = find_file('node_modules', project_root)
  assert(!path.nil?, "Could not find 'node_modules'")

  path
end

def package_version(package_path)
  package_json = JSON.parse(File.read(File.join(package_path, 'package.json')))
  Gem::Version.new(package_json['version'])
end
