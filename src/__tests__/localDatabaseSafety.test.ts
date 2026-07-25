import fs from 'fs';
import os from 'os';
import path from 'path';
import { deleteLocalDatabaseFile } from '../main/localDatabaseSafety';

describe('deleteLocalDatabaseFile', () => {
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

  it('deletes inactive database files inside the managed local database directory', () => {
    const activeDbPath = path.join(localDbDir, 'active.db');
    const oldDbPath = path.join(localDbDir, 'old.db');
    fs.writeFileSync(activeDbPath, 'active');
    fs.writeFileSync(oldDbPath, 'old');

    const result = deleteLocalDatabaseFile(oldDbPath, {
      localDbDir,
      activeDbPath,
    });

    expect(result).toEqual({ success: true });
    expect(fs.existsSync(oldDbPath)).toBe(false);
    expect(fs.existsSync(activeDbPath)).toBe(true);
  });

  it('refuses to delete the active database', () => {
    const activeDbPath = path.join(localDbDir, 'active.db');
    fs.writeFileSync(activeDbPath, 'active');

    const result = deleteLocalDatabaseFile(activeDbPath, {
      localDbDir,
      activeDbPath,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Cannot delete the active database');
    expect(fs.existsSync(activeDbPath)).toBe(true);
  });

  it('refuses to delete files outside the managed local database directory', () => {
    const activeDbPath = path.join(localDbDir, 'active.db');
    const outsideDbPath = path.join(tempDir, 'outside.db');
    fs.writeFileSync(activeDbPath, 'active');
    fs.writeFileSync(outsideDbPath, 'outside');

    const result = deleteLocalDatabaseFile(outsideDbPath, {
      localDbDir,
      activeDbPath,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      'Database file must be inside the local database directory',
    );
    expect(fs.existsSync(outsideDbPath)).toBe(true);
  });
});
