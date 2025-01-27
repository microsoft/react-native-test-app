require 'rexml/document'

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
  xcscheme = File.join(xcschemes_path, 'ReactTestApp.xcscheme')
  metal_api_validation = platform_config('metalAPIValidation', project_root, target_platform)

  # Oddly enough, to disable Metal API validation, we need to add `enableGPUValidationMode = "1"`
  # to the xcscheme Launch Action.
  if metal_api_validation == false
    xcscheme_content = File.read(xcscheme)
    doc = REXML::Document.new(xcscheme_content)
    doc.root.elements['LaunchAction'].attributes['enableGPUValidationMode'] = '1'

    File.open(xcscheme, 'w') do |file|
      doc.write(file, 3)
    end
  end

  return if name.nil?

  # Make a copy of the ReactTestApp.xcscheme file with the app name for convenience.
  FileUtils.cp(xcscheme, File.join(xcschemes_path, "#{name}.xcscheme"))
end
