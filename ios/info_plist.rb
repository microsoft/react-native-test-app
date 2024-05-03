require('xcodeproj')

require_relative('pod_helpers')

def generate_info_plist!(project_root, target_platform, destination)
  manifest = app_manifest(project_root)
  return if manifest.nil?

  infoplist_src = project_path('ReactTestApp/Info.plist', target_platform)
  infoplist_dst = File.join(destination, File.basename(infoplist_src))

  info = Xcodeproj::Plist.read_from_path(infoplist_src)

  resources = resolve_resources(manifest, target_platform)
  register_fonts!(resources, target_platform, info)
  set_macos_properties!(manifest, target_platform, info)

  Xcodeproj::Plist.write_to_path(info, infoplist_dst)
end

private

def register_fonts!(resources, target_platform, info)
  font_files = %w[.otf .ttf]
  fonts = []
  resources&.each do |filename|
    fonts << File.basename(filename) if font_files.include?(File.extname(filename))
  end
  return if fonts.empty?

  # https://developer.apple.com/documentation/bundleresources/information_property_list/atsapplicationfontspath
  info['ATSApplicationFontsPath'] = '.' if target_platform == :macos
  # https://developer.apple.com/documentation/uikit/text_display_and_fonts/adding_a_custom_font_to_your_app
  info['UIAppFonts'] = fonts unless target_platform == :macos
end

def set_macos_properties!(manifest, target_platform, info)
  return unless target_platform == :macos

  config = manifest[target_platform.to_s]
  return if config.nil?

  category = config['applicationCategoryType']
  info['LSApplicationCategoryType'] = category unless category.nil?

  copyright = config['humanReadableCopyright']
  info['NSHumanReadableCopyright'] = copyright unless copyright.nil?
end
