import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as React from 'react';
import {
  loadPersistentState,
  savePersistentState,
  usePersistentState,
} from '../renderer/scheduleBudgetStorage';

describe('scheduleBudgetStorage', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    localStorage.clear();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('does not mark corrupted state as safe for the initial save', () => {
    localStorage.setItem('schedules', '[{');

    const loaded = loadPersistentState('schedules', []);

    expect(loaded.value).toEqual([]);
    expect(loaded.shouldSaveInitialValue).toBe(false);
    expect(localStorage.getItem('schedules')).toBe('[{');
  });

  it('keeps corrupted data untouched on mount and saves after a user change', async () => {
    localStorage.setItem('cashAmount', '{');

    const Probe = () => {
      const [cashAmount, setCashAmount] = usePersistentState<number>(
        'cashAmount',
        0,
      );

      return React.createElement(
        'button',
        { type: 'button', onClick: () => setCashAmount(cashAmount + 1) },
        cashAmount,
      );
    };

    render(React.createElement(Probe));

    await waitFor(() => {
      expect(localStorage.getItem('cashAmount')).toBe('{');
    });

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(localStorage.getItem('cashAmount')).toBe('1');
    });
  });

  it('revives persisted date fields used by schedule and budget data', () => {
    localStorage.setItem(
      'schedule-budget',
      JSON.stringify({
        schedules: [{ date: '2026-05-29T10:30:00.000Z' }],
        recurringExpenses: [
          {
            startDate: '2026-05-01',
            endDate: '2026-06-01T00:00:00.000Z',
          },
        ],
        budgets: [{ month: '2026-05-01T00:00:00.000Z' }],
        title: '2026-05-29T10:30:00.000Z',
      }),
    );

    const loaded = loadPersistentState<any>('schedule-budget', {});

    expect(loaded.value.schedules[0].date).toBeInstanceOf(Date);
    expect(loaded.value.recurringExpenses[0].startDate).toBeInstanceOf(Date);
    expect(loaded.value.recurringExpenses[0].endDate).toBeInstanceOf(Date);
    expect(loaded.value.budgets[0].month).toBeInstanceOf(Date);
    expect(loaded.value.title).toBe('2026-05-29T10:30:00.000Z');
  });

  it('reports whether saving to localStorage succeeded', () => {
    expect(savePersistentState('cashAmount', 10000)).toBe(true);
    expect(localStorage.getItem('cashAmount')).toBe('10000');
  });
});
