import path from 'path';
import {
  getLocalDatabaseDir,
  resolveLocalDatabaseFilePath,
} from '../main/localDatabasePaths';

describe('local database path helpers', () => {
  const userDataPath = path.join(path.sep, 'tmp', 'forneed-user-data');
  const localDbDir = getLocalDatabaseDir(userDataPath);

  it('allows .db files inside the local database directory', () => {
    const dbPath = path.join(localDbDir, 'work.db');

    expect(resolveLocalDatabaseFilePath(dbPath, localDbDir)).toBe(
      path.resolve(dbPath),
    );
  });

  it('rejects paths outside the local database directory', () => {
    const outsidePath = path.join(userDataPath, 'settings.json');

    expect(resolveLocalDatabaseFilePath(outsidePath, localDbDir)).toBeNull();
  });

  it('rejects path traversal outside the local database directory', () => {
    const traversalPath = path.join(localDbDir, '..', 'settings.json');

    expect(resolveLocalDatabaseFilePath(traversalPath, localDbDir)).toBeNull();
  });

  it('rejects non-database files inside the local database directory', () => {
    const textPath = path.join(localDbDir, 'notes.txt');

    expect(resolveLocalDatabaseFilePath(textPath, localDbDir)).toBeNull();
  });
});
