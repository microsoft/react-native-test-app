require('cfpropertylist')
require('json')
require('pathname')

require_relative('pod_helpers')

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

def apply_config_plugins(project_root, target_platform)
  begin
    resolve_module('@expo/config-plugins')
  rescue StandardError
    # Skip if `@expo/config-plugins` cannot be found
    return
  end

  apply_config_plugins = File.join(__dir__, '..', 'scripts', 'apply-config-plugins.mjs')
  result = system("node \"#{apply_config_plugins}\" \"#{project_root}\" --#{target_platform}")
  raise 'Failed to apply config plugins' unless result
end

def autolink_script_path(project_root, target_platform)
  react_native = react_native_path(project_root, target_platform)
  package_path = resolve_module('@react-native-community/cli-platform-ios', react_native)
  File.join(package_path, 'native_modules')
end

def platform_config(key, project_root, target_platform)
  manifest = app_manifest(project_root)
  return if manifest.nil?

  config = manifest[target_platform.to_s]
  config[key] if !config.nil? && !config.empty?
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

  react_native_packages = {
    ios: 'react-native',
    macos: 'react-native-macos',
    visionos: '@callstack/react-native-visionos',
  }
  react_native = react_native_packages[target_platform]
  assert(!react_native.nil?, "Unsupported target platform: #{target_platform}")
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

def generate_info_plist!(project_root, target_platform, destination)
  manifest = app_manifest(project_root)
  return if manifest.nil?

  infoplist_src = project_path('ReactTestApp/Info.plist', target_platform)
  infoplist_dst = File.join(destination, File.basename(infoplist_src))

  plist = CFPropertyList::List.new(file: infoplist_src)
  info = CFPropertyList.native_types(plist.value)

  # Register fonts
  font_files = ['.otf', '.ttf']
  fonts = []
  resources = resolve_resources(manifest, target_platform)
  resources&.each do |filename|
    fonts << File.basename(filename) if font_files.include?(File.extname(filename))
  end
  unless fonts.empty?
    # https://developer.apple.com/documentation/bundleresources/information_property_list/atsapplicationfontspath
    info['ATSApplicationFontsPath'] = '.' if target_platform == :macos
    # https://developer.apple.com/documentation/uikit/text_display_and_fonts/adding_a_custom_font_to_your_app
    info['UIAppFonts'] = fonts unless target_platform == :macos
  end

  plist.value = CFPropertyList.guess(info)
  plist.save(infoplist_dst, CFPropertyList::List::FORMAT_XML, { :formatted => true })
end

def react_native_pods(version)
  if version.zero? || version >= v(0, 71, 0)
    'use_react_native-0.71'
  elsif version >= v(0, 70, 0)
    'use_react_native-0.70'
  elsif version >= v(0, 68, 0)
    'use_react_native-0.68'
  elsif version >= v(0, 66, 0)
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
  return if resources.nil? || resources.empty?

  if resources.any? { |r| !File.exist?(File.join(app_dir, r)) }
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
      'visionos' => platforms[:visionos],
    },
    'resources' => resources,
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

