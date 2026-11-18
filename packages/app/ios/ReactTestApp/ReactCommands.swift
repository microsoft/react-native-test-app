import SwiftUI

struct ReactCommands: Commands {
    @ObservedObject var model: AppModel
    @ObservedObject var picker: ComponentPickerModel

    init(model: AppModel) {
        _model = ObservedObject(wrappedValue: model)
        _picker = ObservedObject(wrappedValue: model.picker)
    }

    var body: some Commands {
        CommandMenu("React") {
            Button("Load Embedded JS Bundle") {
                model.loadEmbeddedBundle()
            }

            Button("Load From Dev Server") {
                model.loadFromDevServer()
            }

            Toggle("Remember Last Opened Component", isOn: $picker.rememberLastComponent)
                .disabled(picker.components.count <= 1)

            Divider()

            ForEach(Array(picker.components.enumerated()), id: \.offset) { index, component in
                componentButton(component, at: index)
            }
        }
    }

    @ViewBuilder
    private func componentButton(_ component: Component, at index: Int) -> some View {
        let button = Button(component.displayName ?? component.appKey) {
            model.selectComponent(component, at: index)
        }
        .disabled(!picker.componentsEnabled)

        // The `KeyboardShortcut?` overload of `keyboardShortcut(_:)` is only
        // available in iOS 15.4+, so only attach a shortcut when there is one.
        if let shortcut = shortcut(for: index) {
            button.keyboardShortcut(shortcut)
        } else {
            button
        }
    }

    private func shortcut(for index: Int) -> KeyboardShortcut? {
        guard index < 9 else {
            return nil
        }

        return KeyboardShortcut(
            KeyEquivalent(Character("\(index + 1)")),
            modifiers: [.command, .shift]
        )
    }
}
