require('cfpropertylist')

require_relative('pod_helpers')

# https://developer.apple.com/documentation/bundleresources/privacy_manifest_files
PRIVACY_ACCESSED_API_TYPES = 'NSPrivacyAccessedAPITypes'.freeze
PRIVACY_COLLECTED_DATA_TYPES = 'NSPrivacyCollectedDataTypes'.freeze
PRIVACY_TRACKING = 'NSPrivacyTracking'.freeze
PRIVACY_TRACKING_DOMAINS = 'NSPrivacyTrackingDomains'.freeze

# https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api
PRIVACY_ACCESSED_API_TYPE = 'NSPrivacyAccessedAPIType'.freeze
PRIVACY_ACCESSED_API_TYPE_REASONS = 'NSPrivacyAccessedAPITypeReasons'.freeze
PRIVACY_ACCESSED_API_CATEGORY_FILE_TIMESTAMP = 'NSPrivacyAccessedAPICategoryFileTimestamp'.freeze
PRIVACY_ACCESSED_API_CATEGORY_SYSTEM_BOOT_TIME = 'NSPrivacyAccessedAPICategorySystemBootTime'.freeze
PRIVACY_ACCESSED_API_CATEGORY_USER_DEFAULTS = 'NSPrivacyAccessedAPICategoryUserDefaults'.freeze

def generate_privacy_manifest!(project_root, target_platform, destination)
  privacy = {
    PRIVACY_TRACKING => false,
    PRIVACY_TRACKING_DOMAINS => [],
    PRIVACY_COLLECTED_DATA_TYPES => [],
    PRIVACY_ACCESSED_API_TYPES => [
      {
        PRIVACY_ACCESSED_API_TYPE => PRIVACY_ACCESSED_API_CATEGORY_FILE_TIMESTAMP,
        PRIVACY_ACCESSED_API_TYPE_REASONS => ['C617.1'],
      },
      {
        PRIVACY_ACCESSED_API_TYPE => PRIVACY_ACCESSED_API_CATEGORY_SYSTEM_BOOT_TIME,
        PRIVACY_ACCESSED_API_TYPE_REASONS => ['35F9.1'],
      },
      {
        PRIVACY_ACCESSED_API_TYPE => PRIVACY_ACCESSED_API_CATEGORY_USER_DEFAULTS,
        PRIVACY_ACCESSED_API_TYPE_REASONS => ['CA92.1'],
      },
    ],
  }

  user_privacy_manifest = platform_config('privacyManifest', project_root, target_platform)
  unless user_privacy_manifest.nil?
    tracking = user_privacy_manifest[PRIVACY_TRACKING]
    privacy[PRIVACY_TRACKING] = tracking unless tracking.nil?

    [
      PRIVACY_TRACKING_DOMAINS,
      PRIVACY_COLLECTED_DATA_TYPES,
      PRIVACY_ACCESSED_API_TYPES,
    ].each do |field|
      value = user_privacy_manifest[field]
      privacy[field] += value if value.is_a? Enumerable
    end
  end

  plist = CFPropertyList::List.new
  plist.value = CFPropertyList.guess(privacy)
  plist.save(File.join(destination, 'PrivacyInfo.xcprivacy'),
             CFPropertyList::List::FORMAT_XML,
             { :formatted => true })
end
