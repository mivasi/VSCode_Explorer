// The module "vscode" contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
var vscode = require("vscode");
var fs = require("fs");
var path = require("path");
var query_path = require("./query_path.js");


// Global defines
var TIMEOUT = 5000;

function open(state, navPath) {
    console.log(this.name + ": Opening " + navPath);
    
    if(navPath === undefined)
        return;

    let bookmarks = state.get("bookmarks");
    bookmarks = bookmarks === undefined ? [] : bookmarks;
    let bookmark = bookmarks.find(function(bookmark){ return bookmark.name === navPath; });
    if(bookmark != undefined)
        navPath = bookmark.fPath;

    let stat = fs.lstatSync(navPath);
    if(stat.isFile()) {
        vscode.workspace.openTextDocument(navPath)
        .then(
            function(doc) {
                vscode.window.showTextDocument(doc);
            }
        );
    }
    else if(stat.isDirectory()) {
        let uri = vscode.Uri.parse("file:" + navPath);

        vscode.commands.executeCommand("vscode.openFolder", uri, false);
    }
};

var navigate = function(state) {
    console.log(this.name + ": Starting navigate");
    
    let root = state.get("rootPath");
    let start = vscode.workspace.rootPath === undefined ? ( root === undefined ? "" : root ) : vscode.workspace.rootPath;

    let bookmarks = state.get("bookmarks");
    bookmarks = bookmarks === undefined ? [] : bookmarks;
    let names = [];
    bookmarks.forEach(function(bookmark) {
        names.push(bookmark.name);
    }, this);

    // Does a navigate using the current navPath if available
    query_path.navigate(start, names, open.bind(null, state));
};

var load_fuzzy = function(state) {
    console.log(this.name + ": Indexing the workspace folder");

    return new Promise(
        (fulfill, reject) => {
            let root = state.get("rootPath");
            let workspace = state.get("workspace");
            let start = undefined;

            // If we don't have a workspace (no folder open), we'll try for the root
            if(vscode.workspace.rootPath === undefined) {
                if(root != undefined) {
                    start = root;
                }
            }
            // If we do have a workspace open, check if we have already loaded it
            else {
                if(workspace != vscode.workspace.rootPath) {
                    workspace = vscode.workspace.rootPath;
                    state.update("workspace", workspace);
                }
                // If we have already loaded it, return early
                else {
                    let dirList = state.get("dirList");
                    if(dirList.length != 0) {
                        fulfill();
                        return;
                    }
                }
                
                start = workspace;
            }

            if(start != undefined) {
                vscode.window.setStatusBarMessage("Getting Fuzzy Find ready...", TIMEOUT);

                query_path.fuzzy_load(start, 
                (dirList) => {
                    state.update("dirList", dirList);

                    vscode.window.setStatusBarMessage("Fuzzy Find is ready", TIMEOUT);
                    fulfill();
                });
            }
            else
                reject();
        });
};

var fuzzy_find = function(state) {
    console.log(this.name + ": Starting up Fuzzy Find");

    load_fuzzy(state).then(
        () => {
            let root = state.get("rootPath");
            let start = vscode.workspace.rootPath === undefined ? ( root === undefined ? "" : root ) : vscode.workspace.rootPath;
            let workspace = state.get("workspace");
            let dirList = workspace === vscode.workspace.rootPath ? state.get("dirList") : [];

            vscode.window.showQuickPick(dirList)
            .then(
                val => {
                    open(state, path.join(start, val));
                });
        },
        () => {
            vscode.window.showErrorMessage("No open folder or root folder");
        }
    );
};

function set(state, navPath) {
    if(navPath === undefined)
        return;

    console.log(this.name + ": Committing " + navPath + " to state");

    // Save navPath into the config
    state.update("rootPath", navPath);
};

