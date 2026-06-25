import { validateLocalDatabaseDeletionPath } from '../main/localDatabasePaths';

describe('validateLocalDatabaseDeletionPath', () => {
  const localDbDir = '/home/user/.config/ForNeed/local-databases';
  const currentDbPath = `${localDbDir}/active.db`;

  it('allows inactive .db files inside the local database directory', () => {
    expect(
      validateLocalDatabaseDeletionPath(
        `${localDbDir}/archive.db`,
        localDbDir,
        currentDbPath,
      ),
    ).toEqual({
      success: true,
      resolvedPath: `${localDbDir}/archive.db`,
    });
  });

  it('rejects paths outside the local database directory', () => {
    expect(
      validateLocalDatabaseDeletionPath(
        '/home/user/Documents/important.db',
        localDbDir,
        currentDbPath,
      ),
    ).toEqual({
      success: false,
      error: 'Database path is outside local database directory',
    });
  });

  it('rejects traversal out of the local database directory', () => {
    expect(
      validateLocalDatabaseDeletionPath(
        `${localDbDir}/../settings.json`,
        localDbDir,
        currentDbPath,
      ),
    ).toEqual({
      success: false,
      error: 'Database path is outside local database directory',
    });
  });

  it('rejects the active database', () => {
    expect(
      validateLocalDatabaseDeletionPath(
        currentDbPath,
        localDbDir,
        currentDbPath,
      ),
    ).toEqual({
      success: false,
      error: 'Cannot delete the active database',
    });
  });
});
