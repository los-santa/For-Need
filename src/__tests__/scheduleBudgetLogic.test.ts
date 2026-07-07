import {
  clampBalanceTimelinePointCount,
  deleteDebtById,
  MAX_BALANCE_TIMELINE_POINT_COUNT,
} from '../renderer/schedule-budget-logic';

describe('schedule budget logic', () => {
  it('clamps balance timeline point counts before they reach chart generation', () => {
    expect(clampBalanceTimelinePointCount('100000000')).toBe(
      MAX_BALANCE_TIMELINE_POINT_COUNT,
    );
    expect(clampBalanceTimelinePointCount('0')).toBe(1);
    expect(clampBalanceTimelinePointCount('not-a-number')).toBe(1);
    expect(clampBalanceTimelinePointCount(12.9)).toBe(12);
  });

  it('deletes a debt without mutating cash-related state', () => {
    const debts = [
      { id: 'keep', name: 'Mortgage', amount: 300 },
      { id: 'delete', name: 'Mistake', amount: 100 },
    ];
    const cashAmount = 500;
    const transactions: unknown[] = [];

    expect(deleteDebtById(debts, 'delete')).toEqual([
      { id: 'keep', name: 'Mortgage', amount: 300 },
    ]);
    expect(cashAmount).toBe(500);
    expect(transactions).toEqual([]);
  });
});
