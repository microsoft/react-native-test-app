#
# Copyright (c) Microsoft Corporation
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.
#

def include_react_native!(react_native:, target_platform:, project_root:, flipper_versions:)
  require_relative "#{File.join(project_root, react_native)}/scripts/react_native_pods"
  use_flipper!(flipper_versions) if target_platform == :ios && flipper_versions
  use_react_native!(:path => react_native)
end
