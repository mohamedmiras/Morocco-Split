import { describe, it, expect } from 'vitest';
import { safeRound, safeAdd, safeSubtract, safeMultiply, safeDivide, safeSum, validateSplitTotals } from '../lib/financialMath';
import { calculateSplit } from '../components/split/SplitCalculator';

describe('Financial Math Core Engine Tests', () => {
  it('safeRound rounds to exactly 2 decimal places with epsilon safety', () => {
    expect(safeRound(10.005)).toBe(10.01);
    expect(safeRound(10.004)).toBe(10.00);
    expect(safeRound(-1.555)).toBe(-1.55); // Standard epsilon rounding behavior for float
    expect(safeRound('abc')).toBe(0);
  });

  it('safeAdd eliminates standard JavaScript floating-point errors', () => {
    // Normal JS: 0.1 + 0.2 = 0.30000000000000004
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(safeAdd(0.1, 0.2)).toBe(0.3);
    expect(safeAdd(10.05, 20.15)).toBe(30.20);
  });

  it('safeSubtract works perfectly without trailing decimal float noise', () => {
    // Normal JS: 0.3 - 0.2 = 0.09999999999999998
    expect(0.3 - 0.2).not.toBe(0.1);
    expect(safeSubtract(0.3, 0.2)).toBe(0.1);
    expect(safeSubtract(100, 33.33)).toBe(66.67);
  });

  it('safeMultiply works accurately for scaling fractions', () => {
    expect(safeMultiply(33.33, 3)).toBe(99.99);
    expect(safeMultiply(0.1, 0.2)).toBe(0.02);
  });

  it('safeDivide behaves deterministically for currency units', () => {
    expect(safeDivide(10, 3)).toBe(3.33);
    expect(safeDivide(10, 0)).toBe(0);
  });

  it('safeSum calculates precise arrays of floats', () => {
    const list = [0.1, 0.2, 0.3];
    expect(safeSum(list)).toBe(0.6);
  });

  it('validateSplitTotals validates perfect vs mismatched ledger states', () => {
    // Perfect match
    const test1 = validateSplitTotals(100.00, [{ amount: 33.33 }, { amount: 33.33 }, { amount: 33.34 }]);
    expect(test1.isValid).toBe(true);
    expect(test1.diff).toBe(0);

    // Mismatched sum
    const test2 = validateSplitTotals(100.00, [{ amount: 33.33 }, { amount: 33.33 }, { amount: 33.33 }]);
    expect(test2.isValid).toBe(false);
    expect(test2.diff).toBe(0.01);
  });
});

describe('Split Expense Calculation Distribution Tests', () => {
  it('assigns perfect equal splits and distributes remainder to first member (10 MAD / 3)', () => {
    const participants = [
      { id: '1', name: 'Md Najeeb', selected: true, weight: 1 },
      { id: '2', name: 'Munavvir', selected: true, weight: 1 },
      { id: '3', name: 'Murshid', selected: true, weight: 1 }
    ];

    const result = calculateSplit(10.00, participants, 'equal');
    
    // Total sum should be EXACTLY 10.00
    const sum = safeSum(result.map(r => r.amount));
    expect(sum).toBe(10.00);

    // One participant should have 3.34, the other two 3.33
    const amounts = result.map(r => r.amount).sort((a, b) => b - a);
    expect(amounts).toEqual([3.34, 3.33, 3.33]);
  });

  it('supports weight-based equal splits safely', () => {
    const participants = [
      { id: '1', name: 'Student A', selected: true, weight: 2 },
      { id: '2', name: 'Student B', selected: true, weight: 1 }
    ];

    const result = calculateSplit(10.00, participants, 'equal');
    const sum = safeSum(result.map(r => r.amount));
    expect(sum).toBe(10.00);

    // Student A gets 2/3 weight = 6.67, Student B gets 1/3 weight = 3.33
    expect(result.find(r => r.id === '1').amount).toBe(6.67);
    expect(result.find(r => r.id === '2').amount).toBe(3.33);
  });

  it('keeps separate splits independent without auto-adjustments', () => {
    const participants = [
      { id: '1', name: 'Student A', selected: true, amount: 0, isManuallyEdited: false },
      { id: '2', name: 'Student B', selected: true, amount: 0, isManuallyEdited: false }
    ];

    // Typings are independent in separate mode
    let updated = calculateSplit(10.00, participants, 'separate', '1', 5.50);
    expect(updated.find(r => r.id === '1').amount).toBe(5.50);
    expect(updated.find(r => r.id === '2').amount).toBe(0);
  });

  it('distributes remaining amount safely in Custom mode when one participant manually edits', () => {
    const participants = [
      { id: '1', name: 'Student A', selected: true, amount: 3.33, isManuallyEdited: false },
      { id: '2', name: 'Student B', selected: true, amount: 3.33, isManuallyEdited: false },
      { id: '3', name: 'Student C', selected: true, amount: 3.34, isManuallyEdited: false }
    ];

    // If Student A manually edits to 4.00, the remaining 6.00 is split among B and C (3.00 each)
    const result = calculateSplit(10.00, participants, 'custom', '1', 4.00);
    const sum = safeSum(result.map(r => r.amount));
    expect(sum).toBe(10.00);

    expect(result.find(r => r.id === '1').amount).toBe(4.00);
    expect(result.find(r => r.id === '1').isManuallyEdited).toBe(true);
    expect(result.find(r => r.id === '2').amount).toBe(3.00);
    expect(result.find(r => r.id === '3').amount).toBe(3.00);
  });
});
