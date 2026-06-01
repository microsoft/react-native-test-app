#pragma once

#include <vector>

#include "Manifest.h"

namespace ReactTestApp
{
    class ReactInstance;
}

namespace ReactApp
{
    enum class DevMenuCommand {
        // Custom functions
        LoadFromBundle = 1001,
        LoadFromDevServer,
        RememberLastComponent,

        // React Native core functions
        ReloadJS = 2001,
        DirectDebugger,
        BreakOnFirstLine,
        FastRefresh,
        ToggleInspector,

        // User defined components
        ComponentsStart = 3000,
    };

    class DevMenu
    {
    public:
        DevMenu(ReactTestApp::ReactInstance &, std::vector<Component> const &);

        HMENU Handle() const
        {
            return hMenu_;
        }

        void OnCommand(DevMenuCommand) const;

        // DevMenu is non-copyable
        DevMenu(DevMenu const &) = delete;
        DevMenu &operator=(DevMenu const &) = delete;

    private:
        ReactTestApp::ReactInstance &instance_;
        HMENU hMenu_;
    };
}  // namespace ReactApp
