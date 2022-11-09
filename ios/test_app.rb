require('json')
require('pathname')
require('rubygems/version')

require_relative('pod_helpers')

def assert(condition, message)
  raise message unless condition
end

def app_manifest(project_root)
  @app_manifest ||= {}
  return @app_manifest[project_root] if @app_manifest.key?(project_root)

  manifest_path = find_file('app.json', project_root)
  return if manifest_path.nil?

  @app_manifest[project_root] = JSON.parse(File.read(manifest_path))
end

def app_config(project_root)
  manifest = app_manifest(project_root)
  return [nil, nil, nil] if manifest.nil?

  [manifest['name'], manifest['displayName'], manifest['version'], manifest['singleApp']]
end

def apply_config_plugins(project_root)
  begin
    resolve_module('@expo/config-plugins')
  rescue StandardError
    # Skip if `@expo/config-plugins` cannot be found
    return
  end

  apply_config_plugins = File.join(__dir__, '..', 'scripts', 'apply-config-plugins.mjs')
  result = system("node \"#{apply_config_plugins}\" \"#{project_root}\"")
  raise 'Failed to apply config plugins' unless result
end

def autolink_script_path
  package_path = resolve_module('@react-native-community/cli-platform-ios')
  File.join(package_path, 'native_modules')
end

def platform_config(key, project_root, target_platform)
  manifest = app_manifest(project_root)
  return if manifest.nil?

  config = manifest[target_platform.to_s]
  return config[key] if !config.nil? && !config.empty?
end

def flipper_enabled?
  @flipper_versions != false
end

def flipper_versions
  @flipper_versions != false && (@flipper_versions || {})
end

def nearest_node_modules(project_root)
  path = find_file('node_modules', project_root)
  assert(!path.nil?, "Could not find 'node_modules'")

  path
end

def package_version(package_path)
  package_json = JSON.parse(File.read(File.join(package_path, 'package.json')))
  Gem::Version.new(package_json['version'])
end

def project_path(file, target_platform)
  File.expand_path(file, File.join(__dir__, '..', target_platform.to_s))
end

def react_native_path(project_root, target_platform)
  react_native_path = platform_config('reactNativePath', project_root, target_platform)
  return Pathname.new(resolve_module(react_native_path)) if react_native_path.is_a? String

  react_native = case target_platform
                 when :ios then 'react-native'
                 when :macos then 'react-native-macos'
                 else raise "Unsupported target platform: #{target_platform}"
                 end
  Pathname.new(resolve_module(react_native))
end

def target_product_type(target)
  target.product_type if target.respond_to?(:product_type)
end

def generate_assets_catalog!(project_root, target_platform, destination)
  xcassets_src = project_path('ReactTestApp/Assets.xcassets', target_platform)
  xcassets_dst = File.join(destination, File.basename(xcassets_src))
  FileUtils.rm_rf(xcassets_dst)
  FileUtils.cp_r(xcassets_src, destination)

  icons = platform_config('icons', project_root, target_platform)
  return if icons.nil? || icons['primaryIcon'].nil?

  template = JSON.parse(File.read(File.join(xcassets_src, 'AppIcon.appiconset', 'Contents.json')))
  app_manifest_dir = File.dirname(find_file('app.json', project_root))

  app_icons = (icons['alternateIcons'] || {}).merge({ 'AppIcon' => icons['primaryIcon'] })
  app_icons.each do |icon_set_name, app_icon|
    app_icon_set = File.join(xcassets_dst, "#{icon_set_name}.appiconset")
    FileUtils.mkdir_p(app_icon_set)

    icon = File.join(app_manifest_dir, app_icon['filename'])
    extname = File.extname(icon)
    basename = File.basename(icon, extname)

    images = []

    template['images'].each do |image|
      scale, size = image.values_at('scale', 'size')
      width, height = size.split('x')
      filename = "#{basename}-#{height}@#{scale}#{extname}"
      images << { 'filename' => filename }.merge(image)
      fork do
        output = File.join(app_icon_set, filename)
        scale = scale.split('x')[0].to_f
        height = height.to_f * scale
        width = width.to_f * scale
        `sips --resampleHeightWidth #{height} #{width} --out "#{output}" "#{icon}"`
      end
    end

    File.write(File.join(app_icon_set, 'Contents.json'),
               JSON.pretty_generate({ 'images' => images, 'info' => template['info'] }))
  end
