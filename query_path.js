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
    console.log(this.name + ": Listing drives");

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
    console.log(this.name + ": Setting up Quick Pick options");

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
    console.log(this.name + ": Reading and handling input from Quick Pick");

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
    let pathTry = path.join(pathCurr, result);

    var isFile = undefined;
    try {
        isFile = fs.lstatSync(pathTry).isFile();
    } catch (error) {
       isFile = false;
       pathTry = pathCurr;

        vscode.showErrorMessage("No permission to access this");
    }

    if(isFile === true) {
        callback(pathTry);
        return undefined;
    }

    return pathTry;
};

function navigate_recursive(pathPrev, result, bookmarks, callback) {
    console.log(this.name + ": Recursively navigate to next folder");

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
    console.log(this.name + ": Entry point for recursive navigation");

    navigate_recursive(startPath, "", bookmarks, callback);
};

exports.navigate = navigate;

function build_dir_list_recursive(node, startPath) {
    console.log(this.name + ": Recursively building directory list");

    let dirList = [];

    if(node.children == undefined || node.children.length <= 0) {
        return dirList;
    }

    // Add all the children's children
    node.children.forEach(function(subNode) {
        dirList = [subNode.path.replace(startPath, "")].concat(dirList);

        dirList = dirList.concat(build_dir_list_recursive(subNode, startPath));
    }, this);

    return dirList;
}

function build_dir_list(startPath, dirList) {
    console.log(this.name + ": Entry point for recursive directory listing");

    if(dirList.length != 0) {
        return dirList;
    }

    let tree = directorytree(startPath);
    startPath = path.join(startPath, path.sep);
    dirList = build_dir_list_recursive(tree, startPath);

    return dirList;
};

function fuzzy_load(startPath, callback) {
    console.log(this.name + ": Building directory listing for fuzzy");

    let dirList = build_dir_list(startPath, []);

    callback(dirList);
};

exports.fuzzy_load = fuzzy_load;