var set_root = function(state) {
    console.log(this.name + ": Starting up navigation for set root");

    let root = state.get("rootPath");
    let start = vscode.workspace.rootPath === undefined ? ( root === undefined ? "" : root ) : vscode.workspace.rootPath;

    let bookmarks = state.get("bookmarks");
    bookmarks = bookmarks === undefined ? [] : bookmarks;
    let names = [];
    bookmarks.forEach(function(bookmark) {
        names.push(bookmark.name);
    }, this);

    // Does a.navigate using the current navPath if available
    query_path.navigate(start, names, set.bind(null, state));
};

function add(state, name, fPath) {
    if(name === undefined || fPath === undefined)
        return;

    console.log(this.name + ": Committing bookmark to state");

    // Registers a name to a navPath
    var bookmarks = state.get("bookmarks");
    bookmarks = bookmarks === undefined ? [] : bookmarks;
    const bookmarkTag = "Bookmark: ";
    name = bookmarkTag.concat(name);
    var entry = {name, fPath};

    // Check for duplicates
    var found = false;
    bookmarks.forEach(function(element) {
        if(element.name === name) 
            found = true;
    }, this);

    if(!found)
        bookmarks.push(entry);

    state.update("bookmarks", bookmarks);

    vscode.window.setStatusBarMessage("Added " + name + " => " + fPath, TIMEOUT);
};

var nav_path = function(state, name) {
    if(name === undefined)
        return;

    console.log(this.name + ": Navigation for bookmark adding");

    let root = state.get("rootPath");
    let start = vscode.workspace.rootPath === undefined ? ( root === undefined ? "" : root ) : vscode.workspace.rootPath;

    // Does a.navigate using the current navPath if available
    query_path.navigate(start, [], add.bind(null, state, name));
};

var query_name = function() {
    console.log(this.name + ": Query for a bookmark name");

    return vscode.window.showInputBox({prompt: "Enter a name"});
};

var add_bookmark = function(state) {
    console.log(this.name + ": Starting up navigation for adding bookmark");

    query_name()
    .then(
        val => { 
            nav_path(state, val);
        }
    );
 };

function del(state, name) {
    if(name === undefined)
        return;

    console.log(this.name + ": Committing deletion of bookmark to state");

    var bookmarks = state.get("bookmarks");
    var out = [];

    bookmarks.forEach(function(element) {
        if(name != element.name)
            out.push(element);
    }, this);

    state.update("bookmarks", out);

    vscode.window.setStatusBarMessage("Removed " + name, TIMEOUT);
}; 

var del_bookmark = function(state) {
    console.log(this.name + ": Starting up delete bookmark listing");

    var bookmarks = state.get("bookmarks");
    if(bookmarks === undefined) {
        vscode.window.setStatusBarMessage("No bookmarks", TIMEOUT);
        return;
    }

    var names = [];
    bookmarks.forEach(function(element) {
        names.push(element.name);
    }, this);

    vscode.window.showQuickPick(names)
    .then(
        val => {
            del(state, val);
        }
    );
};

var clr_bookmarks = function(state) {
    console.log(this.name + ": Clearing all bookmarks");

    // Doesn't matter what bookmarks there are, we'll just replace with empty
    state.update("bookmarks", []);

    vscode.window.setStatusBarMessage("Removed all Bookmarks", TIMEOUT);
};

function initialize(state) {
    console.log(this.name + ": Initializing workspace by loading fuzzy");

    // Attempts to load the current workspace folder
    load_fuzzy(state);
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
    () => { navigate(state) } );
    var fuzCommand = vscode.commands.registerCommand("extension.fuzzyFind",
    () => { fuzzy_find(state) } );
    var setCommand = vscode.commands.registerCommand("extension.setRoot",
    () => { set_root(state) } );
    var addCommand = vscode.commands.registerCommand("extension.addBookmark", 
    () => { add_bookmark(state) } );
    var delCommand = vscode.commands.registerCommand("extension.removeBookmark",
    () => { del_bookmark(state) } );
    var clrCommand = vscode.commands.registerCommand("extension.clearBookmarks",
    () => { clr_bookmarks(state) } );

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