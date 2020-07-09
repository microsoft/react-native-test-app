#pragma once

#include <map>
#include <optional>
#include <string>
#include <vector>

namespace ReactTestApp
{
    struct Component {
        std::string appKey;
        std::optional<std::string> displayName;
        std::optional<std::map<std::string, std::string>> initialProperties;
    };

    struct Manifest {
        std::string name;
        std::string displayName;
        std::vector<Component> components;
    };

    Manifest GetManifest();

}  // namespace ReactTestApp
