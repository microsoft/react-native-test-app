require_relative('../ios/test_app')

def use_test_app!(options = {}, &block)
  use_test_app_internal!(:macos, options, &block)
end
