require('xcodeproj')

require_relative('pod_helpers')

DEFAULT_IOS_ENTITLEMENTS = {
  'keychain-access-groups' => [
    '$(AppIdentifierPrefix)com.microsoft.adalcache',
  ],
}.freeze

DEFAULT_MACOS_ENTITLEMENTS = {
  'com.apple.security.app-sandbox' => true,
  'com.apple.security.files.user-selected.read-only' => true,
  'com.apple.security.network.client' => true,
}.freeze

def generate_entitlements!(project_root, target_platform, destination)
  user_entitlements = platform_config('codeSignEntitlements', project_root, target_platform)
  # If `codeSignEntitlements` is a string, set `CODE_SIGN_ENTITLEMENTS` instead
  return if user_entitlements.is_a? String

  entitlements = target_platform == :macos ? DEFAULT_MACOS_ENTITLEMENTS : DEFAULT_IOS_ENTITLEMENTS

  Xcodeproj::Plist.write_to_path(entitlements.merge(user_entitlements || {}),
                                 File.join(destination, 'App.entitlements'))
end
