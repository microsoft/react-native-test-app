#include "pch.h"

#include "DevMenu.h"

#include <type_traits>

#include "ReactInstance.h"
#include "Session.h"

using ReactApp::Component;
using ReactApp::DevMenu;
using ReactApp::DevMenuCommand;
using ReactTestApp::JSBundleSource;
using ReactTestApp::ReactInstance;
using ReactTestApp::Session;

namespace
{
    constexpr wchar_t kLabelLoadFromJSBundle[] = L"Load from &JS bundle";
    constexpr wchar_t kLabelLoadFromDevServer[] = L"Load from &dev server";
    constexpr wchar_t kLabelRememberLastComponent[] = L"&Remember last opened component";
    constexpr wchar_t kLabelReloadJS[] = L"&Reload JavaScript";

    constexpr wchar_t kLabelEnableDirectDebugger[] = L"Enable &direct debugging";
    constexpr wchar_t kLabelDisableDirectDebugger[] = L"Disable &direct debugging";

    constexpr wchar_t kLabelEnableBreakOnFirstLine[] = L"Enable &break on first line";
    constexpr wchar_t kLabelDisableBreakOnFirstLine[] = L"Disable &break on first line";

    constexpr wchar_t kLabelEnableFastRefresh[] = L"Enable &Fast Refresh";
    constexpr wchar_t kLabelDisableFastRefresh[] = L"Disable &Fast Refresh";

    constexpr wchar_t kLabelToggleInspector[] = L"Toggle &inspector";

    constexpr UINT ItemID(DevMenuCommand cmd)
    {
        return static_cast<UINT>(cmd);
    }

    HMENU CreateReactMenu(std::vector<Component> const &components)
    {
        auto hReactMenu = CreatePopupMenu();
        AppendMenuW(hReactMenu,  //
                    MF_STRING,
                    ItemID(DevMenuCommand::LoadFromBundle),
                    kLabelLoadFromJSBundle);
        AppendMenuW(hReactMenu,
                    MF_STRING,
                    ItemID(DevMenuCommand::LoadFromDevServer),
                    kLabelLoadFromDevServer);

        auto rememberLastComponent =
            Session::ShouldRememberLastComponent() ? MF_CHECKED : MF_UNCHECKED;
        AppendMenuW(hReactMenu,
                    MF_DISABLED | MF_STRING | rememberLastComponent,
                    ItemID(DevMenuCommand::RememberLastComponent),
                    kLabelRememberLastComponent);

        if (!components.empty()) {
            AppendMenuW(hReactMenu, MF_SEPARATOR, 0, nullptr);
            constexpr auto offset = ItemID(DevMenuCommand::ComponentsStart);
            std::remove_const_t<decltype(offset)> index = 0;
            for (auto const &component : components) {
                auto const &title = component.displayName.value_or(component.appKey);
                // Add keyboard accelerator for the first nine (1-9) components
                auto label = index < 8 ? winrt::to_hstring(title) + L"\tCtrl+Shift+" +
                                             std::to_wstring(index + 1)
                                       : winrt::to_hstring(title);
                AppendMenuW(hReactMenu, MF_DISABLED | MF_STRING, offset + (++index), label.c_str());
            }
        }

        return hReactMenu;
    }

    HMENU CreateDebugMenu(ReactInstance const &instance)
    {
        auto hDebugMenu = CreatePopupMenu();
        AppendMenuW(hDebugMenu,  //
                    MF_STRING,
                    ItemID(DevMenuCommand::ReloadJS),
                    kLabelReloadJS);
        AppendMenuW(hDebugMenu,
                    MF_STRING,
                    ItemID(DevMenuCommand::DirectDebugger),
                    instance.UseDirectDebugger() ? kLabelDisableDirectDebugger
                                                 : kLabelEnableDirectDebugger);
        AppendMenuW(hDebugMenu,
                    MF_STRING,
                    ItemID(DevMenuCommand::BreakOnFirstLine),
                    instance.BreakOnFirstLine() ? kLabelDisableBreakOnFirstLine
                                                : kLabelEnableBreakOnFirstLine);
        AppendMenuW(hDebugMenu,
                    MF_STRING,
                    ItemID(DevMenuCommand::FastRefresh),
                    instance.UseFastRefresh() ? kLabelDisableFastRefresh : kLabelEnableFastRefresh);
        AppendMenuW(hDebugMenu,  //
                    MF_STRING,
                    ItemID(DevMenuCommand::ToggleInspector),
                    kLabelToggleInspector);
        return hDebugMenu;
    }

