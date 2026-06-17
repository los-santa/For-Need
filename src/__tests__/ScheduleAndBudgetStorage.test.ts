import { loadState, saveState } from '../renderer/ScheduleAndBudget';

describe('ScheduleAndBudget localStorage helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('does not overwrite corrupt saved data with the default value on mount', () => {
    const key = 'corrupt-schedule-budget-state';
    localStorage.setItem(key, '{not-valid-json');

    expect(loadState(key, [])).toEqual([]);

    saveState(key, []);
    expect(localStorage.getItem(key)).toBe('{not-valid-json');
  });

  it('allows a later user change to replace corrupt saved data', () => {
    const key = 'recoverable-schedule-budget-state';
    localStorage.setItem(key, '{not-valid-json');

    expect(loadState(key, 0)).toBe(0);

    saveState(key, 100);
    expect(localStorage.getItem(key)).toBe('100');
  });
});
