import type { CashTransaction } from './schedule-budget-components/CashHistoryModal';
import type { Budget, Expense } from './schedule-budget-components/DailyBudgetDisplay';
import type { RecurringExpense } from './schedule-budget-components/RecurringExpenseForm';
import type { Schedule } from './schedule-budget-components/ScheduleForm';
import type { Debt, Item, Loan } from './schedule-budget-components/WealthAssetModal';

type StateNormalizer<T> = (value: unknown) => T | null;

const BACKUP_PREFIX = 'scheduleBudget.invalidBackup';

function backupInvalidState(key: string, rawValue: string) {
  try {
    localStorage.setItem(`${BACKUP_PREFIX}.${key}.${Date.now()}`, rawValue);
  } catch (error) {
    console.error(`Error backing up invalid state ${key}`, error);
  }
}

export const loadState = <T,>(
  key: string,
  defaultValue: T,
  normalize: StateNormalizer<T>,
): T => {
  const saved = localStorage.getItem(key);
  if (saved === null) return defaultValue;

  try {
    const normalized = normalize(JSON.parse(saved));
    if (normalized === null) {
      console.error(`Invalid stored state shape for ${key}`);
      backupInvalidState(key, saved);
      return defaultValue;
    }

    return normalized;
  } catch (error) {
    console.error(`Error loading state ${key}`, error);
    backupInvalidState(key, saved);
    return defaultValue;
  }
};

export const saveState = <T,>(key: string, value: T): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error saving state ${key}`, error);
    return false;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeString = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;

const normalizeOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const normalizeNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const normalizeOptionalBoolean = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;

const normalizeDate = (value: unknown): Date | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
};

const normalizeArray = <T,>(
  value: unknown,
  normalizeItem: StateNormalizer<T>,
): T[] | null => {
  if (!Array.isArray(value)) return null;

  return value.reduce<T[]>((items, item) => {
    const normalizedItem = normalizeItem(item);
    if (normalizedItem !== null) {
      items.push(normalizedItem);
    }
    return items;
  }, []);
};

const normalizeItem = (value: unknown): Item | null => {
  if (!isRecord(value)) return null;

  const id = normalizeString(value.id);
  const name = normalizeString(value.name);
  const amount = normalizeNumber(value.amount);

  if (!id || !name || amount === null) return null;
  return { id, name, amount };
};

const normalizeDebt = (value: unknown): Debt | null => {
  if (!isRecord(value)) return null;

  const id = normalizeString(value.id);
  const name = normalizeString(value.name);
  const target = normalizeString(value.target);
  const amount = normalizeNumber(value.amount);

  if (!id || !name || !target || amount === null) return null;
  return { id, name, target, amount };
};

const normalizeLoan = (value: unknown): Loan | null => {
  if (!isRecord(value)) return null;

  const id = normalizeString(value.id);
  const name = normalizeString(value.name);
  const amount = normalizeNumber(value.amount);

  if (!id || !name || amount === null) return null;
  return { id, name, amount };
};

const normalizeCashTransaction = (value: unknown): CashTransaction | null => {
  if (!isRecord(value)) return null;

  const id = normalizeString(value.id);
  const date = normalizeDate(value.date);
  const type = value.type === 'income' || value.type === 'expense' ? value.type : null;
  const amount = normalizeNumber(value.amount);
  const description = normalizeString(value.description);
  const balance = normalizeNumber(value.balance);

  if (!id || !date || !type || amount === null || !description || balance === null) {
    return null;
  }

  return { id, date, type, amount, description, balance };
};

const normalizeBudget = (value: unknown): Budget | null => {
  if (!isRecord(value)) return null;

  const id = normalizeString(value.id);
  const category = normalizeString(value.category);
  const amount = normalizeNumber(value.amount);
  const month = normalizeDate(value.month);

  if (!id || !category || amount === null || !month) return null;
  return { id, category, amount, month };
};

const normalizeExpense = (value: unknown): Expense | null => {
  if (!isRecord(value)) return null;

  const id = normalizeString(value.id);
  const date = normalizeDate(value.date);
  const category = normalizeString(value.category);
  const amount = normalizeNumber(value.amount);
  const description = normalizeString(value.description);

  if (!id || !date || !category || amount === null || !description) return null;
  return { id, date, category, amount, description };
};

const normalizeSchedule = (value: unknown): Schedule | null => {
  if (!isRecord(value)) return null;

  const id = normalizeString(value.id);
  const title = normalizeString(value.title);
  const date = normalizeDate(value.date);
  const requiredAmount = normalizeNumber(value.requiredAmount);

  if (!id || !title || !date || requiredAmount === null) return null;

  return {
    id,
    title,
    date,
    requiredAmount,
    isIncome: normalizeOptionalBoolean(value.isIncome),
    time: normalizeOptionalString(value.time),
    isSaleSchedule: normalizeOptionalBoolean(value.isSaleSchedule),
    itemId: normalizeOptionalString(value.itemId),
  };
};

const normalizeRecurringExpense = (value: unknown): RecurringExpense | null => {
  if (!isRecord(value)) return null;

  const id = normalizeString(value.id);
  const title = normalizeString(value.title);
  const amount = normalizeNumber(value.amount);
  const startDate = normalizeDate(value.startDate);
  const endDate =
    value.endDate === undefined || value.endDate === null ? undefined : normalizeDate(value.endDate);
  const frequency =
    value.frequency === 'daily' ||
    value.frequency === 'weekly' ||
    value.frequency === 'monthly' ||
    value.frequency === 'yearly'
      ? value.frequency
      : null;

  if (!id || !title || amount === null || !startDate || !frequency || endDate === null) {
    return null;
  }

  return {
    id,
    title,
    amount,
    startDate,
    endDate,
    frequency,
    isIncome: normalizeOptionalBoolean(value.isIncome),
  };
};

export const normalizeCashAmount: StateNormalizer<number> = normalizeNumber;
export const normalizeItems: StateNormalizer<Item[]> = (value) =>
  normalizeArray(value, normalizeItem);
export const normalizeDebts: StateNormalizer<Debt[]> = (value) =>
  normalizeArray(value, normalizeDebt);
export const normalizeLoans: StateNormalizer<Loan[]> = (value) =>
  normalizeArray(value, normalizeLoan);
export const normalizeCashTransactions: StateNormalizer<CashTransaction[]> = (value) =>
  normalizeArray(value, normalizeCashTransaction);
export const normalizeBudgets: StateNormalizer<Budget[]> = (value) =>
  normalizeArray(value, normalizeBudget);
export const normalizeExpenses: StateNormalizer<Expense[]> = (value) =>
  normalizeArray(value, normalizeExpense);
export const normalizeSchedules: StateNormalizer<Schedule[]> = (value) =>
  normalizeArray(value, normalizeSchedule);
export const normalizeRecurringExpenses: StateNormalizer<RecurringExpense[]> = (value) =>
  normalizeArray(value, normalizeRecurringExpense);
