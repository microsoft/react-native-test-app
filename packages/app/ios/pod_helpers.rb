require('json')

def assert(condition, message)
  raise message unless condition
end

def assert_version(pod_version)
  if ['1.15.0', '1.15.1'].include?(pod_version)
    raise "CocoaPods #{pod_version} does not work with React Native; upgrade " \
          'to 1.15.2 or higher'
  end

  version = Gem::Version.new(pod_version).segments
  version = v(version[0], version[1], version[2])
  return unless version < v(1, 13, 0)

  raise 'React Native requires a more recent version of CocoaPods; found ' \
        "#{pod_version}, expected >=1.13"
end

def find_file(file_name, current_dir)
  return if current_dir.expand_path.to_s == '/'

  path = current_dir + file_name
  return path if File.exist?(path)

  find_file(file_name, current_dir.parent)
end

def use_hermes?(options)
  use_hermes = options[:use_hermes]
  ENV['RCT_BUILD_HERMES_FROM_SOURCE'] = 'true' if use_hermes == 'from-source'
  use_hermes != false
end

def use_new_architecture!(options, _react_native_version)
  return unless options[:use_new_arch]

  options[:fabric_enabled] = true
  options[:new_arch_enabled] = true
  ENV['RCT_NEW_ARCH_ENABLED'] = '1'
  ENV['USE_BRIDGELESS'] = '1' if options[:use_bridgeless]
end

def v(major, minor, patch)
  (major * 1_000_000) + (minor * 1_000) + patch
end
