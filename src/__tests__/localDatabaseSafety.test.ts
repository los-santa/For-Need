import fs from 'fs';
import os from 'os';
import path from 'path';
import { deleteLocalDatabaseFile } from '../main/localDatabaseSafety';

describe('deleteLocalDatabaseFile', () => {
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

    const result = deleteLocalDatabaseFile(dbPath, { localDbDir });

    expect(result).toEqual({ success: true });
    expect(fs.existsSync(dbPath)).toBe(false);
  });

  it('rejects paths outside the local database directory', () => {
    const outsideDbPath = path.join(tempDir, 'outside.db');
    fs.writeFileSync(outsideDbPath, 'important data');

    const result = deleteLocalDatabaseFile(outsideDbPath, { localDbDir });

    expect(result.success).toBe(false);
    expect(fs.existsSync(outsideDbPath)).toBe(true);
  });

  it('rejects the active database even when it is local', () => {
    const activeDbPath = path.join(localDbDir, 'active.db');
    fs.writeFileSync(activeDbPath, 'active data');

    const result = deleteLocalDatabaseFile(activeDbPath, {
      localDbDir,
      currentDbPath: activeDbPath,
    });

    expect(result.success).toBe(false);
    expect(fs.existsSync(activeDbPath)).toBe(true);
  });

  it('rejects non-.db files inside the local database directory', () => {
    const textPath = path.join(localDbDir, 'notes.txt');
    fs.writeFileSync(textPath, 'not a database');

    const result = deleteLocalDatabaseFile(textPath, { localDbDir });

    expect(result.success).toBe(false);
    expect(fs.existsSync(textPath)).toBe(true);
  });
});
