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
		countName: "copies",
		countShown: true,
		askForAttributes: false,
		attributeList: [],
		defaultAttribute: ['none', '', '']
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
		this.itemAttributeList = []; // Contains the attributes for each selected item
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
		const countName = this.#getOptionOrDefault('countName');	

		var iDisplayOffset = this.#getOptionOrDefault('countOffset');
		var i = 0;
		var item = await this.#queryItem(++i + iDisplayOffset, itemType, itemTypeArticle);
		while (item) {
			var itemDisp;
			var itemData;
			
			// Case: 'other' item was slected and the user will be prompted for an input
			if (item === ItemSelector.#otherPlaceholder) {
				itemDisp = await tp.system.prompt(`Enter the name of ${itemTypeArticle}${this.#getIndexDisplay(i + iDisplayOffset)} ${itemType}`);
				itemData = itemDisp;
			} 
			// Case: A regular, non-control item was selected
			else {
				// Get index of selected item
				var j = this.#listUnique.indexOf(item);
				if (j >= 0) {
					itemDisp = this.unselectedDisp[j];
					itemData = this.unselectedData[j];
					var keepItem = this.#getKeyOrDefault(itemData, 'keepWhenSelected');
					
					// Remove the selected item if specific$keepWhenSelected or globabl$keepSelectedItems is false
					if (!keepItem) {
						this.unselectedDisp.splice(j, 1);
						this.unselectedData.splice(j, 1);
						this.#listUnique.splice(j, 1)						
					}
				}
			}
			
			// Get the count of the item, default 1
			var count;
			if (this.#getKeyOrDefault(itemData, 'askForCount')) {
				var isInvalid = true;
				var msg = `Enter the number of ${countName} of '${itemDisp}'`;
				
				// Loop until a valid number is entered, but 0 is the default
				while (isInvalid) {
					count = await tp.system.prompt(msg, 1);
					if (count === null) {
						count = 1
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
			var attribute;
			if (this.#getKeyOrDefault(itemData, 'askForAttributes')) {
				const attrList = this.#getKeyOrDefault(itemData, 'attributeList');
				const attrNames = attrList.map(k => k[0]);
				
				// Check if there are any items in the attribute list
				if (attrList.length > 0) {
					attribute = await tp.system.suggester(attrNames, attrList, false, `Select an attribute for '${itemDisp}'`);
					// Backup if the suggestor is canceled
					if (attribute === null) {
						new Notice(`Default attribute selected for '${itemDisp}'`);
						attribute = this.#getKeyOrDefault(itemData, 'defaultAttribute');
					}
				} else {
					new Notice(`There are no Attributes available for '${itemDisp}'\nPlease check your options`);
					attribute = this.#getKeyOrDefault(itemData, 'defaultAttribute');
				}
				
			} else {
				attribute = this.#getKeyOrDefault(itemData, 'defaultAttribute');
			}
			
			
			// Add the selected item to the output list
			this.selectedDisp.push(itemDisp);
			this.selectedData.push(itemData);
			this.itemCountList.push(count);
			this.itemAttributeList.push(attribute);
			
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
			const name = this.#getKeyOrDefault(this.selectedData[i], 'name');
			const count = this.itemCountList[i];
			
			cardCountList.push(outFormat(count, name));
		}
		
		return cardCountList.join(sep);
	}
	
	joinWithAttribute(sep = ', ', outFormat = (count, name, attribute) => `${attribute[1]}${name}${attribute[2]}`) {
		var outCardList = [];
		for (let i = 0; i < this.selectedData.length; ++i) {
			const name = this.#getKeyOrDefault(this.selectedData[i], 'name');
			const count = this.itemCountList[i];
			const attribute = this.itemAttributeList[i]; // Format is [NAME, FRONT_ATTR, BACK_ATTR]
			
			outCardList.push(outFormat(count, name, attribute));
		}
		
		return outCardList.join(sep);
	}
	
	#getOptionOrDefault(opt) {
		return this.options.hasOwnProperty(opt) ? this.options[opt] : this.#defaultOptions[opt];
	}
	
	#getKeyOrDefault(itemData, key) {
		switch (key) {
			case 'name': 
				return itemData.hasOwnProperty(key) ? itemData.name : Array.isArray(itemData) ? itemData[0] : itemData;
			case 'keepWhenSelected':
				return itemData.hasOwnProperty(key) ? itemData.keepWhenSelected : this.#getOptionOrDefault('keepSelectedItems');
			case 'askForCount':
				return itemData.hasOwnProperty(key) ? itemData.askForCount : this.#getOptionOrDefault('askForCount');
			case 'askForAttributes':
				return itemData.hasOwnProperty(key) ? itemData.askForAttributes : this.#getOptionOrDefault('askForAttributes');
			case 'attributeList':
				return itemData.hasOwnProperty(key) ? itemData.attributeList : this.#getOptionOrDefault('attributeList');
			case 'defaultAttribute':
				return itemData.hasOwnProperty(key) ? itemData.defaultAttribute : this.#getOptionOrDefault('defaultAttribute');
		}
		
	}
	
	#getIndexDisplay(i) {
		// 3 Cases, use i (and format), hide i, or use custom display (not yet implemented)
		if (this.#getOptionOrDefault('countShown')) {
			// TODO: Implement custom display
			return " " + tp.user.formatOrdinal(i); // prepend a space because when count hidden, space shouldn't be visible
		} else {
			return "";
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
		return tp.system.suggester(this.unselectedDisp, this.#listUnique, false, `Select ${itemTypeArticle}${this.#getIndexDisplay(i)} ${itemType}`);
	}
}


module.exports = ItemSelector;
