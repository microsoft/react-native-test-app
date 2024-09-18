require('json')
require_relative('pod_helpers')

def find_node
  node_bin = `which node`.strip!
  return node_bin if `file #{node_bin}`.include? 'Mach-O'

  # If a wrapper is found, remove the path from `PATH` and try again. This can
  # sometimes happen when `pod install` is run inside a "virtual" environment
  # like [Turborepo](https://turbo.build).
  bin_dir = File.dirname(node_bin)
  filtered_paths = ENV['PATH'].split(':').reject { |p| p.eql?(bin_dir) }
  raise "Could not find Node" if filtered_paths.empty?

  ENV['PATH'] = filtered_paths.join(':')

  find_node
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
