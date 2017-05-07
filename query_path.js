// Modules to be imported
var vscode = require("vscode");
var path = require("path");
var fs = require("fs");
var drivelist = require("drivelist");
var clone = require("clone");

var commands = [
    "> ..",
    "> Select"
];

function list_drives(callback) {
    var dirList = [];
    drivelist.list(
        (error, drives) => {
            drives.forEach(function(drive) {
                dirList.push(drive.mountpoints[0].path);
            }, this);

            // Set the path and commands to signal change in drive 
            var pathCurr = undefined; 
            quick_pick(pathCurr, dirList, [], callback);
        }
    );
};

function quick_pick(pathCurr, dirList, options, callback) {
    // Add in commands for navigation
    dirList = options.concat(dirList);

    // Returns the result of a recursive query to quickpick
    vscode.window.showQuickPick(dirList)
    .then(
        val => {
            // As a special case, check if the path is undefined
            if(pathCurr == undefined) {
                // Check if this is attempting to do something with an invalid path
                if(options.indexOf(val) >= 0) {
                    list_drives(callback);
                }
                // If the previous path is invalid, we will assume the selection is valid
                else {
                    pathCurr = path.join(val, path.sep);
                    val = "";
                }
            }

            navigate_recursive(pathCurr, val, callback)
        }
    );
};

// Handles the result of the quickpick
// Throws out 3 possible results:
// The directory to list next
// An empty string (indicating no directory)
// Undefined (indicating either invalid or handled input)
function option_handler(pathCurr, result, callback) {
    // Handling special cases
    switch(result) {
        case undefined: 
            callback(undefined);
            return undefined;
        case "> ..": {
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
        case "> Select": {
            callback(pathCurr);
            return undefined;
        }
    }
    // If nothing happens from the special cases, means we are moving into a new dir

    // Joins the path with the quick pick
    pathCurr = path.join(pathCurr, result);

    if(fs.lstatSync(pathCurr).isFile()) {
        callback(pathCurr);
        return undefined;
    }

    return pathCurr;
};

function navigate_recursive(pathPrev, result, callback) {
    // Resolves the previous path into a real path
    pathPrev = path.resolve(pathPrev);

    // Clones the previous path to use for this iteration
    var pathCurr = clone(pathPrev);

    pathCurr = option_handler(pathCurr, result, callback);

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
        
        quick_pick(pathCurr, dirList, commands, callback);
    }
    else {
        list_drives(callback);
    }
};

function navigate(startPath, callback) {
    navigate_recursive(startPath, "", callback);
};

exports.navigate = navigate;

function fuzzy_query_recursive(pathPrev, result, callback) {
    // Resolves the previous path into a real path
    pathPrev = path.resolve(pathPrev);

    // Clones the previous path to use for this iteration
    var pathCurr = clone(pathPrev);

    if(option_handler(pathCurr, result, callback))
        return;
};

function fuzzy_query(startPath, callback) {
    fuzzy_query_recursive(startPath, "", callback);
};

exports.query = fuzzy_query;
