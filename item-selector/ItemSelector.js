/*
	Version: 0.3.1
	Date: 2023-03-04
	Author: Alex Nordstrom
*/


const tp = app.plugins.plugins['templater-obsidian'].templater.current_functions_object;


class ItemSelector {
	static #finishedPlaceholder = null;
	static #otherPlaceholder = -1;
	
	#listUnique;
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
	};
	
	
	constructor(listDisp, listData, limit, options) {
		this.unselectedDisp = [...listDisp];
		this.unselectedData = [...listData];
		this.#listUnique = Array.from({length: listData.length}, (_, i) => i + 1);
		this.limit = limit;
		this.options = options;
		
		this.selectedDisp = [];
		this.selectedData = [];
		
		this.itemCountList = []; // Contains the count for each selected item
		this.totalItemCount = 0;
		
		// Save originals
		this.originalDisp = [...listDisp];
		this.originalData = [...listData];
	}
	
	// This is how the class needs to be called
	static async select (listDisp, listData = listDisp, limit = Number.MAX_SAFE_INTEGER, options = {}) {
		// Data validation
		if (listData.length !== listDisp.length) {
			throw new Error("listDisp and listData must have the same number of elements");
		}
		
		if (limit <= 0 || typeof limit !== 'number') {
			limit = Number.MAX_SAFE_INTEGER;
		}
		
		const selector = new ItemSelector(listDisp, listData, limit, options);
		
		await selector.#querySelection();
		
		return selector;
	}
	
	async #querySelection() {
		// If showFinished, then add the '== Done ==' option
		const showFinished = this.#getOptionOrDefault('showFinished');
		if (showFinished) {
			this.unselectedDisp.unshift(this.#getOptionOrDefault('finishedName'));
			this.unselectedData.unshift(ItemSelector.#finishedPlaceholder);
			this.#listUnique.unshift(ItemSelector.#finishedPlaceholder);
		}
		
		// If showOther, then add the '== Other ==' option
		const showOther = this.#getOptionOrDefault('showOther');
		if (showOther) {
			this.unselectedDisp.push(this.#getOptionOrDefault('otherName'));
			this.#listUnique.push(ItemSelector.#otherPlaceholder);
		}
		
		// Set up configuration options
		const itemType = this.#getOptionOrDefault('itemType');
		const itemTypeArticle = this.#getOptionOrDefault('itemTypeArticle');
		const keepSelectedItems = this.#getOptionOrDefault('keepSelectedItems');
		const askForCount = this.#getOptionOrDefault('askForCount');

		var iDisplayOffset = this.#getOptionOrDefault('countOffset');
		var i = 0;
		var item = await this.#queryItem(++i + iDisplayOffset, itemType, itemTypeArticle);
		while (item) {
			var itemDisp;
			var itemData;
			
			// Case: 'other' item was slected and the user will be prompted for an input
			if (item === ItemSelector.#otherPlaceholder) {
				itemDisp = await tp.system.prompt(`Enter the name of ${itemTypeArticle} ${tp.user.FormatOrdinal(i + iDisplayOffset)} ${itemType}`);
				itemData = itemDisp;
			} 
			// Case: A regular, non-control item was selected
			else {
				// Get index of selected item
				var j = this.#listUnique.indexOf(item);
				if (j >= 0) {
					itemDisp = this.unselectedDisp[j];
					itemData = this.unselectedData[j];
					
					// Remove the selected item if keepSelectedItems is false
					if (!keepSelectedItems) {
						this.unselectedDisp.splice(j, 1);
						this.unselectedData.splice(j, 1);
						this.#listUnique.splice(j, 1)						
					}
				}
			}
			
			// Get the count of the item, default 1
			var count;
			if (askForCount) {
				var isInvalid = true;
				var msg = `Enter the number of copies of '${itemDisp}'`;
				
				// Loop until a valid number is entered, but 0 is the default
				while (isInvalid) {
					count = await tp.system.prompt(msg, 1);
					if (count === null) {
						count = 1
						isInvalid = false;
					} else {
						count = Number.parseInt(count);
						isInvalid = isNaN(count);
						msg = `Enter the number of copies of '${itemDisp}' | Please enter a valid value`;						
					}
				}
			} else {
				count = 1;
			}
			
			// Add the selected item to the output list
			this.selectedDisp.push(itemDisp);
			this.selectedData.push(itemData);
			this.itemCountList.push(count);
			
			// Break if limit reached
			if (i >= this.limit) {
				break;
			}
			
			item = await this.#queryItem(++i + iDisplayOffset, itemType, itemTypeArticle);
		}
		
		this.totalItemCount = this.itemCountList.reduce((partialSum, a) => partialSum + a, 0);
		
		if (showFinished) {
			this.unselectedDisp.shift();
			this.unselectedData.shift();
		}
		
		if (showOther) {
			this.unselectedDisp.pop();
		}
	}
	
	joinWithCount(sep = ', ', outFormat = (count, name) => `${count}x ${name}`) {
		var cardCountList = [];
		for (let i = 0; i < this.selectedData.length; ++i) {
			var name = this.#getKeyOrDefault(this.selectedData[i], 'name');
			const count = this.itemCountList[i];
			
			cardCountList.push(outFormat(count, name));
		}
		
		return cardCountList.join(sep);
	}
	
	#getOptionOrDefault(opt) {
		return this.options[opt] !== undefined ? this.options[opt] : this.#defaultOptions[opt];
	}
	
	#getKeyOrDefault(itemData, key) {
		switch (key) {
			case 'name': 
				return itemData[key] !== undefined ? itemData.name : Array.isArray(itemData) ? itemData[0] : itemData;
		}
		
	}
	
	/**
	* Helper function for invoking the Templater Suggester
	* @param  {Number} i		       The number of the item.
	* @param  {String} itemType        The type of the item being queried.
	* @param  {String} itemTypeArticle The article that prefixes the # in the selector
	* @return {Object} 			       Returns the item selected by tp.system.suggester.
	*/
	async #queryItem(i, itemType, itemTypeArticle = "the") {
		return tp.system.suggester(this.unselectedDisp, this.#listUnique, false, `Select ${itemTypeArticle} ${tp.user.FormatOrdinal(i)} ${itemType}`);
	}
}


module.exports = ItemSelector;