// Includes
var vscode = require("vscode");
var fs = require("fs");
var path = require("path");
var query_path = require("./query_path.js");
var globals = require("./globals.js");

function resolve_bookmark(state, navPath) {
    console.log(this.name + ": Checking if this is bookmark");

    let bookmarks = state.get(globals.TAG_BOOKMARKS);
    bookmarks = bookmarks === undefined ? [] : bookmarks;

    let bookmark = bookmarks.find(function(bookmark)
    { 
       return bookmark.name === navPath;
    });

    if(bookmark != undefined)
        navPath = bookmark.fPath;

    return navPath;
};

function resolve_mrulist(state, navPath) {
    console.log(this.name + ": Checking if this is in MRU");

    let mruList = state.get(globals.TAG_MRULIST);
    mruList = mruList === undefined ? [] : mruList;

    let mru = mruList.find(function(mru)
    {
        return mru === navPath;
    });

    if(mru != undefined)
        navPath = mru.replace(globals.STR_MRULIST, "");

    return navPath;
};

function update_mrulist(state) {
    console.log(this.name + ": Folder change, updating MRU");

    if(vscode.workspace.rootPath != undefined) {
        let mruList = state.get(globals.TAG_MRULIST);
        mruList = mruList === undefined ? [] : mruList;

        if(mruList.length > globals.MRU_MAX)
            mruList.shift();

        var mru = globals.STR_MRULIST + vscode.workspace.rootPath;

        if(mruList.includes(mru))
            mruList.splice(mruList.indexOf(mru), 1);

        mruList = [mru].concat(mruList);

        state.update(globals.TAG_MRULIST, mruList);
    }
};

function open_file(state, navPath) {
    console.log(this.name + ": Opening file " + navPath);

    vscode.workspace.openTextDocument(navPath)
    .then(
        function(doc) {
            vscode.window.showTextDocument(doc);
        });
};

function open_folder(state, navPath) {
    console.log(this.name + ": Opening folder " + navPath);

    update_mrulist(state);

    let uri = vscode.Uri.parse("file:" + navPath);

    vscode.commands.executeCommand("vscode.openFolder", uri, false);
};

function open(state, navPath) {
    console.log(this.name + ": Opening " + navPath);

    navPath = resolve_bookmark(state, navPath);

    navPath = resolve_mrulist(state, navPath);

    if(navPath === undefined)
        return;
    let stat = fs.lstatSync(navPath);
    if(stat.isFile()) {
        open_file(state, navPath);
    }
    else if(stat.isDirectory()) {
        open_folder(state, navPath);
    }
};

var navigate = function(state) {
    console.log(this.name + ": Starting navigate");
    
    let root = state.get(globals.TAG_ROOTPATH);
    let start = vscode.workspace.rootPath === undefined ? ( root === undefined ? "" : root ) : vscode.workspace.rootPath;
    let names = [];

    let bookmarks = state.get(globals.TAG_BOOKMARKS);
    bookmarks = bookmarks === undefined ? [] : bookmarks;
    bookmarks.forEach(function(bookmark) {
        names.push(bookmark.name);
    }, this);

    let mruList = state.get(globals.TAG_MRULIST);
    mruList = mruList === undefined ? [] : mruList;
    mruList.forEach(function(mru) {
        names.push(mru);
    }, this);

    // Does a navigate using the current navPath if available
    query_path.navigate(start, names, open.bind(null, state));
};

var on_loading_fuzzy = function() {
    console.log(this.name + ": Before we start loading fuzzy");

    vscode.window.setStatusBarMessage("Getting Fuzzy Find ready...", globals.TIMEOUT);
};

var on_fuzzy_loaded = function(fulfill) {
    console.log(this.name + ": After we finish loading fuzzy");

    vscode.window.setStatusBarMessage("Fuzzy Find is ready", globals.TIMEOUT);

    if(fulfill != undefined)
        fulfill();
};

var depthCompare = function(left, right) {
    var count = (str) => { return (str.match(/path.sep/g) || []).length };

    return count(left) - count(right);
};

var load_fuzzy = function(state) {
    console.log(this.name + ": Indexing the workspace folder");

    on_loading_fuzzy();

    return new Promise(
        (fulfill, reject) => {
            let root = state.get(globals.TAG_ROOTPATH);
            let workspace = state.get(globals.TAG_WORKSPACE);
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
                    state.update(globals.TAG_WORKSPACE, workspace);
                }
                // If we have already loaded it, return early
                else {
                    let dirList = state.get(globals.TAG_DIRLIST);
                    if(dirList.length != 0) {
                        on_fuzzy_loaded(fulfill);
                        return;
                    }
                }
                
                start = workspace;
            }

            if(start != undefined) {
                query_path.fuzzy_load(start, 
                (dirList) => {
                    dirList.sort(depthCompare);
                    state.update(globals.TAG_DIRLIST, dirList);

                    on_fuzzy_loaded(fulfill);
                });
            }
            else
                reject();
        });
};

var add_fuzzy = function(state, navPath) {
    console.log(this.name + ": A file has been added, updating fuzzy");

    if(navPath != undefined) {
        let dirList = state.get(globals.TAG_DIRLIST);
        let workspace = state.get(globals.TAG_WORKSPACE);

        navPath.replace(path.join(workspace, path.sep), "");

        dirList.push(navPath);

        dirList.sort(depthCompare);
        state.update(globals.TAG_DIRLIST, dirList);

        on_fuzzy_loaded();
    }
};

var del_fuzzy = function(state, navPath) {
    console.log(this.name + ": File is removed, updating fuzzy");

    if(navPath != undefined) {
        let dirList = state.get(globals.TAG_DIRLIST);
        let workspace = state.get(globals.TAG_WORKSPACE);

        navPath.replace(path.join(workspace, path.sep), "");

        var newList = [];

        dirList.forEach(function(entry) {
            if(!entry.includes(navPath))
                newList.push(entry);
        }, this);

        state.update(globals.TAG_DIRLIST, newList);
    }
};

var fuzzy_find = function(state) {
    console.log(this.name + ": Starting up Fuzzy Find");

    return load_fuzzy(state).then(
        () => {
            let root = state.get(globals.TAG_ROOTPATH);
            let start = vscode.workspace.rootPath === undefined ? ( root === undefined ? "" : root ) : vscode.workspace.rootPath;
            let workspace = state.get(globals.TAG_WORKSPACE);
            let dirList = workspace === vscode.workspace.rootPath ? state.get(globals.TAG_DIRLIST) : [];

            vscode.window.showQuickPick(dirList)
            .then(
                val => {
                    if(val === undefined)
                        return;

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
    state.update(globals.TAG_ROOTPATH, navPath);
};

var set_root = function(state) {
    console.log(this.name + ": Starting up navigation for set root");

    let root = state.get(globals.TAG_ROOTPATH);
    let start = vscode.workspace.rootPath === undefined ? ( root === undefined ? "" : root ) : vscode.workspace.rootPath;

    let bookmarks = state.get(globals.TAG_BOOKMARKS);
    bookmarks = bookmarks === undefined ? [] : bookmarks;
    let names = [];
    bookmarks.forEach(function(bookmark) {
        names.push(bookmark.name);
    }, this);

    // Does a.navigate using the current navPath if available
    query_path.navigate(start, names, set.bind(null, state));
};

exports.load_fuzzy = load_fuzzy;
exports.add_fuzzy = add_fuzzy;
exports.del_fuzzy = del_fuzzy;
exports.fuzzy_find = fuzzy_find;
exports.navigate = navigate;
exports.set_root = set_root;