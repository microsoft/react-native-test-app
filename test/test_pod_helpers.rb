require('minitest/autorun')

require_relative('../ios/pod_helpers')

class TestPodHelpers < Minitest::Test
  def test_fabric_enabled?
    ENV.delete('RCT_NEW_ARCH_ENABLED')

    refute(fabric_enabled?({}, 0))
    refute(fabric_enabled?({}, 6800))

    # Fabric is first publicly available in 0.68
    refute(fabric_enabled?({ :fabric_enabled => true }, 6799))
    assert(fabric_enabled?({ :fabric_enabled => true }, 6800))

    # TurboModule implies Fabric
    refute(fabric_enabled?({ :turbomodule_enabled => true }, 6799))
    assert(fabric_enabled?({ :turbomodule_enabled => true }, 6800))

    # `RCT_NEW_ARCH_ENABLED` enables everything
    ENV['RCT_NEW_ARCH_ENABLED'] = '1'

    refute(fabric_enabled?({}, 6799))
    assert(fabric_enabled?({}, 6800))
  end

  def test_new_architecture_enabled?
    ENV.delete('RCT_NEW_ARCH_ENABLED')

    refute(new_architecture_enabled?({}, 0))
    refute(new_architecture_enabled?({}, 6800))

    # New architecture is first publicly available in 0.68
    refute(new_architecture_enabled?({ :turbomodule_enabled => true }, 6799))
    assert(new_architecture_enabled?({ :turbomodule_enabled => true }, 6800))

    # Fabric does not imply TurboModule
    refute(new_architecture_enabled?({ :fabric_enabled => true }, 6800))

    # `RCT_NEW_ARCH_ENABLED` enables everything
    ENV['RCT_NEW_ARCH_ENABLED'] = '1'

    refute(new_architecture_enabled?({}, 6799))
    assert(new_architecture_enabled?({}, 6800))
  end
end