    HMENU CreateDevMenu(ReactInstance const &instance, std::vector<Component> const &components)
    {
        auto hReactMenu = CreateReactMenu(components);
        auto hDebugMenu = CreateDebugMenu(instance);

        auto hMenuBar = CreateMenu();
        AppendMenuW(hMenuBar, MF_POPUP, reinterpret_cast<UINT_PTR>(hReactMenu), L"&React");
        AppendMenuW(hMenuBar, MF_POPUP, reinterpret_cast<UINT_PTR>(hDebugMenu), L"&Debug");

        return hMenuBar;
    }

    void SetMenuItemLabel(HMENU hMenu, DevMenuCommand cmd, LPCWSTR label)
    {
        MENUITEMINFOW info{.cbSize = sizeof(MENUITEMINFO),
                           .fMask = MIIM_TYPE,
                           .dwTypeData = const_cast<LPWSTR>(label)};
        SetMenuItemInfoW(hMenu, ItemID(cmd), false, &info);
    }
}  // namespace

DevMenu::DevMenu(ReactInstance &instance, std::vector<Component> const &components)
    : instance_(instance), hMenu_(CreateDevMenu(instance, components))
{
}

void DevMenu::OnCommand(DevMenuCommand cmd) const
{
    switch (cmd) {
        case DevMenuCommand::LoadFromBundle: {
            instance_.LoadJSBundleFrom(JSBundleSource::Embedded);
            break;
        }
        case DevMenuCommand::LoadFromDevServer: {
            instance_.LoadJSBundleFrom(JSBundleSource::DevServer);
            break;
        }
        case DevMenuCommand::RememberLastComponent: {
            auto rememberLastComponent = !Session::ShouldRememberLastComponent();
            Session::ShouldRememberLastComponent(rememberLastComponent);
            CheckMenuItem(hMenu_, ItemID(cmd), rememberLastComponent ? MF_CHECKED : MF_UNCHECKED);
            break;
        }
        case DevMenuCommand::ReloadJS: {
            instance_.Reload();
            break;
        }
        case DevMenuCommand::DirectDebugger: {
            auto useDirectDebugger = !instance_.UseDirectDebugger();
            instance_.UseDirectDebugger(useDirectDebugger);
            SetMenuItemLabel(hMenu_,
                             cmd,
                             useDirectDebugger ? kLabelDisableDirectDebugger
                                               : kLabelEnableDirectDebugger);
            break;
        }
        case DevMenuCommand::BreakOnFirstLine: {
            auto breakOnFirstLine = !instance_.BreakOnFirstLine();
            instance_.BreakOnFirstLine(breakOnFirstLine);
            SetMenuItemLabel(hMenu_,
                             cmd,
                             breakOnFirstLine ? kLabelDisableBreakOnFirstLine
                                              : kLabelEnableBreakOnFirstLine);
            break;
        }
        case DevMenuCommand::FastRefresh: {
            auto useFastRefresh = !instance_.UseFastRefresh();
            instance_.UseFastRefresh(useFastRefresh);
            SetMenuItemLabel(hMenu_,  //
                             cmd,
                             useFastRefresh ? kLabelDisableFastRefresh : kLabelEnableFastRefresh);
            break;
        }
        case DevMenuCommand::ToggleInspector: {
            instance_.ToggleElementInspector();
            break;
        }
        default: {
            if (cmd > DevMenuCommand::ComponentsStart) {
                // TODO
            }
            break;
        }
    }
}
