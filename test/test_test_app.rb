require('minitest/autorun')

require_relative('../ios/test_app')

class Pod
  class UI
    def self.notice(message) end
    def self.warn(message) end
  end
end

def app_manifest_path(project_root, podspec_path)
  File.join(project_root, podspec_path, 'ReactTestApp-Resources.podspec.json')
end

def fixture_path(*args)
  Pathname.new(__dir__).join('__fixtures__', *args)
end

class TestTestApp < Minitest::Test
  def test_react_native_pods
    [
      [0, '0.71'],
      [v(1000, 0, 0), '0.71'],
      [v(0, 71, 0), '0.71'],
    ].each do |target, profile|
      assert_equal("use_react_native-#{profile}", react_native_pods(target))
    end

    assert_raises(RuntimeError) do
      react_native_pods(v(0, 65, 3))
    end
    assert_raises(RuntimeError) do
      react_native_pods(v(0, 69, 12))
    end
  end

  %i[ios macos].each do |target|
    define_method("test_#{target}_resources_pod_returns_spec_path") do
      platforms = { :ios => '14.0', :macos => '11.0', :visionos => '1.0' }

      assert_nil(resources_pod(Pathname.new('/'), platforms, nil))
      assert_nil(resources_pod(Pathname.new('.'), platforms, nil))

      {
        'without_resources' => nil,
        'without_platform_resources' => nil,
        'with_resources' => ['dist/assets', 'dist/main.jsbundle'],
        'with_platform_resources' => {
          'ios' => ['dist-ios/assets', 'dist-ios/main.jsbundle'],
          'macos' => ['dist-macos/assets', 'dist-macos/main.jsbundle'],
        },
      }.each do |fixture, resources|
        resources = resources[target] if resources.is_a? Hash

        podspec_path = resources_pod(fixture_path(fixture), platforms, resources)
        inner_podspec_path = resources_pod(fixture_path(fixture, target.to_s), platforms, resources)

        if resources.nil?
          assert_nil(podspec_path)
          assert_nil(inner_podspec_path)
        else
          assert_equal('.', podspec_path)
          assert_equal('..', inner_podspec_path)
        end
      end
    end

    define_method("test_#{target}_resources_pod_writes_podspec") do
      # Lifetime of the resources `.podspec` is tied to the lifetime of the
      # owning object (normally a `Pod` object). Disable GC to avoid random
      # variances.
      GC.disable

      platforms = { :ios => '14.0', :macos => '11.0', :visionos => '1.0' }
      resources = %w[dist/assets dist/main.jsbundle]
      platform_resources = ["dist-#{target}/assets", "dist-#{target}/main.jsbundle"]

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
        no_resources = project_root.to_s.include?('without')
        use_platform_resources = project_root.to_s.include?('with_platform_resources')

        podspec_path = resources_pod(project_root, platforms, if no_resources
                                                                nil
                                                              elsif use_platform_resources
                                                                platform_resources
                                                              else
                                                                resources
                                                              end)

        if no_resources
          assert_nil(podspec_path)
          next
        end

        manifest_path = app_manifest_path(project_root, podspec_path)
        manifest = JSON.parse(File.read(manifest_path))

        if use_platform_resources
          assert_equal(platform_resources, manifest['resources'].sort)
        else
          assert_equal(resources, manifest['resources'].sort)
        end
      end

      GC.enable
    end
  end
end
