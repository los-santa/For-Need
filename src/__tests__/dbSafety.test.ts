import path from 'path';
import {
  isPathInsideDirectory,
  isSafeLocalDatabasePath,
  migrateCardsMissingTypeToTodoSql,
} from '../main/dbSafety';

describe('dbSafety', () => {
  describe('isPathInsideDirectory', () => {
    it('allows paths inside the target directory', () => {
      const localDbDir = path.join('/tmp', 'forneed', 'local-databases');

      expect(isPathInsideDirectory(path.join(localDbDir, 'work.db'), localDbDir)).toBe(true);
    });

    it('rejects traversal outside the target directory', () => {
      const localDbDir = path.join('/tmp', 'forneed', 'local-databases');

      expect(isPathInsideDirectory(path.join(localDbDir, '..', 'settings.db'), localDbDir)).toBe(false);
    });

    it('rejects sibling directories with the same prefix', () => {
      const localDbDir = path.join('/tmp', 'forneed', 'local-databases');
      const siblingDbPath = path.join('/tmp', 'forneed', 'local-databases-backup', 'work.db');

      expect(isPathInsideDirectory(siblingDbPath, localDbDir)).toBe(false);
    });
  });

  describe('isSafeLocalDatabasePath', () => {
    it('allows .db files within the local database directory', () => {
      const localDbDir = path.join('/tmp', 'forneed', 'local-databases');

      expect(isSafeLocalDatabasePath(path.join(localDbDir, 'work.db'), localDbDir)).toBe(true);
    });

    it('rejects non-database files inside the local database directory', () => {
      const localDbDir = path.join('/tmp', 'forneed', 'local-databases');

      expect(isSafeLocalDatabasePath(path.join(localDbDir, 'notes.txt'), localDbDir)).toBe(false);
    });
  });

  describe('migrateCardsMissingTypeToTodoSql', () => {
    it('does not overwrite cards that already have a valid non-todo cardtype', () => {
      expect(migrateCardsMissingTypeToTodoSql).toContain('cardtype IS NULL');
      expect(migrateCardsMissingTypeToTodoSql).toContain('NOT EXISTS');
      expect(migrateCardsMissingTypeToTodoSql).not.toContain('cardtype !=');
    });
  });
});
