//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

#include "pch.h"

#include "Manifest.h"

#include <cstdio>

#include <nlohmann/json.hpp>
#include <winrt/Windows.Security.Cryptography.Core.h>
#include <winrt/Windows.Security.Cryptography.h>

using nlohmann::detail::value_t;
using winrt::Windows::Security::Cryptography::BinaryStringEncoding;
using winrt::Windows::Security::Cryptography::CryptographicBuffer;
using winrt::Windows::Security::Cryptography::Core::HashAlgorithmNames;
using winrt::Windows::Security::Cryptography::Core::HashAlgorithmProvider;

namespace
{
    std::string checksum(std::string const &data)
    {
        auto hasher = HashAlgorithmProvider::OpenAlgorithm(HashAlgorithmNames::Sha256());
        auto digest = hasher.HashData(CryptographicBuffer::ConvertStringToBinary(
            winrt::to_hstring(data), BinaryStringEncoding::Utf8));
        auto checksum = CryptographicBuffer::EncodeToHexString(digest);
        return winrt::to_string(checksum);
    }

    template <typename T>
    std::optional<T> get_optional(const nlohmann::json &j, const std::string &key)
    {
        auto element = j.find(key);
        if (element != j.end()) {
            return element->get<T>();
        } else {
            return std::nullopt;
        }
    }

    std::any getAny(const nlohmann::json &j)
    {
        switch (j.type()) {
            case value_t::null:
                return std::nullopt;
            case value_t::boolean:
                return j.get<bool>();
            case value_t::number_integer:
                return j.get<std::int64_t>();
            case value_t::number_unsigned:
                return j.get<std::uint64_t>();
            case value_t::number_float:
                return j.get<double>();
            case value_t::string:
                return j.get<std::string>();
            case value_t::object: {
                std::map<std::string, std::any> map;
                for (auto &&e : j.items()) {
                    map.insert(std::make_pair(e.key(), getAny(e.value())));
                }
                return map;
            }
            case value_t::array: {
                std::vector<std::any> array;
                for (auto &&e : j.items()) {
                    array.push_back(getAny(e.value()));
                }
                return array;
            }
            // value_t::discarded. This case should never be hit since the check for malformed json
            // is done previously in GetManifest()
            default:
                assert(false);
                return std::nullopt;
        }
    }

    std::optional<std::map<std::string, std::any>> parseInitialProps(const nlohmann::json &j)
    {
        auto element = j.find("initialProperties");
        if (element != j.end()) {
            std::map<std::string, std::any> map;
            for (auto &&property : element->items()) {
                map.insert(std::make_pair(property.key(), getAny(property.value())));
            }
            return map;
        } else {
            return std::nullopt;
        }
    }

}  // namespace

namespace ReactTestApp
{
    void from_json(const nlohmann::json &j, Component &c)
    {
        c.appKey = j.at("appKey");
        c.displayName = get_optional<std::string>(j, "displayName");
        c.initialProperties = parseInitialProps(j);
        c.presentationStyle = get_optional<std::string>(j, "presentationStyle");
    }

    void from_json(const nlohmann::json &j, Manifest &m)
    {
        m.name = j.at("name");
        m.displayName = j.at("displayName");
        m.components = get_optional<std::vector<Component>>(j, "components")
                           .value_or(std::vector<Component>{});
    }

    std::optional<std::pair<Manifest, std::string>> GetManifest(std::string const &filename)
    {
        std::FILE *stream = nullptr;
        if (fopen_s(&stream, filename.c_str(), "rb") != 0) {
            return std::nullopt;
        }

        std::string json;
        std::fseek(stream, 0, SEEK_END);
        json.resize(std::ftell(stream));

        std::rewind(stream);
        std::fread(json.data(), 1, json.size(), stream);
        std::fclose(stream);

        auto j = nlohmann::json::parse(json, nullptr, false);
        if (j.is_discarded()) {
            return std::nullopt;
        }

        return std::make_pair(j.get<Manifest>(), checksum(json));
    }
}  // namespace ReactTestApp
