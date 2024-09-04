require('minitest/autorun')

require_relative('../ios/pod_helpers')

class TestPodHelpers < Minitest::Test
  def test_assert_version
    ['1.12.999', '1.15.0', '1.15.1'].each do |version|
      assert_raises(RuntimeError) do
        assert_version(version)
      end
    end

    assert_silent do
      ['1.13.0', '1.14.0', '1.15.2'].each do |version|
        assert_version(version)
      end
    end
  end

  def test_bridgeless_enabled?
    ENV.delete('RCT_NEW_ARCH_ENABLED')

    # Bridgeless mode is first publicly available in 0.73
    available_version = v(0, 73, 0)

    # Bridgeless mode is enabled by default starting with 0.74
    default_version = v(0, 74, 0)

    refute(bridgeless_enabled?({}, 0))
    refute(bridgeless_enabled?({}, available_version))

    options = { bridgeless_enabled: true, fabric_enabled: true }

    refute(bridgeless_enabled?(options, v(0, 72, 999)))
    assert(bridgeless_enabled?(options, available_version))

    # Bridgeless mode is enabled by default starting with 0.74 unless opted-out of
    assert(bridgeless_enabled?({ fabric_enabled: true }, default_version))
    refute(bridgeless_enabled?({ bridgeless_enabled: false, fabric_enabled: true },
                               default_version))

    # `RCT_NEW_ARCH_ENABLED` does not enable bridgeless
    ENV['RCT_NEW_ARCH_ENABLED'] = '1'

    refute(bridgeless_enabled?({}, v(0, 72, 999)))
    refute(bridgeless_enabled?({}, available_version))
    assert(bridgeless_enabled?({}, default_version))
    refute(bridgeless_enabled?({ bridgeless_enabled: false }, default_version))
  end

  def test_new_architecture_enabled?
    ENV.delete('RCT_NEW_ARCH_ENABLED')

    # New architecture is first publicly available in 0.68, but we'll require 0.71
    available_version = v(0, 71, 0)

    refute(new_architecture_enabled?({}, 0))
    refute(new_architecture_enabled?({}, available_version))

    # New architecture is first publicly available in 0.68, but we'll require 0.71
    refute(new_architecture_enabled?({ fabric_enabled: true }, v(0, 70, 999)))
    assert(new_architecture_enabled?({ fabric_enabled: true }, available_version))

    # TODO: `:turbomodule_enabled` is scheduled for removal in 4.0
    refute(new_architecture_enabled?({ turbomodule_enabled: true }, v(0, 70, 999)))
    assert(new_architecture_enabled?({ turbomodule_enabled: true }, available_version))

    # `RCT_NEW_ARCH_ENABLED` enables everything
    ENV['RCT_NEW_ARCH_ENABLED'] = '1'

    refute(new_architecture_enabled?({}, v(0, 70, 999)))
    assert(new_architecture_enabled?({}, available_version))

    # `RCT_NEW_ARCH_ENABLED` disables everything
    ENV['RCT_NEW_ARCH_ENABLED'] = '0'

    refute(new_architecture_enabled?({}, v(0, 70, 999)))
    refute(new_architecture_enabled?({}, available_version))
    refute(new_architecture_enabled?({ fabric_enabled: true }, available_version))
    refute(new_architecture_enabled?({ turbomodule_enabled: true }, available_version))

    ENV.delete('RCT_NEW_ARCH_ENABLED')
  end

  def test_use_hermes?
    ENV.delete('USE_HERMES')

    refute(use_hermes?({}))
    assert(use_hermes?({ hermes_enabled: true }))

    ENV['USE_HERMES'] = '0'

    refute(use_hermes?({}))
    refute(use_hermes?({ hermes_enabled: true }))

    ENV['USE_HERMES'] = '1'

    assert(use_hermes?({}))
    assert(use_hermes?({ hermes_enabled: true }))

    ENV.delete('USE_HERMES')
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

  def test_override_build_settings
    build_settings = { 'OTHER_LDFLAGS' => '-l"Pods-TestApp"', 'ONLY_ACTIVE_ARCH' => 'NO' }

    override_build_settings!(build_settings, {})

    assert_equal('-l"Pods-TestApp"', build_settings['OTHER_LDFLAGS'])

    override_build_settings!(build_settings, { 'OTHER_LDFLAGS' => ' -ObjC' })

    assert_equal(' -ObjC', build_settings['OTHER_LDFLAGS'])

    # Test passing a table
    build_settings_arr = { 'OTHER_LDFLAGS' => ['$(inherited)', '-l"Pods-TestApp"'] }
    override_build_settings!(build_settings_arr, { 'OTHER_LDFLAGS' => [' -ObjC'] })

    assert_equal([' -ObjC'], build_settings_arr['OTHER_LDFLAGS'])

    # Test setting a new key
    override_build_settings!(build_settings, { 'OTHER_CFLAGS' => '-DDEBUG' })

    assert_equal('-DDEBUG', build_settings['OTHER_CFLAGS'])
    override_build_settings!(build_settings, { 'ONLY_ACTIVE_ARCH' => 'YES' })

    assert_equal('YES', build_settings['ONLY_ACTIVE_ARCH'])
  end
end
