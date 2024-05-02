require('json')

require_relative('pod_helpers')

def generate_assets_catalog!(project_root, target_platform, destination)
  xcassets_src = project_path('ReactTestApp/Assets.xcassets', target_platform)
  xcassets_dst = File.join(destination, File.basename(xcassets_src))
  FileUtils.rm_rf(xcassets_dst)
  FileUtils.cp_r(xcassets_src, destination)

  icons = platform_config('icons', project_root, target_platform)
  primary_icon = icons && icons['primaryIcon']
  return if primary_icon.nil?

  template = JSON.parse(File.read(File.join(xcassets_src, 'AppIcon.appiconset', 'Contents.json')))
  app_manifest_dir = File.dirname(find_file('app.json', project_root))

  app_icons = (icons['alternateIcons'] || {}).merge({ 'AppIcon' => primary_icon })
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

    contents = JSON.pretty_generate({ 'images' => images, 'info' => template['info'] })
    File.write(File.join(app_icon_set, 'Contents.json'), contents)
  end
end
