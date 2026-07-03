import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  deleteLocalDatabaseFile,
  resolveSafeLocalDatabaseDeletePath,
} from '../main/localDatabaseSafety';

describe('local database deletion safety', () => {
  let tempDir: string;
  let localDbDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forneed-db-test-'));
    localDbDir = path.join(tempDir, 'local-databases');
    fs.mkdirSync(localDbDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('deletes a .db file inside the local database directory', () => {
    const dbPath = path.join(localDbDir, 'archive.db');
    fs.writeFileSync(dbPath, 'sqlite data');

    const result = deleteLocalDatabaseFile(dbPath, localDbDir);

    expect(result).toEqual({ success: true });
    expect(fs.existsSync(dbPath)).toBe(false);
  });

  it('rejects files outside the local database directory', () => {
    const outsideDbPath = path.join(tempDir, 'outside.db');
    fs.writeFileSync(outsideDbPath, 'do not delete');

    const result = deleteLocalDatabaseFile(outsideDbPath, localDbDir);

    expect(result.success).toBe(false);
    expect(fs.existsSync(outsideDbPath)).toBe(true);
  });

  it('rejects path traversal outside the local database directory', () => {
    const traversalPath = path.join(localDbDir, '..', 'outside.db');

    const result = resolveSafeLocalDatabaseDeletePath(
      traversalPath,
      localDbDir,
    );

    expect(result.success).toBe(false);
  });

  it('rejects non-database files inside the local database directory', () => {
    const textPath = path.join(localDbDir, 'notes.txt');
    fs.writeFileSync(textPath, 'do not delete');

    const result = deleteLocalDatabaseFile(textPath, localDbDir);

    expect(result.success).toBe(false);
    expect(fs.existsSync(textPath)).toBe(true);
  });

  it('rejects the active database even when it is a local database file', () => {
    const activeDbPath = path.join(localDbDir, 'current.db');
    fs.writeFileSync(activeDbPath, 'active db');

    const result = deleteLocalDatabaseFile(
      activeDbPath,
      localDbDir,
      activeDbPath,
    );

    expect(result.success).toBe(false);
    expect(fs.existsSync(activeDbPath)).toBe(true);
  });
});
