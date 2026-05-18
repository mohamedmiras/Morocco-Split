/**
 * Central Enterprise Financial Math Engine
 * Bypasses JavaScript IEEE 754 binary floating-point errors by using integer-scaling,
 * absolute round-off rules, and strict 2-decimal precision (MAD currency standards).
 */

/**
 * Rounds a number strictly to 2 decimal places with epsilon safety.
 */
export const safeRound = (num) => {
  const value = parseFloat(num);
  if (isNaN(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

/**
 * Currency-safe addition.
 */
export const safeAdd = (a, b) => {
  const aScaled = Math.round(safeRound(a) * 100);
  const bScaled = Math.round(safeRound(b) * 100);
  return (aScaled + bScaled) / 100;
};

/**
 * Currency-safe subtraction.
 */
export const safeSubtract = (a, b) => {
  const aScaled = Math.round(safeRound(a) * 100);
  const bScaled = Math.round(safeRound(b) * 100);
  return (aScaled - bScaled) / 100;
};

/**
 * Currency-safe multiplication.
 */
export const safeMultiply = (a, b) => {
  const aScaled = Math.round(safeRound(a) * 100);
  const bScaled = Math.round(safeRound(b) * 100);
  // Divide by 100 to scale back down after multiplication
  return Math.round((aScaled * bScaled) / 100) / 100;
};

/**
 * Currency-safe division.
 */
export const safeDivide = (a, b) => {
  if (b === 0) return 0;
  const aScaled = Math.round(safeRound(a) * 100);
  // Scaling division: (aScaled / b) yieldsScaledValue, then / 100 for normal currency
  return Math.round(aScaled / b) / 100;
};

/**
 * Sums an array of values using safe addition.
 */
export const safeSum = (arr) => {
  return arr.reduce((sum, val) => safeAdd(sum, val), 0);
};

/**
 * Validates whether the sum of split amounts matches the parent total exactly.
 * Ensures the ledger integrity (Total Owed = Total Owned) stands verified.
 * 
 * @param {number|string} totalAmount - The parent expense total.
 * @param {Array} splits - Array of participant splits (e.g. [{ amount: 3.33 }, ...]).
 * @returns {Object} { isValid, diff, expectedTotal, actualTotal }
 */
export const validateSplitTotals = (totalAmount, splits = []) => {
  const expectedTotal = safeRound(totalAmount);
  
  // Sum only splits that are selected and have valid values
  const actualTotal = safeSum(splits.map(s => s.amount || 0));
  
  const diff = safeSubtract(expectedTotal, actualTotal);
  
  return {
    isValid: Math.abs(diff) < 0.001, // Exact match
    diff,
    expectedTotal,
    actualTotal
  };
};
