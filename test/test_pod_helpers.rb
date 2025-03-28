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

  def test_use_hermes?
    options = { path: '../node_modules/react-native' }

    ENV.delete('RCT_BUILD_HERMES_FROM_SOURCE')
    ENV.delete('USE_HERMES')

    refute(use_hermes?(options))
    assert(use_hermes?({ **options, hermes_enabled: true }))
    refute(ENV.fetch('RCT_BUILD_HERMES_FROM_SOURCE', nil))

    ENV['USE_HERMES'] = '0'

    refute(use_hermes?(options))
    refute(use_hermes?({ **options, hermes_enabled: true }))
    refute(ENV.fetch('RCT_BUILD_HERMES_FROM_SOURCE', nil))

    ENV['USE_HERMES'] = '1'

    assert(use_hermes?(options))
    assert(use_hermes?({ **options, hermes_enabled: true }))
    refute(ENV.fetch('RCT_BUILD_HERMES_FROM_SOURCE', nil))

    ENV.delete('RCT_BUILD_HERMES_FROM_SOURCE')
    ENV.delete('USE_HERMES')
  end

  def test_use_hermes_visionos?
    options = {
      path: '../node_modules/@callstack/react-native-visionos',
      hermes_enabled: true,
    }

    ENV.delete('RCT_BUILD_HERMES_FROM_SOURCE')
    ENV.delete('USE_HERMES')

    assert(use_hermes?({ **options, version: v(0, 76, 0) }))
    refute(ENV.fetch('RCT_BUILD_HERMES_FROM_SOURCE', nil))

    assert(use_hermes?({ **options, version: v(0, 75, 0) }))
    assert_equal('true', ENV.fetch('RCT_BUILD_HERMES_FROM_SOURCE'))

    ENV.delete('RCT_BUILD_HERMES_FROM_SOURCE')
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
end
