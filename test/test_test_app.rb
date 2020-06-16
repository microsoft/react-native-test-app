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
  %i[ios macos].each do |target|
    define_method("test_#{target}_resources_pod_returns_spec_path") do
      assert_nil(resources_pod(Pathname.new('/'), target))
      assert_nil(resources_pod(Pathname.new('.'), target))

      assert_nil(resources_pod(fixture_path('without_resources'), target))
      assert_nil(resources_pod(fixture_path('without_resources', target.to_s), target))

      assert_nil(resources_pod(fixture_path('without_platform_resources'), target))
      assert_nil(resources_pod(fixture_path('without_platform_resources', target.to_s), target))

      assert_equal('.', resources_pod(fixture_path('with_resources'), target))
      assert_equal('..', resources_pod(fixture_path('with_resources', target.to_s), target))

      assert_equal('.', resources_pod(fixture_path('with_platform_resources'), target))
      assert_equal('..',
                   resources_pod(fixture_path('with_platform_resources', target.to_s), target))
    end
  end

  %i[ios macos].each do |target|
    define_method("test_#{target}_resources_pod_writes_podspec") do
      resources = %w[dist/assets dist/main.jsbundle]
      platform_resources = ["dist-#{target}/assets", "dist-#{target}/main.jsbundle"]

      [
        fixture_path('with_resources'),
        fixture_path('with_resources', target.to_s),
        fixture_path('with_platform_resources'),
        fixture_path('with_platform_resources', target.to_s),
      ].each do |project_root|
        podspec_path = resources_pod(project_root, target)
        manifest_path = app_manifest_path(project_root, podspec_path)
        manifest = JSON.parse(File.read(manifest_path))

        if project_root.to_s.include?('with_platform_resources')
          assert_equal(platform_resources, manifest['resources'].sort)
        else
          assert_equal(resources, manifest['resources'].sort)
        end

      ensure
        File.delete(manifest_path)
      end
    end
  end
end
