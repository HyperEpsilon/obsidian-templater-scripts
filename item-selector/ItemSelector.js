/*
	Version: 0.5.2
	Date: 2023-05-20
	Author: Alex Nordstrom
*/

class ItemSelector {
  static #EXIT_PLACEHOLDER = null;
  static #OTHER_PLACEHOLDER = -1;
  static #isInternalConstructing = false;

  #tp;
  #listIndex;
  #defaultOptions = {
    showFinished: true,
    finishedName: "== Done ==",
    showOther: false,
    otherName: "== Other ==",
    itemType: "item",
    itemTypeArticle: "the",
    keepSelectedItems: false,
    askForCount: false,
    countOffset: 0,
    countName: "copies",
    countShown: true,
    askForAttributes: false,
    attributeList: [],
    defaultAttribute: ["none", "", ""],
    attributeName: "attribute",
    attributeArticle: "an",
  };

  // private constructor. Class should be invoked via ItemSelector.select()
  constructor(listDisp, listData, limit, options) {
    if (!ItemSelector.#isInternalConstructing) {
      new Notice(
        "ItemSelector is not constructable, use ItemSelector.select() instead",
      );
      throw new TypeError(
        "ItemSelector is not constructable, use ItemSelector.select() instead",
      );
    }
    ItemSelector.#isInternalConstructing = false;

    // set up access to parent Templater plugin
    this.#tp =
      app.plugins.plugins[
        "templater-obsidian"
      ].templater.current_functions_object;

    // inputs
    this.unselectedDisp = [...listDisp];
    this.unselectedData = [...listData];
    this.#listIndex = Array.from({ length: listData.length }, (_, i) => i + 1); // A list of integers used to uniquely select an item from the list. Basically, a list of indexes
    this.limit = limit;
    this.options = this.#constructOptions(options);

    // outputs
    this.selectedDisp = [];
    this.selectedData = [];
    this.itemCountList = []; // Contains the count for each selected item
    this.itemAttributeList = []; // Contains the attribute for each selected item
    this.formattedDisp = []; // List of items wrapped with the selected attributes
    this.totalItemCount = 0;

    // Save originals (output)
    this.originalDisp = [...listDisp];
    this.originalData = [...listData];
  }

  // Override the default options with options passed by the user
  #constructOptions(options) {
    for (const [key, value] of Object.entries(options)) {
      this.#defaultOptions[key] = value;
    }
    return this.#defaultOptions;
  }

  /**
   * This is how the selector needs to be called
   * @param {Array} listDisp A list of strings that will be displayed for each item in the Suggester prompt
   * @param {Array} listData A list of objects that will be selected from. Must be the same length as listDisp. Can be strings or objects with additional parameters
   * @param {Number} limit The maximum number of items selected. Does not enforce a minimum. 0 is treated as no limit
   * @param {Object} options A single object that contains all customization parameters (see documentation file)
   * @returns An ItemSelector object with all selection choices made available as lists
   */
  static async select(
    listDisp,
    listData = listDisp,
    limit = Number.MAX_SAFE_INTEGER,
    options = {},
  ) {
    // Data validation
    if (listData.length !== listDisp.length) {
      throw new Error(
        "listDisp and listData must have the same number of elements",
      );
    }

    if (limit === 0) {
      limit = Number.MAX_SAFE_INTEGER;
    } else if (limit < 0 || typeof limit !== "number") {
      throw new TypeError(
        "limit is not a valid number. limit must either be 0 (no limit) or greater than 0",
      );
    }

    ItemSelector.#isInternalConstructing = true;
    const selector = new ItemSelector(listDisp, listData, limit, options);

    await selector.#querySelection();

    return selector;
  }

  async #querySelection() {
    // If showFinished, then add the EXIT_PLACEHOLDER ('== Done ==') option to the beginning of the selection lists
    const showFinished = this.options.showFinished;
    if (showFinished) {
      this.unselectedDisp.unshift(this.options.finishedName);
      this.unselectedData.unshift(ItemSelector.#EXIT_PLACEHOLDER);
      this.#listIndex.unshift(ItemSelector.#EXIT_PLACEHOLDER);
    }

    // If showOther, then add the OTHER_PLACEHOLDER ('== Other ==') option to the end of the selection lists
    const showOther = this.options.showOther;
    if (showOther) {
      this.unselectedDisp.push(this.options.otherName);
      this.#listIndex.push(ItemSelector.#OTHER_PLACEHOLDER);
    }

    // Set up configuration options
    const itemType = this.options.itemType;
    const itemTypeArticle = this.options.itemTypeArticle;
    const countName = this.options.countName;

    while (this.selectedData.length < this.limit) {
      let itemDisp;
      let itemData;
      let displayCount =
        this.selectedData.length + 1 + this.options.countOffset;

      let item = await this.#queryItem(displayCount, itemType, itemTypeArticle);

      // Case: EXIT. If the user selects the EXIT_PLACEHOLDER or if the selector is canceled, null is returned.
      if (item === null) {
        break;
      }

      // Case: 'other' item was selected and the user will be prompted for an input
      if (item === ItemSelector.#OTHER_PLACEHOLDER) {
        itemDisp = await this.#tp.system.prompt(
          `Enter the name of ${itemTypeArticle}${this.#getIndexDisplay(displayCount)} ${itemType}`,
        );
        itemData = itemDisp;
      }
      // Case: A regular, non-control item was selected
      else {
        // Get index of selected item
        let j = this.#listIndex.indexOf(item);
        if (j >= 0) {
          itemDisp = this.unselectedDisp[j];
          itemData = this.unselectedData[j];
          let keepItem = this.#getKeyOrDefault(itemData, "keepWhenSelected");

          // Remove the selected item if specific$keepWhenSelected or global$keepSelectedItems is false
          if (!keepItem) {
            this.unselectedDisp.splice(j, 1);
            this.unselectedData.splice(j, 1);
            this.#listIndex.splice(j, 1);
          }
        }
      }

      // Get the count of the item, default 1
      let count;
      if (this.#getKeyOrDefault(itemData, "askForCount")) {
        let isInvalid = true;
        let msg = `Enter the number of ${countName} of '${itemDisp}'`;

        // Loop until a valid number is entered, but 0 is the default
        while (isInvalid) {
          count = await this.#tp.system.prompt(msg, 1);
          if (count === null) {
            count = 1;
            isInvalid = false;
          } else {
            count = Number.parseInt(count);
            isInvalid = isNaN(count);
            msg = `Enter the number of ${countName} of '${itemDisp}' | Please enter a valid value`;
          }
        }
      } else {
        count = 1;
      }

      // Get the attribute of the item
      let attribute;
      if (this.#getKeyOrDefault(itemData, "askForAttributes")) {
        const attrList = this.#getKeyOrDefault(itemData, "attributeList");
        const attrNames = attrList.map((k) => k[0]);
        const attributeName = this.options.attributeName;
        const attributeArticle = this.options.attributeArticle;

        // Check if there are any items in the attribute list
        if (attrList.length > 0) {
          attribute = await this.#tp.system.suggester(
            attrNames,
            attrList,
            false,
            `Select ${attributeArticle} ${attributeName} for '${itemDisp}'`,
          );
          // Backup if the suggester is canceled
          if (attribute === null) {
            new Notice(`Default ${attributeName} selected for '${itemDisp}'`);
            attribute = this.#getKeyOrDefault(itemData, "defaultAttribute");
          }
        } else {
          new Notice(
            `There are no ${attributeName}s available for '${itemDisp}'\nPlease check your options`,
          );
          attribute = this.#getKeyOrDefault(itemData, "defaultAttribute");
        }
      } else {
        attribute = this.#getKeyOrDefault(itemData, "defaultAttribute");
      }

      // Add the selected item to the output list
      this.selectedDisp.push(itemDisp);
      this.selectedData.push(itemData);
      this.itemCountList.push(count);
      this.itemAttributeList.push(attribute);
      this.formattedDisp.push(
        attribute[1] + this.#getKeyOrDefault(itemData, "name") + attribute[2],
      );
    }

    // Cleanup
    this.totalItemCount = this.itemCountList.reduce(
      (partialSum, a) => partialSum + a,
      0,
    );

    // Remove the '== Done ==' option from the front of the lists
    if (showFinished) {
      this.unselectedDisp.shift();
      this.unselectedData.shift();
    }

    // Remove the '== Other ==' option from the back of the list
    if (showOther) {
      this.unselectedDisp.pop();
    }
  }

  // function called after the selector has run to output a formatted string with item counts
  joinWithCount(sep = ", ", outFormat = (count, name) => `${count}x ${name}`) {
    let cardCountList = [];
    for (let i = 0; i < this.selectedData.length; ++i) {
      const name = this.#getKeyOrDefault(this.selectedData[i], "name");
      const count = this.itemCountList[i];

      cardCountList.push(outFormat(count, name));
    }

    return cardCountList.join(sep);
  }

  // function called after the selector has run to output a formatted string with items wrapped by their attributes
  joinWithAttribute(
    sep = ", ",
    outFormat = (count, name, attribute) =>
      `${attribute[1]}${name}${attribute[2]}`,
  ) {
    let outCardList = [];
    for (let i = 0; i < this.selectedData.length; ++i) {
      const name = this.#getKeyOrDefault(this.selectedData[i], "name");
      const count = this.itemCountList[i];
      const attribute = this.itemAttributeList[i]; // Format is [NAME, FRONT_ATTR, BACK_ATTR]

      outCardList.push(outFormat(count, name, attribute));
    }

    return outCardList.join(sep);
  }

  // Gets the per-item-key value for an option if defined, or passes global option if not
  #getKeyOrDefault(itemData, key) {
    // Special case for "name" as name could be stored in multiple ways
    if (key === "name") {
      return itemData.hasOwnProperty(key)
        ? itemData.name
        : Array.isArray(itemData)
          ? itemData[0]
          : itemData;
    } else if (key === "keepWhenSelected") {
      // Separate case because per-item-key (keepWhenSelected) does not match global option (keepSelectedItems)
      // Kept this way to not break legacy implementations
      return itemData.hasOwnProperty(key)
        ? itemData.keepWhenSelected
        : this.options.keepSelectedItems;
    }

    // Default case
    return itemData.hasOwnProperty(key) ? itemData[key] : this.options[key];
  }

  #getIndexDisplay(i) {
    // 3 Cases, use i (and format), hide i, or use custom display (not yet implemented)
    if (this.options.countShown) {
      // TODO: Implement custom display
      return " " + this.#tp.user.formatOrdinal(i); // prepend a space because when count hidden, space shouldn't be visible
    } else {
      return "";
    }
  }

  /**
   * Helper function for invoking the Templater Suggester
   * @param  {Number} i               The number of the item.
   * @param  {String} itemType        The type of the item being queried.
   * @param  {String} itemTypeArticle The article that prefixes the # in the selector
   * @return {Object}                 Returns the item selected by tp.system.suggester.
   */
  async #queryItem(i, itemType, itemTypeArticle = "the") {
    return this.#tp.system.suggester(
      this.unselectedDisp,
      this.#listIndex,
      false,
      `Select ${itemTypeArticle}${this.#getIndexDisplay(i)} ${itemType}`,
    );
  }
}

module.exports = ItemSelector;
