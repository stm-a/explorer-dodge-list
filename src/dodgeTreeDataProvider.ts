import * as vscode from "vscode"
import * as path from "path"

export class DodgeTreeDataProvider
    implements vscode.TreeDataProvider<vscode.Uri>
{
    private _onDidChangeTreeData: vscode.EventEmitter<
        vscode.Uri | undefined | void
    > = new vscode.EventEmitter<vscode.Uri | undefined | void>()
    readonly onDidChangeTreeData: vscode.Event<vscode.Uri | undefined | void> =
        this._onDidChangeTreeData.event

    constructor() {
        vscode.workspace.onDidChangeConfiguration(() => {
            this.refresh()
        })
    }

    private shouldDodge(uri: vscode.Uri): boolean {
        const config = vscode.workspace.getConfiguration("explorerDodgeList")
        const dodgeList = config.get<string[]>("dodgeList", [])
        const excludeList = config.get<string[]>("excludeList", [])
        const dodgeListEnabled = config.get<boolean>("enabled", false)

        if (!dodgeListEnabled) {
            return false
        }

        const fsPath = uri.fsPath

        // Check exclude list
        if (excludeList.some((excludePath) => fsPath === excludePath)) {
            return false
        }

        // Check dodge list
        return dodgeList.some((pattern) => fsPath.includes(pattern))
    }

    async getTreeItem(element: vscode.Uri): Promise<vscode.TreeItem> {
        const treeItem = new vscode.TreeItem(element)
        treeItem.label = path.basename(element.fsPath)
        treeItem.resourceUri = element

        const stats = await vscode.workspace.fs.stat(element)
        treeItem.collapsibleState =
            stats.type === vscode.FileType.Directory
                ? vscode.TreeItemCollapsibleState.Collapsed
                : vscode.TreeItemCollapsibleState.None

        return treeItem
    }

    async getChildren(element?: vscode.Uri): Promise<vscode.Uri[]> {
        if (element) {
            const entries = await vscode.workspace.fs.readDirectory(element)
            const uris = entries
                .filter(
                    ([name, type]) =>
                        !this.shouldDodge(vscode.Uri.joinPath(element, name))
                )
                .map(([name, type]) => vscode.Uri.joinPath(element, name))
            return this.sortEntries(uris)
        } else {
            const workspaceFolders = vscode.workspace.workspaceFolders
            if (workspaceFolders) {
                const rootUris = workspaceFolders.map((folder) => folder.uri)
                const childrenArray = await Promise.all(
                    rootUris.map((uri) => this.getChildren(uri))
                )
                return childrenArray.flat()
            }
            return [] // Return an empty array if no workspace folders
        }
    }

    private async sortEntries(uris: vscode.Uri[]): Promise<vscode.Uri[]> {
        const entriesWithStats = await Promise.all(
            uris.map(async (uri) => {
                const stats = await vscode.workspace.fs.stat(uri)
                return { uri, stats }
            })
        )

        entriesWithStats.sort((a, b) => {
            if (a.stats.type === b.stats.type) {
                return path
                    .basename(a.uri.fsPath)
                    .localeCompare(path.basename(b.uri.fsPath))
            }

            return a.stats.type === vscode.FileType.Directory ? -1 : 1
        })

        return entriesWithStats.map((entry) => entry.uri)
    }

    refresh(): void {
        this._onDidChangeTreeData.fire()
    }
}
