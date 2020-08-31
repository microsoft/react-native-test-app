#pragma once

#include <any>
#include <map>
#include <optional>
#include <string>
#include <vector>

namespace ReactTestApp
{
    struct Component {
        std::string appKey;
        std::optional<std::string> displayName;
        std::optional<std::map<std::string, std::any>> initialProperties;
    };

    struct Manifest {
        std::string name;
        std::string displayName;
        std::vector<Component> components;
    };

    std::optional<Manifest> GetManifest(std::string const &manifestFileName);

}  // namespace ReactTestApp
