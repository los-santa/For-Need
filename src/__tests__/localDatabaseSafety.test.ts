import fs from 'fs';
import os from 'os';
import path from 'path';
import { deleteLocalDatabaseFile } from '../main/localDatabaseSafety';

describe('deleteLocalDatabaseFile', () => {
  let tempRoot: string;
  let localDbDir: string;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'forneed-db-safety-'));
    localDbDir = path.join(tempRoot, 'local-databases');
    fs.mkdirSync(localDbDir);
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it('deletes an inactive .db file inside the local database directory', () => {
    const activeDbPath = path.join(localDbDir, 'active.db');
    const targetDbPath = path.join(localDbDir, 'archive.db');
    fs.writeFileSync(activeDbPath, 'active');
    fs.writeFileSync(targetDbPath, 'archive');

    const result = deleteLocalDatabaseFile(targetDbPath, {
      activeDbPath,
      localDbDir,
    });

    expect(result).toEqual({ success: true });
    expect(fs.existsSync(targetDbPath)).toBe(false);
    expect(fs.existsSync(activeDbPath)).toBe(true);
  });

  it('rejects paths outside the local database directory', () => {
    const activeDbPath = path.join(localDbDir, 'active.db');
    const outsideDbPath = path.join(tempRoot, 'outside.db');
    fs.writeFileSync(activeDbPath, 'active');
    fs.writeFileSync(outsideDbPath, 'outside');

    const result = deleteLocalDatabaseFile(outsideDbPath, {
      activeDbPath,
      localDbDir,
    });

    expect(result).toEqual({ success: false, error: 'invalid-database-file' });
    expect(fs.existsSync(outsideDbPath)).toBe(true);
  });

  it('rejects the currently active database file', () => {
    const activeDbPath = path.join(localDbDir, 'active.db');
    fs.writeFileSync(activeDbPath, 'active');

    const result = deleteLocalDatabaseFile(activeDbPath, {
      activeDbPath,
      localDbDir,
    });

    expect(result).toEqual({
      success: false,
      error: 'cannot-delete-active-database',
    });
    expect(fs.existsSync(activeDbPath)).toBe(true);
  });

  it('rejects non-db files inside the local database directory', () => {
    const activeDbPath = path.join(localDbDir, 'active.db');
    const textPath = path.join(localDbDir, 'notes.txt');
    fs.writeFileSync(activeDbPath, 'active');
    fs.writeFileSync(textPath, 'notes');

    const result = deleteLocalDatabaseFile(textPath, {
      activeDbPath,
      localDbDir,
    });

    expect(result).toEqual({ success: false, error: 'invalid-database-file' });
    expect(fs.existsSync(textPath)).toBe(true);
  });

  it('rejects symlinks that point outside the local database directory', () => {
    const activeDbPath = path.join(localDbDir, 'active.db');
    const outsideDbPath = path.join(tempRoot, 'outside.db');
    const symlinkPath = path.join(localDbDir, 'linked.db');
    fs.writeFileSync(activeDbPath, 'active');
    fs.writeFileSync(outsideDbPath, 'outside');
    fs.symlinkSync(outsideDbPath, symlinkPath);

    const result = deleteLocalDatabaseFile(symlinkPath, {
      activeDbPath,
      localDbDir,
    });

    expect(result).toEqual({ success: false, error: 'invalid-database-file' });
    expect(fs.existsSync(outsideDbPath)).toBe(true);
    expect(fs.existsSync(symlinkPath)).toBe(true);
  });
});
