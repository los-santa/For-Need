const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export const corruptBackupKey = (key: string) => `${key}.__corrupt_backup__`;

const reviveDates = (value: unknown): unknown => {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string" && ISO_DATE_PATTERN.test(value)) {
    return new Date(value);
  }

  if (Array.isArray(value)) {
    return value.map(reviveDates);
  }

  if (typeof value === "object") {
    const revived: Record<string, unknown> = {};
    for (const key in value) {
      revived[key] = reviveDates((value as Record<string, unknown>)[key]);
    }
    return revived;
  }

  return value;
};

const backupCorruptState = (key: string, saved: string) => {
  const backupKey = corruptBackupKey(key);

  if (localStorage.getItem(backupKey) === null) {
    localStorage.setItem(backupKey, saved);
    return;
  }

  localStorage.setItem(`${backupKey}.${Date.now()}`, saved);
};

export const loadState = <T,>(key: string, defaultValue: T): T => {
  const saved = localStorage.getItem(key);
  if (!saved) return defaultValue;

  try {
    const parsed = JSON.parse(saved);
    return reviveDates(parsed) as T;
  } catch (e) {
    backupCorruptState(key, saved);
    console.error(`Error loading state ${key}`, e);
    return defaultValue;
  }
};

export const saveState = <T,>(key: string, value: T) => {
  localStorage.setItem(key, JSON.stringify(value));
};
