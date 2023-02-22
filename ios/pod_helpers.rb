def fabric_enabled?(options, react_native_version)
  return true if new_architecture_enabled?(options, react_native_version)

  supports_new_architecture = supports_new_architecture?(react_native_version)
  supports_new_architecture && options[:fabric_enabled]
end

def find_file(file_name, current_dir)
  return if current_dir.expand_path.to_s == '/'

  path = current_dir + file_name
  return path if File.exist?(path)

  find_file(file_name, current_dir.parent)
end

def new_architecture_enabled?(options, react_native_version)
  supports_new_architecture = supports_new_architecture?(react_native_version)
  supports_new_architecture && ENV.fetch('RCT_NEW_ARCH_ENABLED', options[:turbomodule_enabled])
end

def resolve_module(request)
  @module_cache ||= {}
  return @module_cache[request] if @module_cache.key?(request)

  package_json = find_file("node_modules/#{request}/package.json",
                           Pod::Config.instance.installation_root)
  raise "Cannot find module '#{request}'" if package_json.nil?

  @module_cache[request] = package_json.dirname.to_s
end

def supports_new_architecture?(react_native_version)
  react_native_version.zero? || react_native_version >= 6800
end

def try_pod(name, podspec, project_root)
  pod name, :podspec => podspec if File.exist?(File.join(project_root, podspec))
end

def use_new_architecture!(options)
  new_arch_enabled = new_architecture_enabled?(options, 10_000_000)

  if new_arch_enabled || options[:fabric_enabled]
    Pod::UI.warn(
      'As of writing, Fabric is still experimental and subject to change. ' \
      'For more information, please see ' \
      'https://reactnative.dev/docs/next/new-architecture-intro.'
    )
    ENV['RCT_NEW_ARCH_ENABLED'] = '1'
  end

  return unless new_arch_enabled

  Pod::UI.warn(
    'As of writing, TurboModule is still experimental and subject to change. ' \
    'For more information, please see ' \
    'https://reactnative.dev/docs/next/new-architecture-intro.'
  )

  # At the moment, Fabric and TurboModule code are intertwined. We need to
  # enable Fabric for some code that TurboModule relies on.
  options[:fabric_enabled] = true
  options[:new_arch_enabled] = true
  options[:turbomodule_enabled] = true
  ENV['RCT_NEW_ARCH_ENABLED'] = '1'
end
