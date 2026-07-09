import {
  SCHEDULE_BUDGET_STORAGE_PREFIX,
  loadScheduleBudgetState,
  saveScheduleBudgetState,
} from '../renderer/scheduleBudgetStorage';

describe('schedule budget storage helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loads legacy keys and revives schedule and budget dates', () => {
    localStorage.setItem(
      'schedules',
      JSON.stringify([
        {
          id: 'schedule-1',
          title: 'Rent',
          date: '2026-07-09',
          requiredAmount: 1000,
        },
      ]),
    );
    localStorage.setItem(
      'budgets',
      JSON.stringify([
        {
          id: 'budget-1',
          category: 'Food',
          amount: 500,
          month: '2026-07-01',
        },
      ]),
    );

    const schedules = loadScheduleBudgetState<any[]>('schedules', []);
    const budgets = loadScheduleBudgetState<any[]>('budgets', []);

    expect(schedules[0].date).toBeInstanceOf(Date);
    expect(schedules[0].date.getTime()).not.toBeNaN();
    expect(budgets[0].month).toBeInstanceOf(Date);
    expect(budgets[0].month.getTime()).not.toBeNaN();
  });

  it('does not overwrite malformed legacy data while loading defaults', () => {
    localStorage.setItem('schedules', '{');

    const schedules = loadScheduleBudgetState('schedules', []);

    expect(schedules).toEqual([]);
    expect(localStorage.getItem('schedules')).toBe('{');
  });

  it('saves new values under namespaced keys', () => {
    const result = saveScheduleBudgetState('cashAmount', 1234);

    expect(result).toBe(true);
    expect(
      localStorage.getItem(`${SCHEDULE_BUDGET_STORAGE_PREFIX}cashAmount`),
    ).toBe('1234');
    expect(localStorage.getItem('cashAmount')).toBeNull();
  });
});
