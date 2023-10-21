// https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Math/ceil

/**
 * Decimal adjustment of a number.
 *
 * @param {String}  type  The type of adjustment.
 * @param {Number}  value The number.
 * @param {Integer} exp   The exponent (the 10 logarithm of the adjustment base).
 * @returns {Number} The adjusted value.
 */
function decimalAdjust(type: 'round' | 'floor' | 'ceil', value: number, exp: number) {
  // If the exp is undefined or zero...
  if (typeof exp === 'undefined' || +exp === 0) {
    return Math[type](value);
  }
  value = +value;
  exp = +exp;
  // If the value is not a number or the exp is not an integer...
  if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
    return NaN;
  }
  // Shift
  const shift = (s: string[]) => +(s[0] + 'e' + (s[1] ? +s[1] - exp : -exp));
  value = Math[type](shift(value.toString().split('e')));
  // Shift back
  const shiftBack = (s: string[]) => +(s[0] + 'e' + (s[1] ? +s[1] + exp : exp));
  return shiftBack(value.toString().split('e'));
}

export function round10(value: number, exp: number) {
  return decimalAdjust('round', value, exp);
}

export function floor10(value: number, exp: number) {
  return decimalAdjust('floor', value, exp);
}

export function ceil10(value: number, exp: number) {
  return decimalAdjust('ceil', value, exp);
}
