import path from 'path';
import {
  isDeletableLocalDatabasePath,
  isPathInsideDirectory,
} from '../main/localDatabaseSafety';

describe('local database deletion safety', () => {
  const localDbDir = path.join('/tmp', 'forneed-user-data', 'local-databases');
  const inactiveDb = path.join(localDbDir, 'archive.db');
  const currentDb = path.join(localDbDir, 'current.db');

  it('allows deleting inactive .db files inside the managed local database directory', () => {
    expect(
      isDeletableLocalDatabasePath(inactiveDb, localDbDir, currentDb),
    ).toBe(true);
  });

  it('rejects the currently selected database', () => {
    expect(
      isDeletableLocalDatabasePath(currentDb, localDbDir, currentDb),
    ).toBe(false);
  });

  it('rejects paths outside the managed local database directory', () => {
    const outsideDb = path.join('/tmp', 'forneed-user-data', 'important.db');

    expect(
      isDeletableLocalDatabasePath(outsideDb, localDbDir, currentDb),
    ).toBe(false);
    expect(isPathInsideDirectory(outsideDb, localDbDir)).toBe(false);
  });

  it('rejects non-database files and the directory itself', () => {
    expect(
      isDeletableLocalDatabasePath(
        path.join(localDbDir, 'notes.txt'),
        localDbDir,
        currentDb,
      ),
    ).toBe(false);
    expect(isPathInsideDirectory(localDbDir, localDbDir)).toBe(false);
  });
});
