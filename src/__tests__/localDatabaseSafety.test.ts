import fs from 'fs';
import os from 'os';
import path from 'path';
import { deleteLocalDatabaseFile } from '../main/localDatabaseSafety';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'forneed-local-db-'));
}

describe('deleteLocalDatabaseFile', () => {
  let tempDir: string;
  let localDbDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
    localDbDir = path.join(tempDir, 'local-databases');
    fs.mkdirSync(localDbDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('deletes an inactive .db file inside the managed local database directory', () => {
    const targetDb = path.join(localDbDir, 'archive.db');
    const activeDb = path.join(localDbDir, 'active.db');
    fs.writeFileSync(targetDb, 'archive');
    fs.writeFileSync(activeDb, 'active');

    const result = deleteLocalDatabaseFile(targetDb, {
      localDbDir,
      activeDbPath: activeDb,
    });

    expect(result).toEqual({ success: true });
    expect(fs.existsSync(targetDb)).toBe(false);
    expect(fs.existsSync(activeDb)).toBe(true);
  });

  it('rejects a database path outside the managed local database directory', () => {
    const outsideDb = path.join(tempDir, 'outside.db');
    const activeDb = path.join(localDbDir, 'active.db');
    fs.writeFileSync(outsideDb, 'outside');
    fs.writeFileSync(activeDb, 'active');

    const result = deleteLocalDatabaseFile(outsideDb, {
      localDbDir,
      activeDbPath: activeDb,
    });

    expect(result.success).toBe(false);
    expect(fs.existsSync(outsideDb)).toBe(true);
  });

  it('rejects deletion of the active database', () => {
    const activeDb = path.join(localDbDir, 'active.db');
    fs.writeFileSync(activeDb, 'active');

    const result = deleteLocalDatabaseFile(activeDb, {
      localDbDir,
      activeDbPath: activeDb,
    });

    expect(result.success).toBe(false);
    expect(fs.existsSync(activeDb)).toBe(true);
  });

  it('rejects non-database files inside the managed directory', () => {
    const textFile = path.join(localDbDir, 'notes.txt');
    const activeDb = path.join(localDbDir, 'active.db');
    fs.writeFileSync(textFile, 'notes');
    fs.writeFileSync(activeDb, 'active');

    const result = deleteLocalDatabaseFile(textFile, {
      localDbDir,
      activeDbPath: activeDb,
    });

    expect(result.success).toBe(false);
    expect(fs.existsSync(textFile)).toBe(true);
  });
});
