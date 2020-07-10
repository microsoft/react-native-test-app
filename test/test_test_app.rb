#
# Copyright (c) Microsoft Corporation. All rights reserved.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.
#

require('minitest/autorun')

require_relative('../ios/test_app')

def app_manifest_path(project_root, podspec_path)
  File.join(project_root, podspec_path, 'ReactTestApp-Resources.podspec.json')
end

def fixture_path(*args)
  Pathname.new(__dir__).join('fixtures', *args)
end

class TestTestApp < Minitest::Test
  def test_autolink_script_path
    cli = fixture_path('test_app', 'node_modules', '@react-native-community', 'cli-platform-ios')
    stub :resolve_module, cli do
      assert(require(autolink_script_path))
    end
  end

  def test_autolink_script_version
    cli = fixture_path('test_app', 'node_modules', '@react-native-community', 'cli-platform-ios')
    stub :resolve_module, cli do
      assert_equal(Gem::Version.new('4.10.1'), autolink_script_version)
    end
  end

  def test_flipper_enabled?
    refute(flipper_enabled?(6199))
    assert(flipper_enabled?(6200))

    use_flipper!(false)

    refute(flipper_enabled?(6199))
    refute(flipper_enabled?(6200))

    use_flipper!

    refute(flipper_enabled?(6199))
    assert(flipper_enabled?(6200))
  ensure
    use_flipper!(nil)
  end

  def test_flipper_versions
    assert_equal({}, flipper_versions)

    use_flipper!(false)
    refute(flipper_versions)

    versions = { 'Flipper': '~> 0.41.1' }
    use_flipper!(versions)
    assert_equal(versions, flipper_versions)

    use_flipper!
    assert_equal({}, flipper_versions)

    use_flipper!(false)
    refute(flipper_versions)
  ensure
    use_flipper!(nil)
  end

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

  def test_react_native_pods
    assert_equal('use_react_native-0.63', react_native_pods(Gem::Version.new('1000.0.0')))

    assert_equal('use_react_native-0.63', react_native_pods(Gem::Version.new('0.63.0')))
    assert_equal('use_react_native-0.63', react_native_pods(Gem::Version.new('0.63.0-rc.1')))

    assert_equal('use_react_native-0.62', react_native_pods(Gem::Version.new('0.62.2')))
    assert_equal('use_react_native-0.62', react_native_pods(Gem::Version.new('0.62.0')))

    assert_equal('use_react_native-0.61', react_native_pods(Gem::Version.new('0.61.5')))
    assert_equal('use_react_native-0.61', react_native_pods(Gem::Version.new('0.61.0')))

    assert_equal('use_react_native-0.60', react_native_pods(Gem::Version.new('0.60.6')))
    assert_equal('use_react_native-0.60', react_native_pods(Gem::Version.new('0.60.0')))

    assert_raises(RuntimeError) do
      react_native_pods(Gem::Version.new('0.59.10'))
    end
  end

  %i[ios macos].each do |target|
    define_method("test_#{target}_resources_pod_returns_spec_path") do
      assert_nil(resources_pod(Pathname.new('/'), target))
      assert_nil(resources_pod(Pathname.new('.'), target))

      assert_equal('.', resources_pod(fixture_path('without_resources'), target))
      assert_equal('..', resources_pod(fixture_path('without_resources', target.to_s), target))

      assert_equal('.', resources_pod(fixture_path('without_platform_resources'), target))
      assert_equal('..',
                   resources_pod(fixture_path('without_platform_resources', target.to_s), target))

      assert_equal('.', resources_pod(fixture_path('with_resources'), target))
      assert_equal('..', resources_pod(fixture_path('with_resources', target.to_s), target))

      assert_equal('.', resources_pod(fixture_path('with_platform_resources'), target))
      assert_equal('..',
                   resources_pod(fixture_path('with_platform_resources', target.to_s), target))
    end
  end

  %i[ios macos].each do |target|
    define_method("test_#{target}_resources_pod_writes_podspec") do
      # Lifetime of the resources `.podspec` is tied to the lifetime of the
      # owning object (normally a `Pod` object). Disable GC to avoid random
      # variances.
      GC.disable

      resources = %w[app.json dist/assets dist/main.jsbundle]
      platform_resources = ['app.json', "dist-#{target}/assets", "dist-#{target}/main.jsbundle"]

      [
        fixture_path('with_platform_resources'),
        fixture_path('with_platform_resources', target.to_s),
        fixture_path('with_resources'),
        fixture_path('with_resources', target.to_s),
        fixture_path('without_platform_resources'),
        fixture_path('without_platform_resources', target.to_s),
        fixture_path('without_resources'),
        fixture_path('without_resources', target.to_s),
      ].each do |project_root|
        podspec_path = resources_pod(project_root, target)
        manifest_path = app_manifest_path(project_root, podspec_path)
        manifest = JSON.parse(File.read(manifest_path))

        if project_root.to_s.include?('without')
          assert_equal(['app.json'], manifest['resources'])
        elsif project_root.to_s.include?('with_platform_resources')
          assert_equal(platform_resources, manifest['resources'].sort)
        else
          assert_equal(resources, manifest['resources'].sort)
        end
      end

      GC.enable
    end
  end
end