def use_react_native!(project_root, target_platform, options)
  react_native = react_native_path(project_root, target_platform)
  version = package_version(react_native.to_s).segments
  version = v(version[0], version[1], version[2])

  require_relative(react_native_pods(version))

  include_react_native!(**options,
                        app_path: find_file('package.json', project_root).parent.to_s,
                        path: react_native.relative_path_from(project_root).to_s,
                        rta_project_root: project_root,
                        version: version)
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
  generate_info_plist!(project_root, target_platform, destination)

  # Copy localization files and replace instances of `ReactTestApp` with app display name
  product_name = display_name || name
  product_name = target.name unless product_name.is_a? String
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
    node_bin = `which node`.strip!
    f.write("export NODE_BINARY=#{node_bin}\n")
  end
  File.open(File.join(destination, '.env'), 'w') do |f|
    node_bin = `dirname $(which node)`.strip!
    f.write("export PATH=#{node_bin}:$PATH\n")
  end

  react_native = react_native_path(project_root, target_platform)
  rn_version = package_version(react_native.to_s).segments
  rn_version = v(rn_version[0], rn_version[1], rn_version[2])
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

  use_new_arch = new_architecture_enabled?(options, rn_version)
  use_bridgeless = bridgeless_enabled?(options, rn_version)
  app_project = Xcodeproj::Project.open(xcodeproj_dst)
  app_project.native_targets.each do |target|
    case target.name
    when 'ReactTestApp'
      # In Xcode 15, `unary_function` and `binary_function` are no longer
      # provided in C++17 and newer Standard modes. See Xcode release notes:
      # https://developer.apple.com/documentation/xcode-release-notes/xcode-15-release-notes#Deprecations
      # Upstream issue: https://github.com/facebook/react-native/issues/37748
      enable_cxx17_removed_unary_binary_function =
        (rn_version >= v(0, 72, 0) && rn_version < v(0, 72, 5)) ||
        (rn_version >= v(0, 71, 0) && rn_version < v(0, 71, 4)) ||
        (rn_version.positive? && rn_version < v(0, 70, 14))
      target.build_configurations.each do |config|
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << version_macro
        if enable_cxx17_removed_unary_binary_function
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] <<
            '_LIBCPP_ENABLE_CXX17_REMOVED_UNARY_BINARY_FUNCTION=1'
        end
        if use_new_arch
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'FOLLY_NO_CONFIG=1'
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'RCT_NEW_ARCH_ENABLED=1'
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'USE_FABRIC=1'
          if use_bridgeless
            config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'USE_BRIDGELESS=1'
          end
        end

        build_settings.each do |setting, value|
          config.build_settings[setting] = value
        end

        config.build_settings['OTHER_SWIFT_FLAGS'] ||= ['$(inherited)']
        config.build_settings['OTHER_SWIFT_FLAGS'] << '-DUSE_FABRIC' if use_new_arch
        config.build_settings['OTHER_SWIFT_FLAGS'] << '-DUSE_BRIDGELESS' if use_bridgeless
        if single_app.is_a? String
          config.build_settings['OTHER_SWIFT_FLAGS'] << '-DENABLE_SINGLE_APP_MODE'
        end

        config.build_settings['USER_HEADER_SEARCH_PATHS'] ||= ['$(inherited)']
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
      :visionos => config.resolve_build_setting('XROS_DEPLOYMENT_TARGET'),
    },
    :react_native_version => rn_version,
    :use_new_arch => use_new_arch,
    :code_sign_identity => code_sign_identity || '',
    :development_team => development_team || '',
  }
end

def use_test_app_internal!(target_platform, options)
  assert_version(Pod::VERSION)
  assert(%i[ios macos visionos].include?(target_platform),
         "Unsupported platform: #{target_platform}")

  xcodeproj = 'ReactTestApp.xcodeproj'
  project_root = Pod::Config.instance.installation_root
  project_target = make_project!(xcodeproj, project_root, target_platform, options)
  xcodeproj_dst, platforms = project_target.values_at(:xcodeproj_path, :platforms)

  if project_target[:use_new_arch] || project_target[:react_native_version] >= v(0, 73, 0)
    install! 'cocoapods', :deterministic_uuids => false
  end

  require_relative(autolink_script_path(project_root, target_platform))

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
    react_native_post_install = use_react_native!(project_root, target_platform, options)

    pod 'ReactNativeHost', :path => resolve_module_relative('@rnx-kit/react-native-host')

    if (resources_pod_path = resources_pod(project_root, target_platform, platforms))
      pod 'ReactTestApp-Resources', :path => resources_pod_path
    end

    yield ReactTestAppTargets.new(self) if block_given?

    use_native_modules!
  end

  post_install do |installer|
    react_native_post_install&.call(installer)
    options[:post_install]&.call(installer)

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
      when /\AReact/, 'RCT-Folly', 'SocketRocket', 'Yoga', 'fmt', 'glog'
        target.build_configurations.each do |config|
          # TODO: Drop `_LIBCPP_ENABLE_CXX17_REMOVED_UNARY_BINARY_FUNCTION` when
          #       we no longer support 0.72
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] <<
            '_LIBCPP_ENABLE_CXX17_REMOVED_UNARY_BINARY_FUNCTION=1'
          config.build_settings['WARNING_CFLAGS'] ||= []
          config.build_settings['WARNING_CFLAGS'] << '-w'
        end
      when 'RNReanimated'
        # Reanimated tries to automatically install itself by swizzling a method
        # in `RCTAppDelegate`. We don't use it since it doesn't exist on older
        # versions of React Native. Redirect users to the config plugin instead.
        # See https://github.com/microsoft/react-native-test-app/issues/1195 and
        # https://github.com/software-mansion/react-native-reanimated/commit/a8206f383e51251e144cb9fd5293e15d06896df0.
        target.build_configurations.each do |config|
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'DONT_AUTOINSTALL_REANIMATED'
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

    apply_config_plugins(project_root, target_platform)

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
