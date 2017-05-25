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

* Fuzzy Find list is not sorted well
* Start-up freezes if there are a massive amount of files in the workspace root

Issues or requests are welcome on [Github](https://github.com/julwrites/VSCode_FileExplorer)

## Release Notes

What's New?
* Added a new command for clearing all bookmarks
* Keybinding for Navigate and Fuzzy Find
    * Navigate: Ctrl + Alt + O
    * Fuzzy Find: Shift + Alt + O
* Front loading of Fuzzy Find's indexing for a quicker Fuzzy Find access
* Messages for completion of commands
    * ![Fuzzy_Find_Messages](/images/Fuzzy_Find_Messages.png)
* New logo! :D

## Contributing
Contributions are welcome at the [GitHub Repository](https://github.com/julwrites/VSCode_FileExplorer)

## License
This uses the [MIT License](https://github.com/julwrites/VSCode_FileExplorer/blob/master/LICENSE) 