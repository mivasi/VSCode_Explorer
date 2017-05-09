// The module "vscode" contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
var vscode = require("vscode");
var fs = require("fs");
var query_path = require("./query_path.js");

function open(path) {
    if(path === undefined)
        return;

    if(fs.lstatSync(path).isFile()) {
        vscode.workspace.openTextDocument(path)
        .then(
            function(doc) {
                vscode.window.showTextDocument(doc);
            }
        );
    }
    else if(fs.lstatSync(path).isDirectory()) {
        let uri = vscode.Uri.parse(path);

        vscode.commands.executeCommand("vscode.openFolder", uri, false);
    }
};

var navigate = function(state) {
    let start = state.get("rootPath");
    start = start === undefined ? "" : start;

    // Does a.navigate using the current path if available
    query_path.navigate(start, open);
};

function set(state, path) {
    // Save path into the config
    state.update("rootPath", path);
};

var set_root = function(state) {
    let start = state.get("rootPath");
    start = start === undefined ? "" : start;

    // Does a.navigate using the current path if available
    query_path.navigate(start, set.bind(null, state));
};

function add(state, name, path) {
    // Registers a name to a path
    var list = state.get("regPath");
    list = list === undefined ? [] : list;
    var entry = {name, path};

    // Check for duplicates
    var found = false;
    list.forEach(function(element) {
        if(element.name === name) 
            found = true;
    }, this);

    if(!found)
        list.push(entry);

    state.update("regPath", list);
};

var nav_path = function(state, name) {
   let start = state.get("rootPath");
    start = start === undefined ? "" : start;
    
    // Does a.navigate using the current path if available
    query_path.navigate(start, add.bind(null, state, name));
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
    var list = state.get("regPath");
    var out = [];

    list.forEach(function(element) {
        if(name != element.name)
            out.push(element);
    }, this);

    state.update("regPath", out);
}; 

var del_bookmark = function(state) {
    var list = state.get("regPath");
    if(list === undefined) {
        vscode.window.showInformationMessage("No registered paths");
        return;
    }

    var names = [];
    list.forEach(function(element) {
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
    console.log("FuzzyCode is now available in VS Code");

    var state = context.globalState;

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    var navCommand = vscode.commands.registerCommand("extension.navigate", 
    () => { navigate(state) } );
    var setCommand = vscode.commands.registerCommand("extension.setRoot",
    () => { set_root(state) } );
    var addCommand = vscode.commands.registerCommand("extension.addBookmark", 
    () => { add_bookmark(state) } );
    var delCommand = vscode.commands.registerCommand("extension.removeBookmark",
    () => { del_bookmark(state) } );

    // Add to a list of disposables that die when the extension deactivates
    context.subscriptions.push(navCommand);
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