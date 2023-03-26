# obsidian-templater-scripts
A collection of scripts designed for usage with the Obsidian Templater Plugin

## scripts
- `FormatOrdinal` - Adds the correct number suffix: st, nd, rd, th
- [`ItemSelector`](item-selector/ItemSelector%20-%20Documentation.md) - An interface to select multipe items from a list

## Installation
1. Download the latest release TemplaterJS.zip file
2. Extract the `TemplaterJS` folder into your valut, probably near where you store your templates themselves
3. Open `Settings > Templater` and set the folder path for `Script files folder location` to be the extracted `TemplaterJS` folder
4. call the function with `tp.user.functionName()`, `new tp.user.ClassName()` or `new tp.user.ItemSelector.select(params)`
