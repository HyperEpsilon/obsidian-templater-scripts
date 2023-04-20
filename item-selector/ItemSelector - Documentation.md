---
tags: 2023/03-Mar
alias: "ItemSelector"
---
**Current Version:** 0.4  
**Last Updated:** 2023-04-20  

## Usage
`tp.user.ItemSelector.select(listDisp: string[], listData: string[] = listDisp, limit Number = Number.MAX_SAFE_INTEGER, options: Object = {})`

### Arguments
- `listDisp`: A list of strings that will be displayed for each item in the suggested prompt
- `listData`: A list of objects that will be selected from. Must be the same length as `listDisp`. Nested lists are supported.
- `limit`: The maximum number of items that will be selected. Does not enforce a minimum
- `options`: A single object (dict) that contains all customization parameters (defined below)

## Accessing Results
Once the selector has been run, you can access the following lists in the form `result.RESULT_LIST` or `result['RESULT_LIST']`

- `selectedDisp`: The list of all items selected from `listDisp`.
- `selectedData`: The list of all items selected from `listData`.
- `unselectedDisp`: The list of all unselected items from `listDisp`.
- `unselectedData`: The list of all unselected items from `listData`.
- `originalDisp`: A copy of the original `listDisp`.
- `originalData`: A copy of the original `listData`.
- `itemCountList`: A list containing the count of each item. If `askForCount` if false, each item has count 1.
- `totalItemCount`: The sum of all item counts. If `askForCount` if false, will just return the total length of the list.

## Options object
Each item in the options object is optional. Any that are omitted will use the default value. Order does not matter.

| Name              | Type   | Default          | Notes                                                                                                                                                                              |
| ----------------- | ------ | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| finishedName      | string | `"​== Done =="`  | Sets the display text for the 'finished' item                                                                                                                                      |
| showFinished      | bool   | `true`           | If true, will display an option to finalize the list selection                                                                                                                     |
| otherName         | string | `"​== Other =="` | Sets the display text for the 'other' item                                                                                                                                         |
| showOther         | bool   | `false`          | If enabled, will display an option to enter an item not on the list                                                                                                                |
| itemType          | string | `"item"`         | The item type displayed in the selector message                                                                                                                                    |
| itemTypeArticle   | string | `"the"`          | Change the article of the selector test. Default is 'the', though proper nouns are usable with an `'s`                                                                             |
| askForCount       | bool   | `false`          | If enabled, will ask for an integer number of copies for each item. If the count is blank, 1 is used. If the count is an invalid character (like a letter), the prompt is retried. |
| keepSelectedItems | bool   | `false`          | If enabled, selected items will not be removed from the list allowing mutiple selections                                                                                           |
| countOffset       | Number | `0`              | 0 based. Used to offset the iteration count, effectively starting at a higher number                                                                                               |
| countName         | string | `copies`         | Modifies the display text when asking for count, "enter the number of {countName} of ...". Can be used to enter point values or other numbers.                                     |
| countShown        | bool   | `true`           | Controls the visibility of the count (1st, 2nd, …) in selector display                                                                                                             |

### Per-Item Keys
If the items within the `listData` parameters are `Objects`, they can have specific parameters assigned to them that will modify how the Selector handles them. `data.key = value` | `data = {x: y, key: value}`

| Key              | Type   | Description                                                                         |
| ---------------- | ------ | ----------------------------------------------------------------------------------- |
| name             | string | If an object needs to have it's name displayed, it will use this name               |
| keepWhenSelected | bool   | overrides `keepSelectedItem` option when deciding to keep or remove a selected item |
| askForCount      | bool   | overrides global `askForCount` when deciding to querying item counts                |

### Usage
```js
var list_a = [1, 2, 3];
var list_b = ['a', 'b', 'c'];

// Options can be ommited entirely to use the default parameters
await tp.user.ItemSelector.select(list_a, list_b, 0)
await tp.user.ItemSelector.select(list_a, list_b, 0, {})

// This will show the 'finished' item as "NO MORE!!!"
var options = {finishedName: "NO MORE!!!"};
await tp.user.ItemSelector.select(list_a, list_b, 0, options)

// This will hide the 'finished' item and show the 'other' item as "SOMETHING DIFFERENT"
var options = {showFinished: false, showOther: true, otherName: "SOMETHING DIFFERENT"};
await tp.user.ItemSelector.select(list_a, list_b, 0, options)

// It's also possible to create the object duing the function call
await tp.user.ItemSelector.select(list_a, list_b, 0, {showFinished:false})
```


## joinWithCount()
Once the selector has been created, you can get a formatted list of the data items with their count. 
**NOTE:** If `listData` is a list of lists, then the first item is assumed to hold the name.
**Note 2:** If `listData` is a list of object with the `name` parameter defined, that is used

