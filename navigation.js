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

        if(mruList.length >= globals.MRU_MAX)
            mruList.pop();

        var mru = globals.STR_MRULIST + vscode.workspace.rootPath;

        if(mruList.includes(mru))
            mruList.splice(mruList.indexOf(mru), 1);

        mruList = [mru].concat(mruList);

        state.update(globals.TAG_MRULIST, mruList);
    }
};

function dead_path(state, navPath) {
    console.log(this.name + ": Found a dead path, removing from logs");

    // Remove this dead link from bookmarks
    let bookmarks = state.get(globals.TAG_BOOKMARKS);

    if(bookmarks != undefined) {
        let bookmark = bookmarks.find(function(bookmark)
        { 
        return bookmark.name === navPath;
        });

        if(bookmark != undefined)
            bookmarks._del_bookmark(state, bookmark.name);
    }

    // Remove this dead link from MRU
    let mruList = state.get(globals.TAG_MRULIST);

    if(mruList != undefined) {
        var mru = globals.STR_MRULIST + navPath;

        if(mruList.includes(mru))
            mruList.splice(mruList.indexOf(mru), 1);

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

    let stat = undefined;
    try {
        stat = fs.lstatSync(navPath);
    } catch (error) {
        dead_path(state, navPath);
        return;
    }

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

var depthCompare = function(left, right) {
    var count = (str) => { 
        return (str.split(path.sep)).length;
    };

    return count(left) - count(right);
};

var set_depth = function(state) {
    console.log(this.name + ": Setting depth");

    vscode.window.showInputBox({prompt: "How deep would you like me to search?"}).then(
        (val) => {
            if(!isNaN(val))
            {
                let intVal = parseInt(val, 10);

                vscode.window.setStatusBarMessage("Setting Fuzzy Find depth to " + intVal, globals.TIMEOUT);

                state.update(globals.TAG_DEPTHLIMIT, intVal);
                state.update(globals.TAG_FUZZYDIRTY, true);
            }
        });
};

var load_fuzzy = function(state) {
    console.log(this.name + ": Indexing the workspace folder");

    return new Promise(
        (fulfill, reject) => {
            let workspace = state.get(globals.TAG_WORKSPACE);
            let dirty = state.get(globals.TAG_FUZZYDIRTY);
            let start = undefined;

            // If we don't have a workspace (no folder open) don't load anything
            if(vscode.workspace.rootPath != undefined) {
                if(dirty) {
                    workspace = vscode.workspace.rootPath;
                    state.update(globals.TAG_WORKSPACE, workspace);
                    state.update(globals.TAG_DIRLIST, []);

                    vscode.window.setStatusBarMessage("Loading Fuzzy Find... Please wait...", globals.TIMEOUT);
                }
                // If we have already loaded it, return early
                else {
                    let dirList = state.get(globals.TAG_DIRLIST);
                    if(dirList.length != 0) {
                        fulfill();
                        return;
                    }
                    else {
                        // No op if the directory list is empty, means still loading
                        return;
                    }
                }

                start = workspace;
            }

            if(start != undefined) {
                try {
                    console.log(this.name + ": Actual Fuzzy Load call");
                    let limit = state.get(globals.TAG_DEPTHLIMIT);

                    return query_path.fuzzy_load(start, limit).then( 
                    (dirList) => {
                        dirList.sort(depthCompare);
                        state.update(globals.TAG_DIRLIST, dirList);
                        fulfill();
                    },
                    () => {
                    });
                } catch (error) {
                    reject();
                }
            }
            else
                reject();
        });
};

var fuzzy_loaded = function(state) {
    console.log(this.name + ": Resolving post-load things");

    vscode.window.setStatusBarMessage("Fuzzy Find is ready", globals.TIMEOUT);

    state.update(globals.TAG_FUZZYDIRTY, false);
};

var fuzzy_failed = function(state) {
    console.log(this.name + ": Fuzzy load failed");

    vscode.window.showErrorMessage("Could not index folder");
};

var add_fuzzy = function(state, navPath) {
    console.log(this.name + ": Updating fuzzy with addition of " + navPath);

    if(navPath != undefined) {
        let dirList = state.get(globals.TAG_DIRLIST);
        let workspace = path.join(state.get(globals.TAG_WORKSPACE), path.sep);
        let limit = state.get(globals.TAG_DEPTHLIMIT);

        limit = limit - navPath.replace(workspace, "").split(path.sep).length;

        query_path.fuzzy_load(navPath, limit).then(
        (subList) => {
            navPath = navPath.replace(workspace, "");
            let addList = [navPath];

            subList.forEach(function(entry) {
                addList.push(path.join(navPath, entry));
            }, this);
            dirList = dirList.concat(addList);

            dirList.sort(depthCompare);
            state.update(globals.TAG_DIRLIST, dirList);

            fuzzy_loaded(state);
        },
        fuzzy_failed
        );
    }
};

var del_fuzzy = function(state, navPath) {
    console.log(this.name + ": Updating fuzzy with removal of " + navPath);

    if(navPath != undefined) {
        let dirList = state.get(globals.TAG_DIRLIST);
        let workspace = state.get(globals.TAG_WORKSPACE);

        navPath = navPath.replace(path.join(workspace, path.sep), "");

        var delList = [];

        dirList.forEach(function(entry) {
            if(entry.includes(navPath))
                delList.push(dirList.indexOf(entry));
        }, this);

        delList.sort(function(a, b) { return b < a; });

        delList.forEach(function(index) {
            console.log(this.name + ": Removing " + index);
            dirList.splice(index, 1);
        }, this);

        state.update(globals.TAG_DIRLIST, dirList);
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

            fuzzy_loaded(state);

            vscode.window.showQuickPick(dirList)
            .then(
                val => {
                    if(val === undefined)
                        return;

                    open(state, path.join(start, val));
                });
        },
        fuzzy_failed
    );
};

function set(state, navPath) {
    if(navPath === undefined)
        return;

    console.log(this.name + ": Committing " + navPath + " to state");

    // Save navPath into the config
    state.update(globals.TAG_ROOTPATH, navPath);

    vscode.window.setStatusBarMessage("Setting root path to " + navPath, globals.TIMEOUT);
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

exports.set_depth = set_depth;
exports.load_fuzzy = load_fuzzy;
exports.add_fuzzy = add_fuzzy;
exports.del_fuzzy = del_fuzzy;
exports.fuzzy_find = fuzzy_find;
exports.navigate = navigate;
exports.set_root = set_root;