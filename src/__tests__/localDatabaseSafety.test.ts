import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  deleteLocalDatabaseFile,
  getManagedLocalDatabaseDir,
} from '../main/localDatabaseSafety';

describe('deleteLocalDatabaseFile', () => {
  let tempRoot: string;
  let userDataPath: string;
  let managedDbDir: string;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'forneed-db-delete-'));
    userDataPath = path.join(tempRoot, 'user-data');
    managedDbDir = getManagedLocalDatabaseDir(userDataPath);
    fs.mkdirSync(managedDbDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it('deletes an inactive managed .db file', () => {
    const dbPath = path.join(managedDbDir, 'archive.db');
    fs.writeFileSync(dbPath, 'sqlite');

    expect(
      deleteLocalDatabaseFile(userDataPath, dbPath, path.join(managedDbDir, 'active.db')),
    ).toEqual({ success: true });
    expect(fs.existsSync(dbPath)).toBe(false);
  });

  it('rejects paths outside the managed local database directory', () => {
    const outsidePath = path.join(tempRoot, 'outside.db');
    fs.writeFileSync(outsidePath, 'sqlite');

    expect(deleteLocalDatabaseFile(userDataPath, outsidePath)).toEqual({
      success: false,
      error: 'Can only delete managed local databases',
    });
    expect(fs.existsSync(outsidePath)).toBe(true);
  });

  it('rejects the active database path', () => {
    const activeDbPath = path.join(managedDbDir, 'active.db');
    fs.writeFileSync(activeDbPath, 'sqlite');

    expect(deleteLocalDatabaseFile(userDataPath, activeDbPath, activeDbPath)).toEqual({
      success: false,
      error: 'Cannot delete the active database',
    });
    expect(fs.existsSync(activeDbPath)).toBe(true);
  });

  it('rejects non-db files inside the managed directory', () => {
    const textPath = path.join(managedDbDir, 'notes.txt');
    fs.writeFileSync(textPath, 'not a database');

    expect(deleteLocalDatabaseFile(userDataPath, textPath)).toEqual({
      success: false,
      error: 'Can only delete .db files',
    });
    expect(fs.existsSync(textPath)).toBe(true);
  });
});
