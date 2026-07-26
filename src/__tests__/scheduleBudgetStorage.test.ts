import {
  SCHEDULE_BUDGET_STORAGE_PREFIX,
  loadScheduleBudgetState,
  normalizeScheduleBudgetScope,
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

  it('saves new values under database-scoped namespaced keys', () => {
    const scope = '/Users/me/.forneed/work.db';
    const result = saveScheduleBudgetState('cashAmount', 1234, scope);
    const expectedKey = `${SCHEDULE_BUDGET_STORAGE_PREFIX}${encodeURIComponent(
      normalizeScheduleBudgetScope(scope),
    )}.cashAmount`;

    expect(result).toBe(true);
    expect(localStorage.getItem(expectedKey)).toBe('1234');
    expect(localStorage.getItem('cashAmount')).toBeNull();
    expect(
      localStorage.getItem(`${SCHEDULE_BUDGET_STORAGE_PREFIX}cashAmount`),
    ).toBeNull();
  });

  it('keeps schedule budget data isolated per database path', () => {
    saveScheduleBudgetState('cashAmount', 100, '/db/a.db');
    saveScheduleBudgetState('cashAmount', 200, '/db/b.db');

    expect(loadScheduleBudgetState('cashAmount', 0, '/db/a.db')).toBe(100);
    expect(loadScheduleBudgetState('cashAmount', 0, '/db/b.db')).toBe(200);
  });

  it('falls back from scoped keys to global namespaced keys', () => {
    localStorage.setItem(
      `${SCHEDULE_BUDGET_STORAGE_PREFIX}cashAmount`,
      '999',
    );

    expect(loadScheduleBudgetState('cashAmount', 0, '/db/new.db')).toBe(999);
  });
});
