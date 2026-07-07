import SwiftUI

struct ReactCommands: Commands {
    @ObservedObject var model: AppModel

    var body: some Commands {
        CommandMenu("React") {
            Button("Load Embedded JS Bundle") {
                model.loadEmbeddedBundle()
            }

            Button("Load From Dev Server") {
                model.loadFromDevServer()
            }

            Toggle("Remember Last Opened Component", isOn: $model.rememberLastComponent)
                .disabled(model.components.count <= 1)

            Divider()

            ForEach(Array(model.components.enumerated()), id: \.offset) { index, component in
                Button(component.displayName ?? component.appKey) {
                    model.selectComponent(component, at: index)
                }
                .keyboardShortcut(shortcut(for: index))
                .disabled(!model.componentsEnabled)
            }
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
