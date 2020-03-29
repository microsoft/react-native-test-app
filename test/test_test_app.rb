#
# Copyright (c) Microsoft Corporation. All rights reserved.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.
#

require('minitest/autorun')

require_relative('../test_app')

def app_manifest_path(project_root, podspec_path)
  File.join(project_root, podspec_path, 'ReactTestApp-Resources.podspec.json')
end

def fixture_path(*args)
  Pathname.new(__dir__).join('fixtures', *args)
end

class TestTestApp < Minitest::Test
  def test_resources_pod_returns_spec_path
    assert_nil(resources_pod(Pathname.new('/')))
    assert_nil(resources_pod(Pathname.new('.')))

    assert_nil(resources_pod(fixture_path('without_resources')))
    assert_nil(resources_pod(fixture_path('without_resources', 'ios')))

    assert_nil(resources_pod(fixture_path('without_ios_resources')))
    assert_nil(resources_pod(fixture_path('without_ios_resources', 'ios')))

    assert_equal('.', resources_pod(fixture_path('with_resources')))
    assert_equal('..', resources_pod(fixture_path('with_resources', 'ios')))

    assert_equal('.', resources_pod(fixture_path('with_ios_resources')))
    assert_equal('..', resources_pod(fixture_path('with_ios_resources', 'ios')))
  end

  def test_resources_pod_writes_podspec
    [
      fixture_path('with_resources'),
      fixture_path('with_resources', 'ios'),
      fixture_path('with_ios_resources'),
      fixture_path('with_ios_resources', 'ios')
    ].each do |project_root|
      begin
        podspec_path = resources_pod(project_root)
        manifest_path = app_manifest_path(project_root, podspec_path)
        manifest = JSON.parse(File.read(manifest_path))

        assert_equal(%w[dist/assets dist/main.jsbundle], manifest['resources'].sort)
      ensure
        File.delete(manifest_path)
      end
    end
  end
end
