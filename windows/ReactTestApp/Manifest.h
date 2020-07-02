#pragma once

#include <list>
#include <map>
#include <optional>
#include <string>

#include <nlohmann/json.hpp>

using json = nlohmann::json;
using namespace std;

namespace winrt::ReactTestApp::implementation {
    struct Component {
        string appKey;
        std::optional<string> displayName;
        std::optional<map<string, string>> initialProperties;
    };

    struct Manifest {
        string name;
        string displayName;
        list<Component> components;
    };

    template <typename T>
    std::optional<T> get_optional(const json &j, const string &key)
    try {
        return j.at(key).get<T>();
    }
    catch (const json::exception &) {
        return std::nullopt;
    }

    inline void from_json(const json &j, Component &c)
    {
        c.appKey = j.at("appKey");
        c.displayName = get_optional<string>(j, "displayName");
        c.initialProperties = get_optional<map<string, string>>(j, "initialProperties");
    }

    inline void from_json(const json &j, Manifest &m)
    {
        m.name = j.at("name");
        m.displayName = j.at("displayName");
        m.components = j.at("components").get<list<Component>>();
    }

    struct ManifestProvider {
        static Manifest getManifest();
    };
}  // namespace winrt::ReactTestApp::implementation
