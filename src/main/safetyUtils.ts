import path from 'path';

const HABIT_UPDATE_COLUMNS: Record<string, string> = {
  dtstartLocal: 'dtstart_local',
  dtstart_local: 'dtstart_local',
  tzid: 'tzid',
  rrule: 'rrule',
  rdatesJson: 'rdates_json',
  rdates_json: 'rdates_json',
  exdatesJson: 'exdates_json',
  exdates_json: 'exdates_json',
  wkst: 'wkst',
  untilUtc: 'until_utc',
  until_utc: 'until_utc',
  countLimit: 'count_limit',
  count_limit: 'count_limit',
  durationMinutes: 'duration_minutes',
  duration_minutes: 'duration_minutes',
  minSpacingMinutes: 'min_spacing_minutes',
  min_spacing_minutes: 'min_spacing_minutes',
  unitLabel: 'unit_label',
  unit_label: 'unit_label',
  targetPerOccurrence: 'target_per_occurrence',
  target_per_occurrence: 'target_per_occurrence',
  maxPerDay: 'max_per_day',
  max_per_day: 'max_per_day',
  rolloverMode: 'rollover_mode',
  rollover_mode: 'rollover_mode',
  weeklyQuota: 'weekly_quota',
  weekly_quota: 'weekly_quota',
  monthlyQuota: 'monthly_quota',
  monthly_quota: 'monthly_quota',
  adherenceTarget: 'adherence_target',
  adherence_target: 'adherence_target',
  streakCount: 'streak_count',
  streak_count: 'streak_count',
  longestStreak: 'longest_streak',
  longest_streak: 'longest_streak',
  lastCompletedAt: 'last_completed_at',
  last_completed_at: 'last_completed_at',
  notifyEnabled: 'notify_enabled',
  notify_enabled: 'notify_enabled',
  notifyBeforeMin: 'notify_before_min',
  notify_before_min: 'notify_before_min',
  notifyAtLocal: 'notify_at_local',
  notify_at_local: 'notify_at_local',
  status: 'status',
  startDate: 'start_date',
  start_date: 'start_date',
  endDate: 'end_date',
  end_date: 'end_date',
  colorHex: 'color_hex',
  color_hex: 'color_hex',
  icon: 'icon',
  notes: 'notes',
};

const RRULE_AFFECTING_COLUMNS = new Set([
  'dtstart_local',
  'tzid',
  'rrule',
  'rdates_json',
  'exdates_json',
  'duration_minutes',
]);

export type HabitUpdatePlan =
  | {
      success: true;
      assignments: string[];
      values: unknown[];
      changedColumns: string[];
    }
  | {
      success: false;
      error: 'field-not-allowed' | 'duplicate-field';
      field: string;
    };

export function buildHabitUpdatePlan(
  updates: Record<string, unknown>,
): HabitUpdatePlan {
  const assignments: string[] = [];
  const values: unknown[] = [];
  const changedColumns: string[] = [];
  const seenColumns = new Set<string>();

  for (const [field, value] of Object.entries(updates)) {
    if (value === undefined) {
      continue;
    }

    const column = HABIT_UPDATE_COLUMNS[field];
    if (!column) {
      return { success: false, error: 'field-not-allowed', field };
    }

    if (seenColumns.has(column)) {
      return { success: false, error: 'duplicate-field', field };
    }

    seenColumns.add(column);
    assignments.push(`${column} = ?`);
    values.push(value);
    changedColumns.push(column);
  }

  return { success: true, assignments, values, changedColumns };
}

export function hasRRuleAffectingColumns(changedColumns: string[]): boolean {
  return changedColumns.some((column) => RRULE_AFFECTING_COLUMNS.has(column));
}

export function getHabitString(
  props: Record<string, unknown>,
  camelKey: string,
  snakeKey: string,
): string | undefined {
  const value = props[camelKey] ?? props[snakeKey];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function getHabitNumber(
  props: Record<string, unknown>,
  camelKey: string,
  snakeKey: string,
): number | undefined {
  const value = props[camelKey] ?? props[snakeKey];
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

export function isSafeLocalDatabasePath(
  dbPath: string,
  localDbDir: string,
): boolean {
  if (!dbPath) {
    return false;
  }

  const resolvedPath = path.resolve(dbPath);
  const resolvedDirectory = path.resolve(localDbDir);

  return (
    path.dirname(resolvedPath) === resolvedDirectory &&
    path.extname(resolvedPath).toLowerCase() === '.db'
  );
}
