#
# Copyright (c) Microsoft Corporation. All rights reserved.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.
#

def resolve_module(request)
  @module_cache ||= {}
  return @module_cache[request] if @module_cache.key?(request)

  script = "console.log(path.dirname(require.resolve('#{request}/package.json')));"
  path = Pod::Executable.execute_command('node', ['-e', script], true).strip
  @module_cache[request] = path
end

def try_pod(name, podspec, project_root)
  pod name, :podspec => podspec if File.exist?(File.join(project_root, podspec))
end
