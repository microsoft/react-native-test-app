#include "pch.h"

#include "Manifest.h"

#include <fstream>
#include <iostream>
#include <nlohmann/json.hpp>

namespace winrt::ReactTestApp::implementation
{
    template <typename T>
    std::optional<T> get_optional(const nlohmann::json &j, const std::string &key)
    {
        if (j.find(key) != j.end()) {
            return j.at(key).get<T>();
        } else {
            return std::nullopt;
        }
    }

    inline void from_json(const nlohmann::json &j, Component &c)
    {
        c.appKey = j.at("appKey");
        c.displayName = get_optional<std::string>(j, "displayName");
        c.initialProperties =
            get_optional<std::map<std::string, std::string>>(j, "initialProperties");
    }

    inline void from_json(const nlohmann::json &j, Manifest &m)
    {
        m.name = j.at("name");
        m.displayName = j.at("displayName");
        m.components = j.at("components").get<std::vector<Component>>();
    }

    Manifest GetManifest()
    {
        std::ifstream manifestFile("app.json");
        nlohmann::json j;
        manifestFile >> j;
        Manifest m = j.get<Manifest>();
        return m;
    }
}  // namespace winrt::ReactTestApp::implementation
