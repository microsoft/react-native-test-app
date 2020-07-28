#include "pch.h"

#include "Manifest.h"

#include <fstream>
#include <iostream>

#include <nlohmann/json.hpp>

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
}  // namespace

namespace ReactTestApp
{
    void from_json(const nlohmann::json &j, Component &c)
    {
        c.appKey = j.at("appKey");
        c.displayName = get_optional<std::string>(j, "displayName");
        c.initialProperties =
            get_optional<std::map<std::string, std::string>>(j, "initialProperties");
    }

    void from_json(const nlohmann::json &j, Manifest &m)
    {
        m.name = j.at("name");
        m.displayName = j.at("displayName");
        m.components = j.at("components").get<std::vector<Component>>();
    }

    std::optional<Manifest> GetManifest()
    {
        std::ifstream manifestFile("app.json");
        nlohmann::json j = nlohmann::json::parse(manifestFile, nullptr, false);
        if (j.is_discarded()) {
            return std::nullopt;
        }

        Manifest m = j.get<Manifest>();
        return m;
    }
}  // namespace ReactTestApp
