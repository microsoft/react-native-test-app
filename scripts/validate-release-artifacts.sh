#!/bin/bash
set -euo pipefail

# Submission-free release artifact validation for the single-app example.
# Usage: bash scripts/validate-release-artifacts.sh android|ios setup|build|validate
# Only setup/build may provision tools or resolve dependencies. Validation uses
# local artifacts only: no downloads, authentication, uploads, or store services.
# These structural checks cannot establish native-code policy compliance, store
# acceptance, privacy-declaration completeness, or production-signing readiness.

fail() {
  echo "error: $*" >&2
  exit 1
}

require_tool() {
  command -v "$1" >/dev/null || fail "Required tool not found: $1"
}

root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
project="$root/packages/app/example"
platform=${1:-}
phase=${2:-}
[[ "$platform" == android || "$platform" == ios ]] || fail "Expected platform: android or ios"
[[ "$phase" == setup || "$phase" == build || "$phase" == validate ]] || fail "Expected phase: setup, build, or validate"
work="${RUNNER_TEMP:?RUNNER_TEMP must point to a disposable CI directory}/rnta-release-$platform"

android_tools() {
  # Select installed SDK/NDK tools, never sdkmanager or a downloaded toolchain.
  local sdk="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
  [[ -d "$sdk/build-tools" && -d "$sdk/ndk" ]] || fail "Android SDK build-tools and NDK are required"
  build_tools=$(find "$sdk/build-tools" -mindepth 1 -maxdepth 1 -type d | sort -V | tail -1)
  ndk=$(find "$sdk/ndk" -mindepth 1 -maxdepth 1 -type d | sort -V | tail -1)
  [[ -n "$build_tools" && -n "$ndk" ]] || fail "No installed Android build-tools or NDK found"
  apksigner="$build_tools/apksigner"
  zipalign="$build_tools/zipalign"
  readelf="$ndk/toolchains/llvm/prebuilt/linux-x86_64/bin/llvm-readelf"
  require_tool "$apksigner"
  require_tool "$zipalign"
  require_tool "$readelf"
}

setup() {
  require_tool jq
  require_tool yarn
  mkdir -p "$work"
  jq --version

  # Set single-app mode before Gradle/Pods generate their native configuration.
  jq '.singleApp = "Example"' "$project/app.json" > "$work/app.json"
  mv "$work/app.json" "$project/app.json"

  if [[ "$platform" == android ]]; then
    require_tool brew
    require_tool java
    require_tool keytool
    require_tool unzip
    require_tool openssl
    # Homebrew owns dependency resolution and checksum verification.
    brew install bundletool
    require_tool bundletool
    android_tools
    java -version
    brew list --versions bundletool
    bundletool version
    cat "$build_tools/source.properties" "$ndk/source.properties"
    "$apksigner" version
    "$readelf" --version

    # This key signs only generated CI APKs. It is not a production/upload key.
    # Restrict the disposable credentials to the runner's temporary directory.
    (
      umask 077
      openssl rand -hex 32 > "$work/signing-password"
      keytool -genkeypair -keystore "$work/ci.jks" -storetype JKS \
        -alias rnta-ci -keyalg RSA -keysize 2048 -validity 2 \
        -dname "CN=Disposable RNTA CI" \
        -storepass:file "$work/signing-password" -keypass:file "$work/signing-password"
    )
    # Reuse the same version-aware wrapper configurator as the Gradle action.
    cd "$root"
    node --eval "require('./packages/app/android/gradle-wrapper.js').configureGradleWrapper('packages/app/example/android')"
  else
    require_tool xcodebuild
    require_tool xcrun
    require_tool plutil
    require_tool file
    # Keep the runner-selected Xcode; report the SDK and tools used by it.
    xcodebuild -version
    xcrun --sdk iphoneos --show-sdk-version
    xcrun --find lipo
    xcrun --find otool
    xcrun clang --version
  fi

  # Bundle before pod install discovers resource paths, and ship local JS rather
  # than relying on Metro in a Release app.
  cd "$project"
  yarn "build:$platform"
}

build() {
  cd "$project"
  if [[ "$platform" == android ]]; then
    android_tools
    cd android
    # The example's default debug signing for the AAB is CI-only as well.
    ./gradlew --no-daemon :app:bundleRelease \
      "-PANDROID_NDK_VERSION=$(basename "$ndk")" \
      -PreactNativeArchitectures=arm64-v8a,x86_64
  else
    # A generic device archive exercises Release code, not the simulator.
    # Disable signing explicitly; never export or submit this archive.
    xcodebuild -workspace ios/Example.xcworkspace -scheme ReactTestApp \
      -configuration Release -sdk iphoneos -destination 'generic/platform=iOS' \
      -archivePath "$work/Example.xcarchive" -derivedDataPath "$work/DerivedData" \
      CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY= \
      ARCHS=arm64 ONLY_ACTIVE_ARCH=NO COMPILER_INDEX_STORE_ENABLE=NO archive
  fi
}

