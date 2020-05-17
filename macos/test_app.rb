#
# Copyright (c) Microsoft Corporation. All rights reserved.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.
#

require_relative('../ios/test_app.rb')

def use_test_app!
  use_test_app_internal!(:macos) do |target|
    yield target if block_given?
  end
end
