import {
  loadState,
  normalizeBudgets,
  normalizeSchedules,
  saveState,
} from '../renderer/scheduleBudgetStorage';

describe('schedule budget localStorage persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('restores stored date strings as Date instances', () => {
    localStorage.setItem(
      'schedules',
      JSON.stringify([
        {
          id: 'schedule-1',
          title: 'Rent',
          date: '2026-06-01',
          requiredAmount: 500000,
        },
      ]),
    );

    const schedules = loadState('schedules', [], normalizeSchedules);

    expect(schedules).toHaveLength(1);
    expect(schedules[0].date).toBeInstanceOf(Date);
    expect(schedules[0].date.getTime()).not.toBeNaN();
  });

  it('falls back instead of returning non-array state that would crash renderers', () => {
    localStorage.setItem('budgets', 'null');

    const budgets = loadState('budgets', [], normalizeBudgets);

    expect(budgets).toEqual([]);
    expect(localStorage.getItem('budgets')).toBe('null');
    expect(
      Object.keys(localStorage).some((key) =>
        key.startsWith('scheduleBudget.invalidBackup.budgets.'),
      ),
    ).toBe(true);
  });

  it('backs up malformed JSON without overwriting the original key', () => {
    localStorage.setItem('schedules', '{invalid');

    const schedules = loadState('schedules', [], normalizeSchedules);

    expect(schedules).toEqual([]);
    expect(localStorage.getItem('schedules')).toBe('{invalid');
    expect(
      Object.entries(localStorage).some(
        ([key, value]) =>
          key.startsWith('scheduleBudget.invalidBackup.schedules.') &&
          value === '{invalid',
      ),
    ).toBe(true);
  });

  it('persists valid values in the same localStorage key shape', () => {
    const saved = saveState('cashAmount', 12000);

    expect(saved).toBe(true);
    expect(localStorage.getItem('cashAmount')).toBe('12000');
  });
});
