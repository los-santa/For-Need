import path from 'path';
import {
  buildHabitUpdatePlan,
  getHabitNumber,
  getHabitString,
  hasRRuleAffectingColumns,
  isSafeLocalDatabasePath,
} from '../safetyUtils';

describe('safetyUtils', () => {
  describe('buildHabitUpdatePlan', () => {
    it('maps habit API fields to allowlisted database columns', () => {
      const plan = buildHabitUpdatePlan({
        dtstartLocal: '2026-06-15T09:00:00',
        rrule: 'FREQ=DAILY',
        durationMinutes: 30,
        notes: undefined,
      });

      expect(plan).toEqual({
        success: true,
        assignments: ['dtstart_local = ?', 'rrule = ?', 'duration_minutes = ?'],
        values: ['2026-06-15T09:00:00', 'FREQ=DAILY', 30],
        changedColumns: ['dtstart_local', 'rrule', 'duration_minutes'],
      });
    });

    it('rejects unknown fields before they can be interpolated into SQL', () => {
      const plan = buildHabitUpdatePlan({
        'rrule = ?; DROP TABLE CARDS; --': 'FREQ=DAILY',
      });

      expect(plan).toEqual({
        success: false,
        error: 'field-not-allowed',
        field: 'rrule = ?; DROP TABLE CARDS; --',
      });
    });

    it('rejects duplicate camelCase and snake_case aliases', () => {
      const plan = buildHabitUpdatePlan({
        dtstartLocal: '2026-06-15T09:00:00',
        dtstart_local: '2026-06-16T09:00:00',
      });

      expect(plan).toEqual({
        success: false,
        error: 'duplicate-field',
        field: 'dtstart_local',
      });
    });
  });

  it('identifies habit updates that require cache regeneration', () => {
    expect(hasRRuleAffectingColumns(['unit_label', 'duration_minutes'])).toBe(
      true,
    );
    expect(hasRRuleAffectingColumns(['unit_label', 'status'])).toBe(false);
  });

  it('reads habit properties from either API or database row casing', () => {
    const dbRow = {
      dtstart_local: '2026-06-15T09:00:00',
      duration_minutes: 45,
    };

    expect(getHabitString(dbRow, 'dtstartLocal', 'dtstart_local')).toBe(
      '2026-06-15T09:00:00',
    );
    expect(getHabitNumber(dbRow, 'durationMinutes', 'duration_minutes')).toBe(
      45,
    );
  });

  describe('isSafeLocalDatabasePath', () => {
    const localDbDir = path.resolve('/tmp/ForNeed/local-databases');

    it('allows direct .db files inside the local database directory', () => {
      expect(
        isSafeLocalDatabasePath(path.join(localDbDir, 'work.db'), localDbDir),
      ).toBe(true);
    });

    it('rejects traversal, nested paths, and non-database files', () => {
      expect(
        isSafeLocalDatabasePath(
          path.join(localDbDir, '..', 'settings.db'),
          localDbDir,
        ),
      ).toBe(false);
      expect(
        isSafeLocalDatabasePath(
          path.join(localDbDir, 'nested', 'work.db'),
          localDbDir,
        ),
      ).toBe(false);
      expect(
        isSafeLocalDatabasePath(
          path.join(localDbDir, 'work.sqlite'),
          localDbDir,
        ),
      ).toBe(false);
    });
  });
});
