import { corruptBackupKey, loadState, saveState } from '../renderer/scheduleBudgetStorage';

describe('scheduleBudgetStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('backs up corrupt saved state before returning the default value', () => {
    localStorage.setItem('items', '{bad json');

    expect(loadState('items', [])).toEqual([]);
    expect(localStorage.getItem(corruptBackupKey('items'))).toBe('{bad json');

    saveState('items', []);

    expect(localStorage.getItem('items')).toBe('[]');
    expect(localStorage.getItem(corruptBackupKey('items'))).toBe('{bad json');
  });

  it('revives serialized dates when loading valid state', () => {
    localStorage.setItem('schedules', JSON.stringify([{ date: '2026-05-16T11:01:11.883Z' }]));

    const schedules = loadState<{ date: Date }[]>('schedules', []);

    expect(schedules[0].date).toBeInstanceOf(Date);
    expect(schedules[0].date.toISOString()).toBe('2026-05-16T11:01:11.883Z');
  });
});
