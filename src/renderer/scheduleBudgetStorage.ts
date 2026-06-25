export const SCHEDULE_BUDGET_STORAGE_KEYS = [
  'cashAmount',
  'items',
  'debts',
  'loans',
  'cashTransactions',
  'budgets',
  'expenses',
  'schedules',
  'recurringExpenses',
] as const;

export type ScheduleBudgetStorageKey =
  (typeof SCHEDULE_BUDGET_STORAGE_KEYS)[number];

const STORAGE_PREFIX = 'scheduleBudget';
const DEFAULT_DATABASE_NAMESPACE = 'default';

const hashDatabasePath = (databasePath: string): string => {
  const normalizedPath = databasePath.trim() || DEFAULT_DATABASE_NAMESPACE;
  let hash = 2166136261;

  for (let i = 0; i < normalizedPath.length; i += 1) {
    hash ^= normalizedPath.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
};

export const getScheduleBudgetStorageKey = (
  databasePath: string,
  key: ScheduleBudgetStorageKey,
): string => `${STORAGE_PREFIX}:${hashDatabasePath(databasePath)}:${key}`;

const reviveDates = (value: unknown): unknown => {
  if (value === null || value === undefined) return value;
  if (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
  ) {
    return new Date(value);
  }
  if (Array.isArray(value)) {
    return value.map(reviveDates);
  }
  if (typeof value === 'object') {
    const revivedObject: Record<string, unknown> = {};
    Object.entries(value).forEach(([entryKey, entryValue]) => {
      revivedObject[entryKey] = reviveDates(entryValue);
    });
    return revivedObject;
  }

  return value;
};

export const loadScheduleBudgetState = <T>(
  storage: Storage,
  databasePath: string,
  key: ScheduleBudgetStorageKey,
  defaultValue: T,
): T => {
  const scopedKey = getScheduleBudgetStorageKey(databasePath, key);
  let saved = storage.getItem(scopedKey);

  if (saved === null) {
    const legacyValue = storage.getItem(key);
    if (legacyValue !== null) {
      storage.setItem(scopedKey, legacyValue);
      saved = legacyValue;
    }
  }

  if (saved === null) return defaultValue;

  try {
    return reviveDates(JSON.parse(saved)) as T;
  } catch (error) {
    console.error(`Error loading schedule budget state ${key}`, error);
    return defaultValue;
  }
};

export const saveScheduleBudgetState = <T>(
  storage: Storage,
  databasePath: string,
  key: ScheduleBudgetStorageKey,
  value: T,
): void => {
  storage.setItem(
    getScheduleBudgetStorageKey(databasePath, key),
    JSON.stringify(value),
  );
};

type SettingsResponse = {
  success?: boolean;
  data?: {
    dbPath?: unknown;
  };
};

export const resolveScheduleBudgetDatabasePath = async (): Promise<string> => {
  try {
    if (typeof window === 'undefined') {
      return DEFAULT_DATABASE_NAMESPACE;
    }

    const result = (await window.electron?.ipcRenderer.invoke(
      'get-settings',
    )) as SettingsResponse | undefined;

    if (result?.success && typeof result.data?.dbPath === 'string') {
      return result.data.dbPath;
    }
  } catch (error) {
    console.error('Failed to resolve schedule budget database path', error);
  }

  return DEFAULT_DATABASE_NAMESPACE;
};
