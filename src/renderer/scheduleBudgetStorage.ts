const corruptedStateDefaults = new Map<string, string>();

export const loadState = <T,>(key: string, defaultValue: T): T => {
  const saved = localStorage.getItem(key);
  if (!saved) return defaultValue;

  try {
    const parsed = JSON.parse(saved);

    const reviveDates = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(obj)) {
        return new Date(obj);
      }
      if (Array.isArray(obj)) {
        return obj.map(reviveDates);
      }
      if (typeof obj === 'object') {
        const newObj: any = {};
        for (const objKey in obj) {
          newObj[objKey] = reviveDates(obj[objKey]);
        }
        return newObj;
      }
      return obj;
    };

    return reviveDates(parsed);
  } catch (e) {
    console.error(`Error loading state ${key}`, e);
    corruptedStateDefaults.set(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
};

export const saveState = <T,>(key: string, value: T) => {
  const serialized = JSON.stringify(value);
  if (corruptedStateDefaults.get(key) === serialized) {
    return;
  }

  corruptedStateDefaults.delete(key);
  localStorage.setItem(key, serialized);
};
