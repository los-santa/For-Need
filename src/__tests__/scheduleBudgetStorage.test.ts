import {
  getScheduleBudgetStorageKey,
  loadScheduleBudgetState,
  saveScheduleBudgetState,
} from '../renderer/scheduleBudgetStorage';

describe('schedule budget storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('keeps values isolated by database path', () => {
    saveScheduleBudgetState(localStorage, '/tmp/a.db', 'cashAmount', 100);
    saveScheduleBudgetState(localStorage, '/tmp/b.db', 'cashAmount', 250);

    expect(
      loadScheduleBudgetState(localStorage, '/tmp/a.db', 'cashAmount', 0),
    ).toBe(100);
    expect(
      loadScheduleBudgetState(localStorage, '/tmp/b.db', 'cashAmount', 0),
    ).toBe(250);
  });

  it('copies legacy unscoped values into the active database namespace', () => {
    localStorage.setItem('cashAmount', '300');

    expect(
      loadScheduleBudgetState(localStorage, '/tmp/current.db', 'cashAmount', 0),
    ).toBe(300);
    expect(
      localStorage.getItem(
        getScheduleBudgetStorageKey('/tmp/current.db', 'cashAmount'),
      ),
    ).toBe('300');
  });

  it('revives saved ISO date strings', () => {
    const schedule = {
      id: 'schedule-1',
      date: new Date('2026-06-25T11:00:00.000Z'),
    };

    saveScheduleBudgetState(localStorage, '/tmp/a.db', 'schedules', [
      schedule,
    ]);

    const [loadedSchedule] = loadScheduleBudgetState<
      Array<{ id: string; date: Date }>
    >(localStorage, '/tmp/a.db', 'schedules', []);

    expect(loadedSchedule.date).toBeInstanceOf(Date);
    expect(loadedSchedule.date.toISOString()).toBe(
      '2026-06-25T11:00:00.000Z',
    );
  });
});
