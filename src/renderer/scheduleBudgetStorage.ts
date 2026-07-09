export const SCHEDULE_BUDGET_STORAGE_PREFIX = 'forneed.scheduleBudget.';

const DATE_KEYS = new Set(['date', 'startDate', 'endDate', 'month']);
const ISO_DATE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function storageKey(key: string): string {
  return `${SCHEDULE_BUDGET_STORAGE_PREFIX}${key}`;
}

function reviveDates(value: unknown, key?: string): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    const shouldReviveDate =
      ISO_DATE_TIME_PATTERN.test(value) ||
      (!!key && DATE_KEYS.has(key) && DATE_ONLY_PATTERN.test(value));

    if (shouldReviveDate) {
      const parsedDate = new Date(value);
      if (!Number.isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => reviveDates(item));
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        reviveDates(entryValue, entryKey),
      ]),
    );
  }

  return value;
}

export function loadScheduleBudgetState<T>(key: string, defaultValue: T): T {
  const namespacedKey = storageKey(key);
  const saved =
    localStorage.getItem(namespacedKey) ?? localStorage.getItem(key);

  if (!saved) {
    return defaultValue;
  }

  try {
    return reviveDates(JSON.parse(saved)) as T;
  } catch (error) {
    console.error(`Error loading state ${key}`, error);
    return defaultValue;
  }
}

export function saveScheduleBudgetState<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(storageKey(key), JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error saving state ${key}`, error);
    return false;
  }
}
