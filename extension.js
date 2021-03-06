// Includes
var vscode = require("vscode");
var path = require("path");
var navigation = require("./navigation.js");
var bookmarks = require("./bookmarks.js");
var globals = require("./globals.js");

function initialize(state) {
    // Null the workspace if it has changed, to ensure that fuzzy find will reload
    let workspace = state.get(globals.TAG_WORKSPACE);
    if (workspace != vscode.workspace.rootPath) {
        state.update(globals.TAG_WORKSPACE, undefined);
    }
}

// this method is called when your extension is activated
function activate(context) {
    console.log(this.name + ": File Explorer is now available in VS Code");

    var state = context.globalState;

    // Commands matching that of that in package.json
    var navCommand = vscode.commands.registerCommand("extension.navigate",
        () => { navigation.navigate(state) });
    var setCommand = vscode.commands.registerCommand("extension.setRoot",
        () => { navigation.set_root(state) });
    var addCommand = vscode.commands.registerCommand("extension.addBookmark",
        () => { bookmarks.add_bookmark(state) });
    var delCommand = vscode.commands.registerCommand("extension.removeBookmark",
        () => { bookmarks.del_bookmark(state) });
    var clrCommand = vscode.commands.registerCommand("extension.clearBookmarks",
        () => { bookmarks.clr_bookmarks(state) });

    // Add to a list of disposables that die when the extension deactivates
    context.subscriptions.push(navCommand);
    context.subscriptions.push(setCommand);
    context.subscriptions.push(addCommand);
    context.subscriptions.push(delCommand);
    context.subscriptions.push(clrCommand);

    context.subscriptions.push(state);

    initialize(state);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
    console.log(this.name + ": Deactivating extension");
}

exports.deactivate = deactivate;