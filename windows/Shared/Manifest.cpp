#include "pch.h"

#include "Manifest.h"

#include <nlohmann/json.hpp>

#include "app.json.h"

using nlohmann::detail::value_t;

namespace
{
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
        c.slug = get_optional<std::string>(j, "slug");
    }

    void from_json(const nlohmann::json &j, Manifest &m)
    {
        m.name = j.at("name");
        m.displayName = j.at("displayName");
        m.bundleRoot = get_optional<std::string>(j, "bundleRoot");
        m.singleApp = get_optional<std::string>(j, "singleApp");
        m.components = get_optional<std::vector<Component>>(j, "components")
                           .value_or(std::vector<Component>{});
    }

    std::optional<std::tuple<Manifest, std::string>> GetManifest(const char *const json)
    {
        auto manifest = json == nullptr ? ReactTestApp_AppManifest : json;
        auto j = nlohmann::json::parse(manifest, nullptr, false);
        if (j.is_discarded()) {
            return std::nullopt;
        }

        return std::make_tuple(j.get<Manifest>(), std::string{ReactTestApp_AppManifestChecksum});
    }
}  // namespace ReactTestApp
