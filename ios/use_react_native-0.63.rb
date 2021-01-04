#
# Copyright (c) Microsoft Corporation
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.
#

def include_react_native!(options)
  react_native, flipper_versions, project_root, target_platform = options.values_at(
    :path, :rta_flipper_versions, :rta_project_root, :rta_target_platform
  )

  require_relative File.join(project_root, react_native, 'scripts', 'react_native_pods')

  use_flipper!(flipper_versions) if target_platform == :ios && flipper_versions
  use_react_native!(options)
end
