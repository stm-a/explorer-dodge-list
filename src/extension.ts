import * as vscode from "vscode"
import { DodgeTreeDataProvider } from "./dodgeTreeDataProvider"

export function activate(context: vscode.ExtensionContext) {
    const dodgeTreeDataProvider = new DodgeTreeDataProvider()
    vscode.window.registerTreeDataProvider(
        "dodgeExplorer",
        dodgeTreeDataProvider
    )

    vscode.commands.registerCommand("dodgeExplorer.refresh", () =>
        dodgeTreeDataProvider.refresh()
    )

    vscode.commands.registerCommand("extension.toggleDodgeList", () => {
        const config = vscode.workspace.getConfiguration("explorerDodgeList")
        const dodgeListEnabled = config.get<boolean>("enabled", false)
        config.update(
            "enabled",
            !dodgeListEnabled,
            vscode.ConfigurationTarget.Global
        )
        dodgeTreeDataProvider.refresh()
    })
}

export function deactivate() {}
