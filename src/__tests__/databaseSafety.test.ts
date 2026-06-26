import path from 'path';
import { checkLocalDatabaseDeletion } from '../main/databaseSafety';

describe('checkLocalDatabaseDeletion', () => {
  const localDbDir = path.join('/tmp', 'ForNeed', 'local-databases');
  const activeDbPath = path.join(localDbDir, 'active.db');
  const configuredDbPath = path.join(localDbDir, 'configured.db');

  it('allows deleting an inactive .db file inside the local database directory', () => {
    const result = checkLocalDatabaseDeletion({
      dbPath: path.join(localDbDir, 'archive.db'),
      localDbDir,
      activeDbPath,
      configuredDbPath,
    });

    expect(result).toEqual({
      allowed: true,
      resolvedDbPath: path.join(localDbDir, 'archive.db'),
    });
  });

  it('blocks paths outside the local database directory', () => {
    const result = checkLocalDatabaseDeletion({
      dbPath: path.join('/tmp', 'outside.db'),
      localDbDir,
      activeDbPath,
      configuredDbPath,
    });

    expect(result.allowed).toBe(false);
    expect(result.error).toBe('Invalid local database path');
  });

  it('blocks deleting the active database connection path', () => {
    const result = checkLocalDatabaseDeletion({
      dbPath: activeDbPath,
      localDbDir,
      activeDbPath,
      configuredDbPath,
    });

    expect(result.allowed).toBe(false);
    expect(result.error).toBe('Cannot delete the active database');
  });

  it('blocks deleting the configured database path', () => {
    const result = checkLocalDatabaseDeletion({
      dbPath: configuredDbPath,
      localDbDir,
      activeDbPath,
      configuredDbPath,
    });

    expect(result.allowed).toBe(false);
    expect(result.error).toBe('Cannot delete the active database');
  });
});
