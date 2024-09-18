require('minitest/autorun')

require_relative('../ios/xcode')

class TestXcode < Minitest::Test
  def test_override_build_settings
    build_settings = { 'OTHER_LDFLAGS' => '-l"Pods-TestApp"', 'ONLY_ACTIVE_ARCH' => 'NO' }

    override_build_settings!(build_settings, {})

    assert_equal('-l"Pods-TestApp"', build_settings['OTHER_LDFLAGS'])

    override_build_settings!(build_settings, { 'OTHER_LDFLAGS' => '-ObjC' })

    assert_equal('-ObjC', build_settings['OTHER_LDFLAGS'])

    # Test passing a table
    build_settings_arr = { 'OTHER_LDFLAGS' => ['$(inherited)', '-l"Pods-TestApp"'] }
    override_build_settings!(build_settings_arr, { 'OTHER_LDFLAGS' => ['-ObjC'] })

    assert_equal(['-ObjC'], build_settings_arr['OTHER_LDFLAGS'])

    # Test setting a new key
    override_build_settings!(build_settings, { 'OTHER_CFLAGS' => '-DDEBUG' })

    assert_equal('-DDEBUG', build_settings['OTHER_CFLAGS'])

    override_build_settings!(build_settings, { 'ONLY_ACTIVE_ARCH' => 'YES' })

    assert_equal('YES', build_settings['ONLY_ACTIVE_ARCH'])
  end
end
