require('json')
require('pathname')

require_relative('pod_helpers')

IPHONEOS_DEPLOYMENT_TARGET = 'IPHONEOS_DEPLOYMENT_TARGET'.freeze
MACOSX_DEPLOYMENT_TARGET = 'MACOSX_DEPLOYMENT_TARGET'.freeze
XROS_DEPLOYMENT_TARGET = 'XROS_DEPLOYMENT_TARGET'.freeze

CODE_SIGN_IDENTITY = 'CODE_SIGN_IDENTITY'.freeze
DEVELOPMENT_TEAM = 'DEVELOPMENT_TEAM'.freeze

def react_native_pods(version)
  if version.zero? || version >= v(0, 71, 0)
    'use_react_native-0.71'
  elsif version >= v(0, 70, 0)
    'use_react_native-0.70'
  else
    raise "Unsupported React Native version: #{version}"
  end
end

def validate_resources(resources, app_dir)
  excluded = []
  not_found = []
  resources.each do |r|
    if r.start_with?('..')
      excluded << r
    elsif !File.exist?(File.join(app_dir, r))
      not_found << r
    end
  end

  unless excluded.empty?
    items = excluded.join("\n  ")
    Pod::UI.warn("CocoaPods does not allow resources outside the project root:\n  #{items}")
  end

  unless not_found.empty?
    items = not_found.join("\n  ")
    Pod::UI.warn(
      "CocoaPods will not include resources it cannot find:\n  #{items}\n\n" \
      'The app will still build and run if they are served by the dev ' \
      'server. To include missing resources, make sure they exist, then run ' \
      '`pod install` again to update the workspace.'
    )
  end

  resources
end

def resources_pod(project_root, platforms, resources)
  return if resources.nil? || resources.empty?

  app_manifest = find_file('app.json', project_root)
  return if app_manifest.nil?

  app_dir = File.dirname(app_manifest)

  spec = {
    'name' => 'ReactTestApp-Resources',
    'version' => '1.0.0-dev',
    'summary' => 'Resources for ReactTestApp',
    'homepage' => 'https://github.com/microsoft/react-native-test-app',
    'license' => 'Unlicense',
    'authors' => '@microsoft/react-native-test-app',
    'source' => { 'git' => 'https://github.com/microsoft/react-native-test-app.git' },
    'platforms' => {
      'ios' => platforms[:ios],
      'osx' => platforms[:macos],
      'visionos' => platforms[:visionos],
    },
    'resources' => validate_resources(resources, app_dir),
  }

  podspec_path = File.join(app_dir, 'ReactTestApp-Resources.podspec.json')
  File.open(podspec_path, 'w') do |f|
    # Under certain conditions, the file doesn't get written to disk before it
    # is read by CocoaPods.
    f.write(spec.to_json)
    f.fsync
    ObjectSpace.define_finalizer(self, Remover.new(f))
  end

  Pathname.new(app_dir).relative_path_from(project_root).to_s
end

def use_react_native!(project_root, project, options)
  require_relative(react_native_pods(project[:react_native_version]))

  react_native_path = Pathname.new(project[:react_native_path])

  include_react_native!(**options,
                        app_path: find_file('package.json', project_root).parent.to_s,
                        path: react_native_path.relative_path_from(project_root).to_s,
                        rta_project_root: project_root,
                        use_hermes: project[:use_hermes],
                        use_new_arch: project[:use_new_arch],
                        use_bridgeless: project[:use_bridgeless],
                        version: project[:react_native_version])
end

