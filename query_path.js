// Modules to be imported
var vscode = require("vscode");
var path = require("path");
var fs = require("fs");
var drivelist = require("drivelist");
var directorytree = require("directory-tree");
var clone = require("clone");

var commands = [
    ">..",
    ">Select",
];

function list_drives(callback, bookmarks) {
    var dirList = [];
    drivelist.list(
        (error, drives) => {
            drives.forEach(function(drive) {
                dirList.push(drive.mountpoints[0].path);
            }, this);

            // Set the path and commands to signal change in drive 
            var pathCurr = undefined; 
            quick_pick(pathCurr, dirList, [], bookmarks, callback);
        }
    );
};

function quick_pick(pathCurr, dirList, options, bookmarks, callback) {
    // Add in commands for navigation
    options = options.concat(bookmarks);
    dirList = options.concat(dirList);

    // Returns the result of a recursive query to quickpick
    vscode.window.showQuickPick(dirList)
    .then(
        val => {
            // As a special case, check if the path is undefined
            if(pathCurr == undefined) {
                // Check if this is attempting to do something with an invalid path
                if(options.indexOf(val) >= 0) {
                    list_drives(callback, bookmarks);
                }
                // If the previous path is invalid, we will assume the selection is valid
                else {
                    pathCurr = path.join(val, path.sep);
                    val = "";
                }
            }

            navigate_recursive(pathCurr, val, bookmarks, callback)
        }
    );
};

// Handles the result of the quickpick
// Throws out 3 possible results:
// The directory to list next
// An empty string (indicating no directory)
// Undefined (indicating either invalid or handled input)
function option_handler(pathCurr, result, bookmarks, callback) {
    // Handling special cases
    switch(result) {
        case undefined: 
            callback(undefined);
            return undefined;
        case commands[0]: {
            var splitPath = pathCurr.split(path.sep);
            splitPath = splitPath.filter(Boolean);
 
            result = "";
            pathCurr = "";

            if(splitPath.length > 0) {
                splitPath.pop();
                splitPath.forEach(function(part) {
                    pathCurr = path.join(pathCurr, part, path.sep);
                }, this);
            }
            return pathCurr;
        }
        case commands[1]: {
            callback(pathCurr);
            return undefined;
        }
    }
    // If nothing happens from the special cases, means we are moving into a new dir

    // Checks if this is a bookmark
    if(bookmarks.includes(result)) {
        callback(result);
        return undefined;
    }

    // Joins the path with the quick pick
    pathCurr = path.join(pathCurr, result);

    if(fs.lstatSync(pathCurr).isFile()) {
        callback(pathCurr);
        return undefined;
    }

    return pathCurr;
};

function navigate_recursive(pathPrev, result, bookmarks, callback) {
    // Resolves the previous path into a real path
    pathPrev = path.resolve(pathPrev);

    // Clones the previous path to use for this iteration
    var pathCurr = clone(pathPrev);

    pathCurr = option_handler(pathCurr, result, bookmarks, callback);

    if(pathCurr === undefined)
        return;

    // If not a file, attempt to read the directory
    var dirList = [];

    if(pathCurr.length != 0) {
        try {
            dirList = fs.readdirSync(pathCurr);
        } catch (error) {
        }

        if(dirList.length === 0) {
            pathCurr = pathPrev;
            dirList = fs.readdirSync(pathCurr);
        }
        
        quick_pick(pathCurr, dirList, commands, bookmarks, callback);
    }
    else {
        list_drives(callback, bookmarks);
    }
};

function navigate(startPath, bookmarks, callback) {
    navigate_recursive(startPath, "", bookmarks, callback);
};

exports.navigate = navigate;

function build_dir_list_recursive(node, startPath) {
    let dirList = [];

    if(node.children == undefined || node.children.length <= 0) {
        return dirList;
    }

    node.children.forEach(function(subNode) {
        dirList.push(subNode.path.replace(startPath, ""));

        dirList = dirList.concat(build_dir_list_recursive(subNode, startPath));
    }, this);

    return dirList;
}

function build_dir_list(startPath, dirList) {
    if(dirList.length != 0) {
        return dirList;
    }

    let tree = directorytree(startPath);
    dirList = build_dir_list_recursive(tree, startPath);

    return dirList;
};

function fuzzy_load(startPath, callback) {
    let dirList = build_dir_list(startPath, []);

    callback(dirList);
};

function fuzzy_find(startPath, callback) {
    // Prepares the directory list
    let dirList = build_dir_list(startPath, []);

    vscode.window.showQuickPick(dirList)
    .then(
        val => {
            callback(path.join(startPath, val));
        }
    );
    
    return dirList;
};

exports.fuzzy_find = fuzzy_find;
exports.fuzzy_load = fuzzy_load;