``selector.joinWithCount(sep = ', ', outFormat = (count, name) => ${count}x ${name}`)``

### Arguments
- `sep`: The separator used to join the final list. Default is `', '`
- `outFormat`: The function used to format the name and count in the list. Default will output `#x name`
	- In order to play with this, you need to pass a function using arrow notation
	- The first part, `(count, name) =>` must be the same, but the right half can be changed
	- e.g. `(count, name) => ${name} (x${count})` will output `name (x#)` 

See [[#Item and count]] for more in-depth examples

## Examples
### Basic usage
```js
var list_a = [1, 2, 3];
var list_b = ['a', 'b', 'c'];

// initalize the selector and make the selections
var result = await tp.user.ItemSelector.select(list_a, list_b)

var my_selected_values = result.selectedData;
var my_selected_display = result.selectedDisp;
```

### Chained selectors
Selectors can be chained, and the output of one can be fed into another 
```js
var list_a = [1, 2, 3, 4, 5];
var list_b = ['a', 'b', 'c', 'd', 'e'];

// Select a max of 2 items from the list
var result_1 = await tp.user.ItemSelector.select(list_a, list_b, 2);
// For example, let's say that items 1 and 2 were selected

var disp_1 = result_1.unselectedDisp;
var data_1 = result_1.unselectedData;

// Because we are using the unused items selection 1, we can start a new
// selection using only the leftover items. This works well when multiple
// players need to pull from the same pool
var result_2 = await tp.user.ItemSelector.select(disp_1, data_1, 2);

// The intermediate variables are not strictly needed
var result_2 = await tp.user.ItemSelector.select(result_1.unselectedDisp, result_1.unselectedData, 2);
```

### Access safety
Sometimes a selector might not be used if playing against an AI or something, however you have code that assumes a selector was used. This is how to safely query that information.
```js
var isRealPerson = false;

// Since this isn't a real person, an empty object will be created instead of an ItemSelector
if (isRealPerson) {
	var selector = await tp.user.ItemSelector.select([1, 2, 3], ['a', 'b', 'c']);
} else {
	var selector = {}
}

// Since our opponent isn't a real person, the selector never popped up, 
// which means that `selectedData` was never defined.
var list_as_string = selector.selectedData.length > 0 ? selector.selectedData.join(", ") : "None"; // BROKEN, DOES NOT WORK

// Therefore, be sure to access any properties (like length) with a optional chain `?.`
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining
//                                        |
//                                        ↓
var list_as_string = selector.selectedData?.length > 0 ? selector.selectedData.join(", ") : "None"; // Safely evaluates as 'None'
```

### Item and count
Example of getting the item and count in a nice formatted list
```js
var list_a = [1, 2, 3, 4, 5];
var list_b = ['a', 'b', 'c', 'd', 'e'];
var options = {askForCount: true};

var result = await tp.user.ItemSelector.select(list_a, list_b, 0, options);
// Assume the user selects the first and second item, and has a count of 2 and 10 respectivly
// results.selectedData = ['a', 'b']
// results.itemCountList = [2, 10]

var resultCount = result.joinWithCount();
// returns: "2x a, 10x b"

// The seperator can be customized, just like with join
var resultCount = result.joinWithCount(";   ");
// returns "2x a;   10x b"

// The count format function can also be customized
var resultCount = result.joinWithCount(", ", (count, name) => `${name} (x${count})`);
// returns "a (x2), b (x10)"
```

### Per-Item-Flags
```js
var display_list = ["Balloon 1", "Balloon 2", "Balloon 3"];
var data_list = [
	{name: "Red Baloon 1", askForCount: true},
	{name: "Green Baloon 2", keepWhenSelected: true},
	"Blue Baloon",
];
var options = {countName: "bundles of balloons"}

var result = await tp.user.ItemSelector.select(display_list, data_list, 0, options);
// The 1st item, the red balloon, will ask for number of bundles (count), but the others wont
// The second item, the green balloon, can be selected multiple times, but the other's still only once

```


## Changelog
### 0.1
initial

### 0.2
- Added `itemTypePrefix`
- Changed `unusedDisp` -> `unselectedDisp`
- Changed `unusedData` -> `unselectedData`

### 0.3
- Added `askForCount` — Allows the user to select a quantity for each item selected
- Added `keepSelectedItems` — Does not remove the selected item from the list

### 0.3.1
- Added `joinWithCount()` — Will output a formatted string containing the name and count

### 0.4
- Added `countOffset` — 0 based offset to increase the displayed index
- Added a new type of configuration. Now, if the `listData` list is made of objects, they can have specific per-item keys associated with them which change the way the `ItemSelector` handles them when selected. 
	- Currently supported: `[name, keepWhenSelected, askForCount]` 
- Added `countName` — Modifies the display text when asking for count, "enter the number of {countName} of ..."
	- Can be used to enter point values or other numbers

### 0.5
- Added `countShown` — Allows the user to hide the count (1st, 2nd, …) in the display

