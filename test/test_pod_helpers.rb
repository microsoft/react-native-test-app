require('minitest/autorun')

require_relative('../ios/pod_helpers')

class TestPodHelpers < Minitest::Test
  def test_new_architecture_enabled?
    ENV.delete('RCT_NEW_ARCH_ENABLED')

    refute(new_architecture_enabled?({}, 0))
    refute(new_architecture_enabled?({}, v(0, 71, 0)))

    # New architecture is first publicly available in 0.68, but we'll require 0.71
    refute(new_architecture_enabled?({ :fabric_enabled => true }, v(0, 70, 999)))
    assert(new_architecture_enabled?({ :fabric_enabled => true }, v(0, 71, 0)))

    # TODO: `:turbomodule_enabled` is scheduled for removal in 4.0
    refute(new_architecture_enabled?({ :turbomodule_enabled => true }, v(0, 70, 999)))
    assert(new_architecture_enabled?({ :turbomodule_enabled => true }, v(0, 71, 0)))

    # `RCT_NEW_ARCH_ENABLED` enables everything
    ENV['RCT_NEW_ARCH_ENABLED'] = '1'

    refute(new_architecture_enabled?({}, v(0, 70, 999)))
    assert(new_architecture_enabled?({}, v(0, 71, 0)))
  end

  def test_v
    assert_equal(0, v(0, 0, 0))
    assert_equal(0, v(0, 0, 0))
    assert_equal(1, v(0, 0, 1))
    assert_equal(1_000, v(0, 1, 0))
    assert_equal(1_001, v(0, 1, 1))
    assert_equal(1_000_000, v(1, 0, 0))
    assert_equal(1_000_001, v(1, 0, 1))
    assert_equal(1_001_000, v(1, 1, 0))
    assert_equal(1_001_001, v(1, 1, 1))
  end
end
