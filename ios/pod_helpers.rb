def find_file(file_name, current_dir)
  return if current_dir.expand_path.to_s == '/'

  path = current_dir + file_name
  return path if File.exist?(path)

  find_file(file_name, current_dir.parent)
end

def resolve_module(request)
  @module_cache ||= {}
  return @module_cache[request] if @module_cache.key?(request)

  package_json = find_file("node_modules/#{request}/package.json", Pathname.pwd)
  raise "Cannot find module '#{request}'" if package_json.nil?

  @module_cache[request] = package_json.dirname.to_s
end

def try_pod(name, podspec, project_root)
  pod name, :podspec => podspec if File.exist?(File.join(project_root, podspec))
end
