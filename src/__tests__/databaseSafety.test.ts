import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  resolveSafeLocalDatabaseDeletion,
  validateDatabasePathForChange,
} from '../main/databaseSafety';

describe('database safety guards', () => {
  let tempDir: string;
  let localDbDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forneed-db-safety-'));
    localDbDir = path.join(tempDir, 'local-databases');
    fs.mkdirSync(localDbDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('rejects deleting database paths outside the local database directory', () => {
    const outsideDbPath = path.join(tempDir, 'outside.db');
    fs.writeFileSync(outsideDbPath, 'not important');

    const result = resolveSafeLocalDatabaseDeletion(
      outsideDbPath,
      path.join(localDbDir, 'current.db'),
      localDbDir,
    );

    expect(result.valid).toBe(false);
    expect(result.error).toContain('로컬 DB 폴더');
  });

  it('rejects deleting the database currently configured for the app', () => {
    const activeDbPath = path.join(localDbDir, 'active.db');
    fs.writeFileSync(activeDbPath, 'active');

    const result = resolveSafeLocalDatabaseDeletion(
      activeDbPath,
      activeDbPath,
      localDbDir,
    );

    expect(result.valid).toBe(false);
    expect(result.error).toContain('현재 사용 중');
  });

  it('allows deleting an inactive .db file inside the local database directory', () => {
    const activeDbPath = path.join(localDbDir, 'active.db');
    const inactiveDbPath = path.join(localDbDir, 'inactive.db');
    fs.writeFileSync(activeDbPath, 'active');
    fs.writeFileSync(inactiveDbPath, 'inactive');

    const result = resolveSafeLocalDatabaseDeletion(
      inactiveDbPath,
      activeDbPath,
      localDbDir,
    );

    expect(result.valid).toBe(true);
    expect(result.resolvedPath).toBe(fs.realpathSync(inactiveDbPath));
  });

  it('separates new database creation from opening existing database files', () => {
    const newDbPath = path.join(tempDir, 'new.db');

    expect(validateDatabasePathForChange(newDbPath, 'create').valid).toBe(true);
    expect(validateDatabasePathForChange(newDbPath, 'open').valid).toBe(false);
  });
});
