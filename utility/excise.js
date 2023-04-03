

// Return a shallow copy of the array with the items in the given range removed
function excise(arr, start, end) {
	return arr.slice(0, start).concat(arr.slice(end));
}

module.exports = excise;