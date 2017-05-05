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

            // Set the uri and commands to signal change in drive 
            var uri = undefined; 
            quick_pick(uri, dirList, [], callback);
        }
    );
}

function quick_pick(uri, dirList, options, callback) {
    // Add in commands for navigation
    dirList = options.concat(dirList);

    // Returns the result of a recursive query to quickpick
    vscode.window.showQuickPick(dirList)
    .then(
        val => {
            if(uri == undefined) {
                if(options.indexOf(val) >= 0) {
                    list_drives(callback);
                }
                else {
                    uri = path.join(val, path.sep);
                    val = "";
                }
            }

            navigate_recursive(uri, val, callback)
        }
    )
}

function navigate_recursive(uriPrev, result, callback) {
    // Resolves the previous URI into a real path
    uriPrev = path.resolve(uriPrev);

    // Clones the previous URI to use for this iteration
    var uri = clone(uriPrev);

    // Handling special cases
    switch(result) {
        case undefined: 
            callback(undefined);
            return;
        case "> ..": {
            result = "";
            var splitUri = uri.split(path.sep);
            splitUri = splitUri.filter(Boolean);
            uri = "";
            
            if(splitUri.length > 0) {
                splitUri.pop();
                splitUri.forEach(function(part) {
                    uri = path.join(uri, part, path.sep);
                }, this);
            }
            break;
        }
        case "> Select": {
            callback(uri);
            return;
        }
    }

    // If not a file, attempt to read the directory
    var dirList = [];

    if(uri.length != 0) {
        // Joins the uri with the quick pick
        uri = path.join(uri, result);

        if(fs.lstatSync(uri).isFile())
            callback(uri);

        try {
            dirList = fs.readdirSync(uri);
        } catch (error) {
        }

        if(dirList.length === 0) {
            uri = uriPrev;
            dirList = fs.readdirSync(uri);
        }
        
        quick_pick(uri, dirList, commands, callback);
    }
    else {
        list_drives(callback);
    }
};

function navigate(start_uri, callback) {
    // Returns a promise that resolves to the result of a recursive query
    navigate_recursive(start_uri, "", callback);
};

exports.navigate = navigate;