validate_android() {
  require_tool bundletool
  require_tool unzip
  android_tools
  local aab="$project/android/app/build/outputs/bundle/release/app-release.aab"
  [[ -s "$aab" ]] || fail "Release AAB not found: $aab"

  # Validate bundle structure, then generate the complete split APK set locally.
  # Explicit signing avoids bundletool's implicit debug-keystore fallback.
  bundletool validate --bundle="$aab"
  bundletool build-apks --bundle="$aab" --output="$work/release.apks" \
    --ks="$work/ci.jks" --ks-key-alias=rnta-ci \
    --ks-pass="file:$work/signing-password" --key-pass="file:$work/signing-password" \
    --overwrite
  mkdir -p "$work/apks" "$work/bundle"
  unzip -q -o "$work/release.apks" -d "$work/apks"
  unzip -q -o "$aab" '*/lib/*/*.so' -d "$work/bundle"

  local apk apk_count=0 library library_count=0 alignment segments
  while IFS= read -r -d '' apk; do
    echo "Checking APK: $apk"
    "$apksigner" verify --verbose --print-certs "$apk"
    # Check ZIP entry alignment and 16 KB alignment of uncompressed native code.
    "$zipalign" -c -P 16 -v 4 "$apk"
    apk_count=$((apk_count + 1))
  done < <(find "$work/apks" -type f -name '*.apk' -print0)
  ((apk_count > 0)) || fail "bundletool generated no APKs"

  # Inspect all packaged 64-bit libraries, including dependencies: a failure
  # identifies an artifact/library, not necessarily RNTA-owned source code.
  while IFS= read -r -d '' library; do
    echo "Checking 16 KB ELF LOAD alignment: $library"
    "$readelf" --program-headers --wide "$library" > "$work/elf-headers"
    cat "$work/elf-headers"
    segments=0
    while read -r alignment; do
      ((alignment >= 16384)) || fail "ELF LOAD alignment below 16 KB: $library ($alignment)"
      segments=$((segments + 1))
    done < <(awk '$1 == "LOAD" { print $NF }' "$work/elf-headers")
    ((segments > 0)) || fail "No ELF LOAD segments found: $library"
    library_count=$((library_count + 1))
  done < <(find "$work/bundle" -type f \( -path '*/lib/arm64-v8a/*.so' -o -path '*/lib/x86_64/*.so' \) -print0)
  ((library_count > 0)) || fail "No 64-bit native libraries found"
  echo "Validated $apk_count APKs and $library_count 64-bit native libraries."
}

validate_ios() {
  require_tool plutil
  require_tool xcrun
  require_tool file
  require_tool jq
  local archive="$work/Example.xcarchive" app plist binary architectures executable
  local apps=() binary_count=0 plist_count=0
  [[ -d "$archive/Products/Applications" ]] || fail "Device archive not found: $archive"
  while IFS= read -r -d '' app; do
    apps+=("$app")
  done < <(find "$archive/Products/Applications" -maxdepth 1 -type d -name '*.app' -print0)
  ((${#apps[@]} == 1)) || fail "Expected exactly one archived application"
  app=${apps[0]}
  [[ -f "$app/PrivacyInfo.xcprivacy" ]] || fail "RNTA privacy manifest is missing"
  plutil -lint "$archive/Info.plist" "$app/Info.plist"
  executable=$(plutil -extract CFBundleExecutable raw -o - "$app/Info.plist")
  [[ -f "$app/$executable" ]] || fail "Packaged application executable is missing"
  [[ "$(file -b "$app/$executable")" == *Mach-O* ]] || fail "Application executable is not Mach-O"
  plutil -extract CFBundleSupportedPlatforms json -o - "$app/Info.plist" |
    jq -e '. == ["iPhoneOS"]' >/dev/null

  # Lint every packaged plist and privacy manifest, including nested frameworks.
  # Syntax validation does not audit required-reason APIs or privacy disclosures.
  while IFS= read -r -d '' plist; do
    plutil -lint "$plist"
    plist_count=$((plist_count + 1))
  done < <(find "$app" -type f \( -name '*.plist' -o -name '*.xcprivacy' \) -print0)

  # Inspect actual Mach-O load commands: arm64 alone also matches simulators.
  while IFS= read -r -d '' binary; do
    if [[ "$(file -b "$binary")" != *Mach-O* ]]; then
      continue
    fi
    echo "Checking device binary: $binary"
    architectures=$(xcrun lipo -archs "$binary")
    [[ "$architectures" == arm64 ]] || fail "Unexpected device architectures in $binary: $architectures"
    xcrun otool -l "$binary" > "$work/macho-headers"
    # Support both modern LC_BUILD_VERSION and legacy iPhoneOS version commands.
    awk '
      $1 == "cmd" { command = $2 }
      command == "LC_BUILD_VERSION" && $1 == "platform" {
        found = 1
        if ($2 != "2" && $2 != "IOS") bad = 1
        print
      }
      command == "LC_VERSION_MIN_IPHONEOS" { found = 1 }
      END { exit (!found || bad) }
    ' "$work/macho-headers" || fail "Non-iOS device binary platform: $binary"
    binary_count=$((binary_count + 1))
  done < <(find "$app" -type f -print0)
  ((binary_count > 0)) || fail "No packaged Mach-O binaries found"
  echo "Validated $plist_count plists/privacy manifests and $binary_count device binaries."
}

case "$phase" in
  setup) setup ;;
  build) build ;;
  validate)
    "validate_$platform"
    # Record the scope without implying that unsigned/disposable-signed output
    # demonstrates production signing or that Apple/Google accepted anything.
    summary="Single-app $platform Release artifact validation passed locally. This is not store acceptance, comprehensive native-code policy compliance, or production-signing readiness. Packaged dependencies are included in structural checks; attribute failures by library before attributing them to RNTA."
    echo "$summary"
    if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
      printf '%s\n' "$summary" >> "$GITHUB_STEP_SUMMARY"
    fi
    ;;
esac
