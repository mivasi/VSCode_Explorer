// The module "vscode" contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
var vscode = require("vscode");
var fs = require("fs");
var path = require("path");
var query_path = require("./query_path.js");

function open(state, navPath) {
    if(navPath === undefined)
        return;

    let bookmarks = state.get("bookmarks");
    bookmarks = bookmarks == undefined ? [] : bookmarks;
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
    let root = state.get("rootPath");
    let start = vscode.workspace.rootPath == undefined ? ( root == undefined ? "" : root ) : vscode.workspace.rootPath;

    let bookmarks = state.get("bookmarks");
    bookmarks = bookmarks == undefined ? [] : bookmarks;
    let names = [];
    bookmarks.forEach(function(bookmark) {
        names.push(bookmark.name);
    }, this);

    // Does a navigate using the current navPath if available
    query_path.navigate(start, names, open.bind(null, state));
};

var fuzzy_find = function(state) {
    let root = state.get("rootPath");
    let start = vscode.workspace.rootPath == undefined ? ( root == undefined ? "" : root ) : vscode.workspace.rootPath;
    let workspace = state.get("workspace");
    let dirList = workspace == vscode.workspace.rootPath ? state.get("dirList") : [];

    dirList = query_path.fuzzy_find(start, dirList, open.bind(null, state));

    state.update("dirList", dirList);
};

function set(state, navPath) {
    // Save navPath into the config
    state.update("rootPath", navPath);
};

var set_root = function(state) {
    let root = state.get("rootPath");
    let start = vscode.workspace.rootPath == undefined ? ( root == undefined ? "" : root ) : vscode.workspace.rootPath;

    let bookmarks = state.get("bookmarks");
    bookmarks = bookmarks == undefined ? [] : bookmarks;
    let names = [];
    bookmarks.forEach(function(bookmark) {
        names.push(bookmark.name);
    }, this);

    // Does a.navigate using the current navPath if available
    query_path.navigate(start, names, set.bind(null, state));
};

function add(state, name, fPath) {
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
};

var nav_path = function(state, name) {
    let root = state.get("rootPath");
    let start = vscode.workspace.rootPath == undefined ? ( root == undefined ? "" : root ) : vscode.workspace.rootPath;
    
    // Does a.navigate using the current navPath if available
    query_path.navigate(start, [], add.bind(null, state, name));
};

var query_name = function() {
    return vscode.window.showInputBox({prompt: "Enter a name"});
};

var add_bookmark = function(state) {
    query_name()
    .then(
        val => { nav_path(state, val) }
    );
 };

function del(state, name) {
    var bookmarks = state.get("bookmarks");
    var out = [];

    bookmarks.forEach(function(element) {
        if(name != element.name)
            out.push(element);
    }, this);

    state.update("bookmarks", out);
}; 

var del_bookmark = function(state) {
    var bookmarks = state.get("bookmarks");
    if(bookmarks === undefined) {
        vscode.window.showInformationMessage("No bookmarks");
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

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log("File Explorer is now available in VS Code");

    var state = context.globalState;

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

    // Add to a list of disposables that die when the extension deactivates
    context.subscriptions.push(navCommand);
    context.subscriptions.push(fuzCommand);
    context.subscriptions.push(setCommand);
    context.subscriptions.push(addCommand);
    context.subscriptions.push(delCommand);
    context.subscriptions.push(state);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
}

exports.deactivate = deactivate;