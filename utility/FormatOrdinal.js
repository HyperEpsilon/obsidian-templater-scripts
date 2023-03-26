// source: https://www.freecodecamp.org/news/format-dates-with-ordinal-number-suffixes-javascript/

function FormatOrdinal(i) {
  // 11, 12, 13 do not follow the usual pattern, so they are checked first
  if ((i % 100) > 3 && (i % 100) < 21){
    return `${i}th`;
  }
  
  // Extract the final digit and use that to determin ordinal
  var num = i % 10;
  switch(num) {
    case 1:
      return `${i}st`;
    case 2:
      return `${i}nd`;
    case 3:
      return `${i}rd`;
    default:
      return `${i}th`;
  }
}

module.exports = FormatOrdinal;