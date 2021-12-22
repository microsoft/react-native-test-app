#pragma once

#include <winrt/Windows.Foundation.h>
#include <winrt/Windows.Storage.h>

using winrt::Windows::Foundation::PropertyValue;
using winrt::Windows::Storage::ApplicationData;

namespace ReactTestApp
{
    struct Session {
    private:
        static inline const std::wstring kChecksum = L"ManifestChecksum";
        static inline const std::wstring kRememberLastComponentEnabled =
            L"RememberLastComponent/Enabled";
        static inline const std::wstring kRememberLastComponentIndex =
            L"RememberLastComponent/Index";

        static auto LocalSettings()
        {
            return ApplicationData::Current().LocalSettings().Values();
        }

        static int LastComponentIndex()
        {
            auto index = LocalSettings().Lookup(kRememberLastComponentIndex);
            return winrt::unbox_value_or<int>(index, -1);
        }

        static void LastComponentIndex(int value)
        {
            LocalSettings().Insert(kRememberLastComponentIndex, PropertyValue::CreateInt32(value));
        }

        static std::string ManifestChecksum()
        {
            auto checksum = LocalSettings().Lookup(kChecksum);
            auto value = winrt::unbox_value_or<winrt::hstring>(checksum, L"");
            return winrt::to_string(value);
        }

        static void ManifestChecksum(std::string const &value)
        {
            auto v = PropertyValue::CreateString(winrt::to_hstring(value));
            LocalSettings().Insert(kChecksum, v);
        }

    public:
        static bool ShouldRememberLastComponent()
        {
            auto value = LocalSettings().Lookup(kRememberLastComponentEnabled);
            return winrt::unbox_value_or<bool>(value, false);
        }

        static void ShouldRememberLastComponent(bool enable)
        {
            auto value = PropertyValue::CreateBoolean(enable);
            LocalSettings().Insert(kRememberLastComponentEnabled, value);
        }

        static std::optional<int> GetLastOpenedComponent(std::string const &manifestChecksum)
        {
            if (!ShouldRememberLastComponent() || manifestChecksum != ManifestChecksum()) {
                return std::nullopt;
            }

            return LastComponentIndex();
        }

        static void StoreComponent(int index, std::string const &manifestChecksum)
        {
            LastComponentIndex(index);
            ManifestChecksum(manifestChecksum);
        }
    };
}  // namespace ReactTestApp
