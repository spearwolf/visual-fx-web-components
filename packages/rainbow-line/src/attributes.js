// Defaults and value ranges of the numeric attributes, shared by the element and its worker,
// so that both sides fall back to the same values.

export const DEFAULT_COLOR_SLICE_WIDTH = 10;
export const DEFAULT_SLICE_CYCLE_TIME = 7;
export const DEFAULT_CYCLE_COLORS_REPEAT = 1;

/**
 * @param {number | string | null | undefined} value a number, or the value of an attribute
 * @param {number} defaultValue
 * @returns {number} the value if it is a finite number above 0, otherwise the default
 */
export function toPositiveNumber(value, defaultValue) {
  const number = typeof value === 'number' ? value : parseFloat(value ?? '');
  return Number.isFinite(number) && number > 0 ? number : defaultValue;
}
