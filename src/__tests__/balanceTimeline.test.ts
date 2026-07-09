import { getRecurringExpensesAsSchedules } from '../renderer/schedule-budget-components/BalanceTimeline';
import { RecurringExpense } from '../renderer/schedule-budget-components/RecurringExpenseForm';

describe('getRecurringExpensesAsSchedules', () => {
  it('skips recurring expenses with invalid frequencies instead of looping forever', () => {
    const invalidExpense = {
      id: 'bad-frequency',
      title: 'Invalid',
      amount: 100,
      startDate: new Date('2026-07-09T00:00:00.000Z'),
      frequency: 'biweekly',
    } as unknown as RecurringExpense;

    const result = getRecurringExpensesAsSchedules(
      [invalidExpense],
      new Date('2026-08-09T00:00:00.000Z'),
      new Date('2026-07-09T00:00:00.000Z'),
    );

    expect(result).toEqual([]);
  });

  it('skips recurring expenses with invalid dates', () => {
    const invalidExpense = {
      id: 'bad-date',
      title: 'Invalid Date',
      amount: 100,
      startDate: '2026-07-09',
      frequency: 'daily',
    } as unknown as RecurringExpense;

    const result = getRecurringExpensesAsSchedules(
      [invalidExpense],
      new Date('2026-08-09T00:00:00.000Z'),
      new Date('2026-07-09T00:00:00.000Z'),
    );

    expect(result).toEqual([]);
  });
});
