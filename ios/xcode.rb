IPHONEOS_DEPLOYMENT_TARGET = 'IPHONEOS_DEPLOYMENT_TARGET'.freeze
MACOSX_DEPLOYMENT_TARGET = 'MACOSX_DEPLOYMENT_TARGET'.freeze
XROS_DEPLOYMENT_TARGET = 'XROS_DEPLOYMENT_TARGET'.freeze

CODE_SIGN_ENTITLEMENTS = 'CODE_SIGN_ENTITLEMENTS'.freeze
CODE_SIGN_IDENTITY = 'CODE_SIGN_IDENTITY'.freeze
DEVELOPMENT_TEAM = 'DEVELOPMENT_TEAM'.freeze
ENABLE_TESTING_SEARCH_PATHS = 'ENABLE_TESTING_SEARCH_PATHS'.freeze
GCC_PREPROCESSOR_DEFINITIONS = 'GCC_PREPROCESSOR_DEFINITIONS'.freeze
OTHER_SWIFT_FLAGS = 'OTHER_SWIFT_FLAGS'.freeze
PRODUCT_BUILD_NUMBER = 'PRODUCT_BUILD_NUMBER'.freeze
PRODUCT_BUNDLE_IDENTIFIER = 'PRODUCT_BUNDLE_IDENTIFIER'.freeze
PRODUCT_DISPLAY_NAME = 'PRODUCT_DISPLAY_NAME'.freeze
PRODUCT_VERSION = 'PRODUCT_VERSION'.freeze
USER_HEADER_SEARCH_PATHS = 'USER_HEADER_SEARCH_PATHS'.freeze
WARNING_CFLAGS = 'WARNING_CFLAGS'.freeze

def override_build_settings!(build_settings, overrides)
  overrides&.each do |setting, value|
    build_settings[setting] = value
  end
end

def configure_xcschemes!(xcschemes_path, project_root, target_platform, name)
  xcscheme = File.join(xcschemes_path, "ReactTestApp.xcscheme")
  metal_api_validation = platform_config('metalAPIValidation', project_root, target_platform)

  # Oddly enough, to disable Metal API validation, we need to remove the `enableGPUValidationMode` key from the xcscheme file.
  # A default Xcode project does not have this key, so lets follow that pattern and only add it if it is enabled.
  if metal_api_validation.nil? || metal_api_validation == true
    xcscheme_content = File.read(xcscheme)
    new_content = xcscheme_content.gsub(/^\s*enableGPUValidationMode\s*=\s*"1"\s*$/, '')
    File.write(xcscheme, new_content)
    return
  end

  # Make a copy of the ReactTestApp.xcscheme file with the app name for convenience.
  unless name.nil?
    FileUtils.cp(xcscheme, File.join(xcschemes_path, "#{name}.xcscheme"))
  end
end