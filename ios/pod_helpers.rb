require('json')

def app_manifest(project_root)
  @app_manifest ||= {}
  return @app_manifest[project_root] if @app_manifest.key?(project_root)

  manifest_path = find_file('app.json', project_root)
  return if manifest_path.nil?

  @app_manifest[project_root] = JSON.parse(File.read(manifest_path))
end

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

def bridgeless_enabled?(options, react_native_version)
  new_architecture_enabled?(options, react_native_version) && (
    (react_native_version >= v(0, 74, 0) && options[:bridgeless_enabled] != false) ||
    (react_native_version >= v(0, 73, 0) && options[:bridgeless_enabled])
  )
end

def find_file(file_name, current_dir)
  return if current_dir.expand_path.to_s == '/'

  path = current_dir + file_name
  return path if File.exist?(path)

  find_file(file_name, current_dir.parent)
end

def new_architecture_enabled?(options, react_native_version)
  return false unless supports_new_architecture?(react_native_version)

  ENV.fetch('RCT_NEW_ARCH_ENABLED', options[:fabric_enabled] ? '1' : '0') != '0'
end

def platform_config(key, project_root, target_platform)
  manifest = app_manifest(project_root)
  return if manifest.nil?

  config = manifest[target_platform.to_s]
  config[key] if !config.nil? && !config.empty?
end

def project_path(file, target_platform)
  File.expand_path(file, File.join(__dir__, '..', target_platform.to_s))
end

def resolve_module(request, start_dir = Pod::Config.instance.installation_root)
  @module_cache ||= {}
  return @module_cache[request] if @module_cache.key?(request)

  @module_cache[request] = resolve_module_uncached(request, start_dir).to_s
end

def resolve_module_relative(request)
  path = resolve_module_uncached(request, Pathname.new(__dir__))
  path.relative_path_from(Pod::Config.instance.installation_root).to_s
end

def resolve_module_uncached(request, start_dir)
  # Always resolve `start_dir` as it may be a symlink
  package_json = find_file("node_modules/#{request}/package.json", start_dir.realdirpath)
  raise "Cannot find module '#{request}'" if package_json.nil?

  package_json.dirname
end

def resolve_resources(manifest, target_platform)
  resources = manifest['resources']
  return if !resources || resources.empty?

  resources.instance_of?(Array) ? resources : resources[target_platform.to_s]
end

def supports_new_architecture?(react_native_version)
  react_native_version.zero? || react_native_version >= v(0, 71, 0)
end

def try_pod(name, podspec, project_root)
  pod name, :podspec => podspec if File.exist?(File.join(project_root, podspec))
end

def use_hermes?(options)
  use_hermes = ENV.fetch('USE_HERMES', nil)
  return use_hermes == '1' unless use_hermes.nil?

  # Hermes prebuilds for visionOS was introduced in 0.76
  is_visionos = options[:path].end_with?('react-native-visionos')
  ENV['RCT_BUILD_HERMES_FROM_SOURCE'] = 'true' if is_visionos && options[:version] < v(0, 76, 0)

  options[:hermes_enabled] == true
end

def use_new_architecture!(options, react_native_version)
  return unless new_architecture_enabled?(options, react_native_version)

  Pod::UI.warn(
    'As of writing, New Architecture (Fabric) is still experimental and ' \
    'subject to change. For more information, please see ' \
    'https://reactnative.dev/docs/next/new-architecture-intro.'
  )

  options[:fabric_enabled] = true
  options[:new_arch_enabled] = true
  ENV['RCT_NEW_ARCH_ENABLED'] = '1'
  ENV['USE_BRIDGELESS'] = '1' if bridgeless_enabled?(options, react_native_version)
end

def v(major, minor, patch)
  (major * 1_000_000) + (minor * 1_000) + patch
end
