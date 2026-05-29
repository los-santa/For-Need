import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';

const DATE_FIELD_NAMES = new Set(['date', 'startDate', 'endDate', 'month']);

export interface LoadPersistentStateResult<T> {
  value: T;
  shouldSaveInitialValue: boolean;
}

const reviveDates = (value: unknown, fieldName?: string): unknown => {
  if (value === null || value === undefined) {
    return value;
  }

  if (
    fieldName &&
    DATE_FIELD_NAMES.has(fieldName) &&
    typeof value === 'string'
  ) {
    const revivedDate = new Date(value);

    if (!Number.isNaN(revivedDate.getTime())) {
      return revivedDate;
    }
  }

  if (Array.isArray(value)) {
    return value.map((item) => reviveDates(item));
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        reviveDates(nestedValue, key),
      ]),
    );
  }

  return value;
};

export const loadPersistentState = <T>(
  key: string,
  defaultValue: T,
): LoadPersistentStateResult<T> => {
  const saved = localStorage.getItem(key);

  if (saved === null) {
    return { value: defaultValue, shouldSaveInitialValue: true };
  }

  try {
    return {
      value: reviveDates(JSON.parse(saved)) as T,
      shouldSaveInitialValue: true,
    };
  } catch (error) {
    console.error(`Error loading state ${key}`, error);
    return { value: defaultValue, shouldSaveInitialValue: false };
  }
};

export const savePersistentState = <T>(key: string, value: T): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error saving state ${key}`, error);
    return false;
  }
};

export const usePersistentState = <T>(
  key: string,
  defaultValue: T,
): [T, Dispatch<SetStateAction<T>>] => {
  const loadResultRef = useRef<LoadPersistentStateResult<T> | null>(null);

  if (loadResultRef.current === null) {
    loadResultRef.current = loadPersistentState(key, defaultValue);
  }

  const [state, setState] = useState<T>(() => loadResultRef.current!.value);
  const hasHandledInitialSaveRef = useRef(false);

  useEffect(() => {
    if (!hasHandledInitialSaveRef.current) {
      hasHandledInitialSaveRef.current = true;

      if (!loadResultRef.current!.shouldSaveInitialValue) {
        return;
      }
    }

    savePersistentState(key, state);
  }, [key, state]);

  return [state, setState];
};
