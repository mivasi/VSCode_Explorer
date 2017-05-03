// Modules to be imported
var vscode = require("vscode");
var path = require("path");
var fs = require("fs");
var drivelist = require("drivelist");
var clone = require("clone");

function quick_pick(uri, dirList) {
    // Add in options for navigation
    var options = ["Back", "Select"];
    dirList = options.concat(dirList);

    // Returns the result of a recursive query to quickpick
    return vscode.window.showQuickPick(dirList)
    .then(
        val => {
            if(uri == undefined) {
                uri = val; 
                val = "";
            }

            return query_recursive(uri, val)
        }
    )
}

function query_recursive(uriPrev, result) {
    // Resolves the previous URI into a real path
    uriPrev = fs.realpathSync(uriPrev);

    // Clones the previous URI to use for this iteration
    var uri = clone(uriPrev);

    // Handling special cases
    switch(result) {
        case undefined: 
            return;
        case "Back": {
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
        case "Search": {
            return query_fuzzy(uri);
        }
        case "Select": {
            return uri;
        }
    }

    // If not a file, attempt to read the directory
    var dirList = [];

    if(uri.length != 0) {
        // Joins the uri with the quick pick
        uri = path.join(uri, result);

        if(fs.lstatSync(uri).isFile())
            return uri;

        try {
            dirList = fs.readdirSync(uri);
        } catch (error) {
        }

        if(dirList.length === 0) {
            uri = uriPrev;
            dirList = fs.readdirSync(uri);
        }
        
        return quick_pick(uri, dirList);
    }
    else {
        // Here we have a callback that creates a second thread
        // This causes the quick_pick to diverge
        // One of them will return with a garbage value
        // The other will continue to run
        // However, because the first one returned
        // The command's lifespan has ended
        drivelist.list(
            (error, drives) => {
                drives.forEach(function(drive) {
                    dirList.push(drive.mountpoints[0].path);
                }, this);
                
                return quick_pick(uri, dirList);
            }
        );
        return quick_pick(uri, dirList);
    }
};

function query(start_uri) {
    // Returns a promise that resolves to the result of a recursive query
    return Promise.resolve(
        query_recursive(start_uri, "")
            .then(
                uri => { return uri }
            )
        );
};

exports.query = query;