end

def react_native_pods(version)
  v = version.release
  if v == Gem::Version.new('0.0.0') || v >= Gem::Version.new('0.70')
    'use_react_native-0.70'
  elsif v >= Gem::Version.new('0.68')
    'use_react_native-0.68'
  elsif v >= Gem::Version.new('0.64')
    'use_react_native-0.64'
  else
    raise "Unsupported React Native version: #{version}"
  end
end

def resolve_resources(manifest, target_platform)
  resources = manifest['resources']
  return if !resources || resources.empty?

  resources.instance_of?(Array) ? resources : resources[target_platform.to_s]
end

def resources_pod(project_root, target_platform, platforms)
  app_manifest = find_file('app.json', project_root)
  return if app_manifest.nil?

  app_dir = File.dirname(app_manifest)
  resources = resolve_resources(app_manifest(project_root), target_platform)

  if !resources.nil? && resources.any? { |r| !File.exist?(File.join(app_dir, r)) }
    Pod::UI.notice(
      'One or more resources were not found and will not be included in the project. ' \
      'If they are found later and you want to include them, run `pod install` again.'
    )
  end

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
    },
    'resources' => [*resources],
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

def use_flipper!(versions = {})
  @flipper_versions = versions
end

def use_react_native!(project_root, target_platform, options)
  react_native = react_native_path(project_root, target_platform)
  version = package_version(react_native.to_s)

  require_relative(react_native_pods(version))

  include_react_native!(**options,
                        app_path: find_file('package.json', project_root).parent,
                        path: react_native.relative_path_from(project_root).to_s,
                        rta_flipper_versions: flipper_versions,
                        rta_project_root: project_root,
                        rta_target_platform: target_platform)
end

