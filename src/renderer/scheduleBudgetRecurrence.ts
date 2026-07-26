import { addDays, addMonths, addYears, startOfDay } from 'date-fns';

export interface RecurringExpenseLike {
  id: string;
  title: string;
  amount: number;
  startDate: Date;
  endDate?: Date;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  isIncome?: boolean;
}

export interface ScheduleLike {
  id: string;
  title: string;
  date: Date;
  requiredAmount: number;
  isIncome?: boolean;
}

const recurringFrequencies = new Set(['daily', 'weekly', 'monthly', 'yearly']);

export function isValidScheduleDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

export function getRecurringExpensesAsSchedules(
  recurringExpenses: RecurringExpenseLike[],
  endDate: Date,
  today: Date = new Date(),
): ScheduleLike[] {
  const result: ScheduleLike[] = [];
  const todayStart = startOfDay(today);

  recurringExpenses.forEach((expense) => {
    if (
      !isValidScheduleDate(expense.startDate) ||
      (expense.endDate && !isValidScheduleDate(expense.endDate)) ||
      !recurringFrequencies.has(expense.frequency)
    ) {
      return;
    }

    let currentDate = startOfDay(expense.startDate);
    const finalDate = expense.endDate ? startOfDay(expense.endDate) : endDate;

    while (currentDate <= finalDate && currentDate <= endDate) {
      if (currentDate >= todayStart) {
        result.push({
          id: `recurring-${expense.id}-${currentDate.getTime()}`,
          title: expense.title,
          date: currentDate,
          requiredAmount: expense.amount,
          isIncome: expense.isIncome,
        });
      }

      switch (expense.frequency) {
        case 'daily':
          currentDate = addDays(currentDate, 1);
          break;
        case 'weekly':
          currentDate = addDays(currentDate, 7);
          break;
        case 'monthly':
          currentDate = addMonths(currentDate, 1);
          break;
        case 'yearly':
          currentDate = addYears(currentDate, 1);
          break;
        default:
          return;
      }
    }
  });

  return result;
}
