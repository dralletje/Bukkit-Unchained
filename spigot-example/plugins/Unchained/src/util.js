let util = require('util');
/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  return require('./bootstrap/format_value.js').format_value(obj).join('\n');
}

module.exports = {
  ...util,
  inspect,
}
