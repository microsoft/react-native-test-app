#
# Copyright (c) Microsoft Corporation. All rights reserved.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.
#

def resolve_module(request)
  script = "console.log(path.dirname(require.resolve('#{request}/package.json')));"
  Pod::Executable.execute_command('node', ['-e', script], true).strip
end

def try_pod(name, podspec, project_root)
  pod name, :podspec => podspec if File.exist?(File.join(project_root, podspec))
end