def make_project!(xcodeproj, project_root, target_platform, options)
  xcodeproj_src = project_path(xcodeproj, target_platform)
  destination = File.join(nearest_node_modules(project_root), '.generated', target_platform.to_s)
  xcodeproj_dst = File.join(destination, xcodeproj)

  # Copy Xcode project files
  FileUtils.mkdir_p(destination)
  FileUtils.cp_r(xcodeproj_src, destination)
  name, display_name, version, single_app = app_config(project_root)
  unless name.nil?
    xcschemes_path = File.join(xcodeproj_dst, 'xcshareddata', 'xcschemes')
    FileUtils.cp(File.join(xcschemes_path, 'ReactTestApp.xcscheme'),
                 File.join(xcschemes_path, "#{name}.xcscheme"))
  end

  # Link source files
  %w[ReactTestApp ReactTestAppTests ReactTestAppUITests].each do |file|
    FileUtils.ln_sf(project_path(file, target_platform), destination)
  end

  # Shared code lives in `ios/ReactTestApp/`
  if target_platform != :ios
    source = File.expand_path('ReactTestApp', __dir__)
    shared_path = File.join(destination, 'ReactTestAppShared')
    FileUtils.ln_sf(source, shared_path) unless File.exist?(shared_path)
  end

  generate_assets_catalog!(project_root, target_platform, destination)

  # Copy localization files and replace instances of `ReactTestApp` with app display name
  product_name = display_name || name
  product_name = if product_name.is_a? String
                   product_name
                 else
                   target.name
                 end
  localizations_src = project_path('Localizations', target_platform)
  if File.exist?(localizations_src)
    main_strings = 'Main.strings'
    localizations_dst = File.join(destination, 'Localizations')

    Dir.entries(localizations_src).each do |entry|
      next if entry.start_with?('.')

      lproj = File.join(localizations_dst, entry)
      FileUtils.mkdir_p(lproj)

      File.open(File.join(lproj, main_strings), 'w') do |f|
        File.foreach(File.join(localizations_src, entry, main_strings)) do |line|
          f.write(line.sub('ReactTestApp', product_name))
        end
      end
    end
  end

  # Note the location of Node so we can use it later in script phases
  File.open(File.join(project_root, '.xcode.env'), 'w') do |f|
    node_bin = `which node`
    node_bin.strip!
    f.write("export NODE_BINARY=#{node_bin}\n")
  end
  File.open(File.join(destination, '.env'), 'w') do |f|
    node_bin = `dirname $(which node)`
    node_bin.strip!
    f.write("export PATH=#{node_bin}:$PATH\n")
  end

  react_native = react_native_path(project_root, target_platform)
  rn_version = package_version(react_native.to_s).segments
  rn_version = (rn_version[0] * 10_000) + (rn_version[1] * 100) + rn_version[2]
  version_macro = "REACT_NATIVE_VERSION=#{rn_version}"

  build_settings = {}
  tests_build_settings = {}
  uitests_build_settings = {}

  code_sign_entitlements = platform_config('codeSignEntitlements', project_root, target_platform)
  if code_sign_entitlements.is_a? String
    package_root = File.dirname(find_file('app.json', project_root))
    entitlements = Pathname.new(File.join(package_root, code_sign_entitlements))
    build_settings['CODE_SIGN_ENTITLEMENTS'] = entitlements.relative_path_from(destination).to_s
  end

  code_sign_identity = platform_config('codeSignIdentity', project_root, target_platform)
  build_settings['CODE_SIGN_IDENTITY'] = code_sign_identity if code_sign_identity.is_a? String

  development_team = platform_config('developmentTeam', project_root, target_platform)
  if development_team.is_a? String
    build_settings['DEVELOPMENT_TEAM'] = development_team
    tests_build_settings['DEVELOPMENT_TEAM'] = development_team
    uitests_build_settings['DEVELOPMENT_TEAM'] = development_team
  end

  product_bundle_identifier = platform_config('bundleIdentifier', project_root, target_platform)
  if product_bundle_identifier.is_a? String
    build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = product_bundle_identifier
    tests_build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = "#{product_bundle_identifier}Tests"
    uitests_build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = "#{product_bundle_identifier}UITests"
  end

  build_settings['PRODUCT_DISPLAY_NAME'] = display_name
  build_settings['PRODUCT_VERSION'] = version || '1.0'

  build_number = platform_config('buildNumber', project_root, target_platform)
  build_settings['PRODUCT_BUILD_NUMBER'] = build_number || '1'

  supports_flipper = target_platform == :ios && flipper_enabled?
  use_fabric = fabric_enabled?(options, rn_version)
  use_turbomodule = new_architecture_enabled?(options, rn_version)

  app_project = Xcodeproj::Project.open(xcodeproj_dst)
  app_project.native_targets.each do |target|
    case target.name
    when 'ReactTestApp'
      target.build_configurations.each do |config|
        use_flipper = config.name == 'Debug' && supports_flipper

        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << version_macro
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'USE_FABRIC=1' if use_fabric
        if use_flipper
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'FB_SONARKIT_ENABLED=1'
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'USE_FLIPPER=1'
        end
        if use_turbomodule
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'FOLLY_NO_CONFIG=1'
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'RCT_NEW_ARCH_ENABLED=1'
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'USE_TURBOMODULE=1'
        end

        build_settings.each do |setting, value|
          config.build_settings[setting] = value
        end

        config.build_settings['OTHER_SWIFT_FLAGS'] ||= ['$(inherited)']
        config.build_settings['OTHER_SWIFT_FLAGS'] << '-DUSE_FABRIC' if use_fabric
        if use_flipper
          config.build_settings['OTHER_SWIFT_FLAGS'] << '-DFB_SONARKIT_ENABLED'
          config.build_settings['OTHER_SWIFT_FLAGS'] << '-DUSE_FLIPPER'
        end
        config.build_settings['OTHER_SWIFT_FLAGS'] << '-DUSE_TURBOMODULE' if use_turbomodule
        if single_app.is_a? String
          config.build_settings['OTHER_SWIFT_FLAGS'] << '-DENABLE_SINGLE_APP_MODE'
        end

        config.build_settings['USER_HEADER_SEARCH_PATHS'] ||= []
        config.build_settings['USER_HEADER_SEARCH_PATHS'] << File.dirname(destination)
      end
    when 'ReactTestAppTests'
      target.build_configurations.each do |config|
        tests_build_settings.each do |setting, value|
          config.build_settings[setting] = value
        end
      end
    when 'ReactTestAppUITests'
      target.build_configurations.each do |config|
        uitests_build_settings.each do |setting, value|
          config.build_settings[setting] = value
        end
      end
    end
  end
  app_project.save

  config = app_project.build_configurations[0]
  {
    :xcodeproj_path => xcodeproj_dst,
    :platforms => {
      :ios => config.resolve_build_setting('IPHONEOS_DEPLOYMENT_TARGET'),
      :macos => config.resolve_build_setting('MACOSX_DEPLOYMENT_TARGET'),
    },
    :use_fabric => use_fabric,
    :use_turbomodule => use_turbomodule,
    :code_sign_identity => code_sign_identity || '',
    :development_team => development_team || '',
  }
