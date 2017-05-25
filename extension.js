// Includes
var vscode = require("vscode");
var navigation = require("./navigation.js");
var bookmarks = require("./bookmarks.js");

function initialize(state) {
    console.log(this.name + ": Initializing workspace by loading fuzzy");

    // Attempts to load the current workspace folder
    navigation.load_fuzzy(state);
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    console.log(this.name + ": File Explorer is now available in VS Code");

    var state = context.globalState;

    initialize(state);

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    var navCommand = vscode.commands.registerCommand("extension.navigate", 
    () => { navigation.navigate(state) } );
    var fuzCommand = vscode.commands.registerCommand("extension.fuzzyFind",
    () => { navigation.fuzzy_find(state) } );
    var setCommand = vscode.commands.registerCommand("extension.setRoot",
    () => { navigation.set_root(state) } );
    var addCommand = vscode.commands.registerCommand("extension.addBookmark", 
    () => { bookmarks.add_bookmark(state) } );
    var delCommand = vscode.commands.registerCommand("extension.removeBookmark",
    () => { bookmarks.del_bookmark(state) } );
    var clrCommand = vscode.commands.registerCommand("extension.clearBookmarks",
    () => { bookmarks.clr_bookmarks(state) } );

    // Add to a list of disposables that die when the extension deactivates
    context.subscriptions.push(navCommand);
    context.subscriptions.push(fuzCommand);
    context.subscriptions.push(setCommand);
    context.subscriptions.push(addCommand);
    context.subscriptions.push(delCommand);
    context.subscriptions.push(clrCommand);
    context.subscriptions.push(state);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
    console.log(this.name + ": Deactivating extension");
}

exports.deactivate = deactivate;