def make_project!(project_root, target_platform, options)
  generate_project = File.join(__dir__, 'app.mjs')
  options_json = JSON.fast_generate(options.transform_keys { |key| key.to_s.camelize(:lower) })
  result = `node "#{generate_project}" "#{project_root}" #{target_platform} '#{options_json}'`
  project = JSON.parse(result)

  xcodeproj_path = project['xcodeprojPath']
  build_settings = project['buildSettings']

  app_project = Xcodeproj::Project.open(xcodeproj_path)

  config = app_project.build_configurations[0]
  {
    :xcodeproj_path => xcodeproj_path,
    :platforms => {
      :ios => config.resolve_build_setting(IPHONEOS_DEPLOYMENT_TARGET),
      :macos => config.resolve_build_setting(MACOSX_DEPLOYMENT_TARGET),
      :visionos => config.resolve_build_setting(XROS_DEPLOYMENT_TARGET),
    },
    :react_native_path => project['reactNativePath'],
    :react_native_version => project['reactNativeVersion'],
    :react_native_host_path => project['reactNativeHostPath'],
    :community_autolinking_script_path => project['communityAutolinkingScriptPath'],
    :use_hermes => project['useHermes'],
    :use_new_arch => project['useNewArch'],
    :use_bridgeless => project['useBridgeless'],
    :code_sign_identity => build_settings[CODE_SIGN_IDENTITY] || '',
    :development_team => build_settings[DEVELOPMENT_TEAM] || '',
    :resources => project['resources'],
  }
end

def use_test_app_internal!(target_platform, options)
  assert_version(Pod::VERSION)
  assert(%i[ios macos visionos].include?(target_platform),
         "Unsupported platform: #{target_platform}")

  xcodeproj = 'ReactTestApp.xcodeproj'
  project_root = Pod::Config.instance.installation_root
  project_target = make_project!(project_root, target_platform, options)
  xcodeproj_dst, platforms = project_target.values_at(:xcodeproj_path, :platforms)

  if project_target[:use_new_arch] || project_target[:react_native_version] >= v(0, 73, 0)
    install! 'cocoapods', :deterministic_uuids => false
  end

  # As of 0.75, we should use `use_native_modules!` from `react-native` instead
  if project_target[:community_autolinking_script_path].is_a? String
    require_relative(project_target[:community_autolinking_script_path])
  end

  begin
    platform :ios, platforms[:ios] if target_platform == :ios
    platform :osx, platforms[:macos] if target_platform == :macos
    platform :visionos, platforms[:visionos] if target_platform == :visionos
  rescue StandardError
    # Allow platform deployment target to be overridden
  end

  project xcodeproj_dst

  react_native_post_install = nil

  target 'ReactTestApp' do
    react_native_post_install = use_react_native!(project_root, project_target, options)

    pod 'ReactNativeHost', :path => project_target[:react_native_host_path]

    if (resources_pod_path = resources_pod(project_root, platforms, project_target[:resources]))
      pod 'ReactTestApp-Resources', :path => resources_pod_path
    end

    yield ReactTestAppTargets.new(self) if block_given?

    use_native_modules!
  end

  post_install do |installer|
    react_native_post_install&.call(installer)
    options[:post_install]&.call(installer)

    test_dependencies = []
    %w[ReactTestAppTests ReactTestAppUITests].each do |target|
      definition = target_definitions[target]
      next if definition.nil?

      definition.non_inherited_dependencies.each do |dependency|
        test_dependencies << dependency.name
      end
    end

    project_target[:project_root] = project_root
    project_target[:test_dependencies] = test_dependencies
    options = JSON.fast_generate(project_target.transform_keys { |key| key.to_s.camelize(:lower) })

    `node "#{File.join(__dir__, 'postinstall.mjs')}" "#{installer.pods_project.path}" '#{options}'`

    Pod::UI.notice(
      "`#{xcodeproj}` was sourced from `react-native-test-app`. " \
      'All modifications will be overwritten next time you run `pod install`.'
    )
  end
end

class ReactTestAppTargets
  def initialize(podfile)
    @podfile = podfile
  end

  def app
    yield if block_given?
  end

  def tests
    @podfile.target 'ReactTestAppTests' do
      @podfile.inherit! :complete
      yield if block_given?
    end
  end

  def ui_tests
    @podfile.target 'ReactTestAppUITests' do
      @podfile.inherit! :complete
      yield if block_given?
    end
  end
end

class Remover
  def initialize(tmpfile)
    @pid = Process.pid
    @tmpfile = tmpfile
  end

  def call(*_args)
    return if @pid != Process.pid

    @tmpfile.close
    FileUtils.rm_rf(@tmpfile.path)
  end
end
