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

class TestTestApp < Minitest::Test
  def test_resources_pod_returns_spec_path
    assert_nil(resources_pod('/'))
    assert_nil(resources_pod('.'))

    project_root = File.join(__dir__, 'fixtures', 'without_resources')
    assert_nil(resources_pod(project_root))

    project_root = File.join(__dir__, 'fixtures', 'without_resources', 'ios')
    assert_nil(resources_pod(project_root))

    project_root = File.join(__dir__, 'fixtures', 'without_ios_resources')
    assert_nil(resources_pod(project_root))

    project_root = File.join(__dir__, 'fixtures', 'without_ios_resources', 'ios')
    assert_nil(resources_pod(project_root))

    project_root = File.join(__dir__, 'fixtures', 'with_resources')
    assert_equal('.', resources_pod(project_root))

    project_root = File.join(__dir__, 'fixtures', 'with_resources', 'ios')
    assert_equal('..', resources_pod(project_root))

    project_root = File.join(__dir__, 'fixtures', 'with_ios_resources')
    assert_equal('.', resources_pod(project_root))

    project_root = File.join(__dir__, 'fixtures', 'with_ios_resources', 'ios')
    assert_equal('..', resources_pod(project_root))
  end

  def test_resources_pod_writes_podspec
    [
      File.join(__dir__, 'fixtures', 'with_resources'),
      File.join(__dir__, 'fixtures', 'with_resources', 'ios'),
      File.join(__dir__, 'fixtures', 'with_ios_resources'),
      File.join(__dir__, 'fixtures', 'with_ios_resources', 'ios')
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
