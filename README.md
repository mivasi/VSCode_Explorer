# VSCode File Explorer README
VSCode File Explorer adds some commands for navigating to files/folders from VSCode's Command Palette. 

## Features

Navigate: 
* Provides a few basic commands to navigate around file system and select files/folders
* Allows selecting of bookmarked files/folders

![Navigate](/images/Navigate.png)

Fuzzy Find:
* Lists files/folders in the workspace root for quick pick

![Fuzzy Find Message](/images/Fuzzy_Find_Messages.png)
![Fuzzy Find Command](/images/Fuzzy_Command.png)
![Fuzzy Find Action](/images/Fuzzy_Find.png)

Set Fuzzy Depth:
* Sets depth of indexing for faster or deeper searches

![Fuzzy Find Depth](/images/Fuzzy_Find_Depth.png)

Set Root:
* Sets the default root directory if workspace is not open

![Set Root](/images/Set_Root.png)

Bookmark:
* Add:
    * Adds a bookmark tagged to a name
* Remove: 
    * Removes a bookmark tagged to a name
* Clear:
    * Clears all bookmarks

![Bookmarks](/images/Bookmarks.png)


## Requirements

No external requirements

## Extension Settings

No extension settings

## Known Issues

* Start-up freezes if there are a massive amount of files in the workspace root

Issues or requests are welcome on [Github](https://github.com/julwrites/VSCode_FileExplorer)

## Release Notes

What's New?
* Added a new command for clearing all bookmarks
* Keybinding for Navigate and Fuzzy Find
    * Navigate: Ctrl + Alt + O
    * Fuzzy Find: Shift + Alt + O
* Fuzzy Find
    * Sorting of the Fuzzy Find list by depth
* Messages for completion of commands
    * ![Fuzzy_Find_Messages](/images/Fuzzy_Find_Messages.png)
* Bug fixes! :D
    * Fixed undefined input for bookmarks
    * Fixed Fuzzy Find indexing occuring on root when no workspace is open
* New logo! :D

## Contributing
Contributions are welcome at the [GitHub Repository](https://github.com/julwrites/VSCode_FileExplorer)

## License
This uses the [MIT License](https://github.com/julwrites/VSCode_FileExplorer/blob/master/LICENSE) 