end

def use_test_app_internal!(target_platform, options)
  assert(%i[ios macos].include?(target_platform), "Unsupported platform: #{target_platform}")

  xcodeproj = 'ReactTestApp.xcodeproj'
  project_root = Pod::Config.instance.installation_root
  project_target = make_project!(xcodeproj, project_root, target_platform, options)
  xcodeproj_dst, platforms = project_target.values_at(:xcodeproj_path, :platforms)

  install! 'cocoapods', :deterministic_uuids => false if project_target[:use_turbomodule]

  require_relative(autolink_script_path)

  begin
    platform :ios, platforms[:ios] if target_platform == :ios
    platform :osx, platforms[:macos] if target_platform == :macos
  rescue StandardError
    # Allow platform deployment target to be overridden
  end

  project xcodeproj_dst

  react_native_post_install = nil

  target 'ReactTestApp' do
    react_native_post_install = use_react_native!(project_root, target_platform, options)

    if (resources_pod_path = resources_pod(project_root, target_platform, platforms))
      pod 'ReactTestApp-Resources', :path => resources_pod_path
    end

    yield ReactTestAppTargets.new(self) if block_given?

    use_native_modules!
  end

  post_install do |installer|
    react_native_post_install&.call(installer)

    test_dependencies = {}
    %w[ReactTestAppTests ReactTestAppUITests].each do |target|
      definition = target_definitions[target]
      next if definition.nil?

      definition.non_inherited_dependencies.each do |dependency|
        test_dependencies[dependency.name] = dependency
      end
    end

    installer.pods_project.targets.each do |target|
      case target.name
      when 'SwiftLint'
        # Let SwiftLint inherit the deployment target from the Pods project
        target.build_configurations.each do |config|
          config.build_settings.delete('IPHONEOS_DEPLOYMENT_TARGET')
          config.build_settings.delete('MACOSX_DEPLOYMENT_TARGET')
        end
      when /\AFlipper/, 'libevent'
        target.build_configurations.each do |config|
          # Flipper and its dependencies log too many warnings
          config.build_settings['WARNING_CFLAGS'] = ['-w']
        end
      when /\AReact/
        target.build_configurations.each do |config|
          # Xcode 10.2 requires suppression of nullability for React
          # https://stackoverflow.com/questions/37691049/xcode-compile-flag-to-suppress-nullability-warnings-not-working
          config.build_settings['WARNING_CFLAGS'] ||= ['$(inherited)']
          config.build_settings['WARNING_CFLAGS'] << '-Wno-nullability-completeness'
        end
      else
        # Ensure `ENABLE_TESTING_SEARCH_PATHS` is always set otherwise Xcode may
        # fail to properly import XCTest
        unless test_dependencies.assoc(target.name).nil?
          key = 'ENABLE_TESTING_SEARCH_PATHS'
          target.build_configurations.each do |config|
            setting = config.resolve_build_setting(key)
            config.build_settings[key] = 'YES' if setting.nil?
          end
        end
      end

      next unless target_product_type(target) == 'com.apple.product-type.bundle'

      # Code signing of resource bundles was enabled in Xcode 14. Not sure if
      # this is intentional, or if there's a bug in CocoaPods, but Xcode will
      # fail to build when targeting devices. Until this is resolved, we'll just
      # just have to make sure it's consistent with what's set in `app.json`.
      # See also https://github.com/CocoaPods/CocoaPods/issues/11402.
      target.build_configurations.each do |config|
        config.build_settings['CODE_SIGN_IDENTITY'] ||= project_target[:code_sign_identity]
        config.build_settings['DEVELOPMENT_TEAM'] ||= project_target[:development_team]
      end
    end

    apply_config_plugins(project_root)

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
