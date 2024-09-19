require('minitest/autorun')

require_relative('../ios/node')

def fixture_path(*args)
  Pathname.new(__dir__).join('__fixtures__', *args)
end

class TestTestApp < Minitest::Test
  def test_nearest_node_modules
    expected = fixture_path('test_app', 'node_modules')

    assert_equal(expected, nearest_node_modules(fixture_path('test_app')))

    react_native = fixture_path('test_app', 'node_modules', 'react-native')

    assert_equal(expected, nearest_node_modules(react_native))

    assert_equal(expected, nearest_node_modules(fixture_path('test_app', 'src')))
  end

  def test_package_version
    react_native = fixture_path('test_app', 'node_modules', 'react-native')

    assert_equal(Gem::Version.new('1000.0.0'), package_version(react_native))

    cli = fixture_path('test_app', 'node_modules', '@react-native-community', 'cli-platform-ios')

    assert_equal(Gem::Version.new('4.10.1'), package_version(cli))
  end
end
