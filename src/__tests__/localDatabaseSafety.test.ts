import fs from 'fs';
import os from 'os';
import path from 'path';
import { deleteLocalDatabaseFile } from '../main/localDatabaseSafety';

describe('deleteLocalDatabaseFile', () => {
  let tempDir: string;
  let localDbDir: string;
  let activeDbPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forneed-db-safety-'));
    localDbDir = path.join(tempDir, 'local-databases');
    fs.mkdirSync(localDbDir);
    activeDbPath = path.join(localDbDir, 'active.db');
    fs.writeFileSync(activeDbPath, 'active');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('deletes an inactive db file inside the local database directory', () => {
    const staleDbPath = path.join(localDbDir, 'stale.db');
    fs.writeFileSync(staleDbPath, 'stale');

    const result = deleteLocalDatabaseFile(
      staleDbPath,
      localDbDir,
      activeDbPath,
    );

    expect(result).toEqual({ success: true });
    expect(fs.existsSync(staleDbPath)).toBe(false);
  });

  it('rejects paths outside the local database directory', () => {
    const outsideDbPath = path.join(tempDir, 'outside.db');
    fs.writeFileSync(outsideDbPath, 'outside');

    const result = deleteLocalDatabaseFile(
      outsideDbPath,
      localDbDir,
      activeDbPath,
    );

    expect(result).toEqual({ success: false, error: 'Invalid database path' });
    expect(fs.existsSync(outsideDbPath)).toBe(true);
  });

  it('rejects the active database', () => {
    const result = deleteLocalDatabaseFile(
      activeDbPath,
      localDbDir,
      activeDbPath,
    );

    expect(result).toEqual({
      success: false,
      error: 'Cannot delete active database',
    });
    expect(fs.existsSync(activeDbPath)).toBe(true);
  });

  it('rejects non-db files and directories', () => {
    const textPath = path.join(localDbDir, 'notes.txt');
    const nestedDirPath = path.join(localDbDir, 'nested.db');
    fs.writeFileSync(textPath, 'notes');
    fs.mkdirSync(nestedDirPath);

    expect(deleteLocalDatabaseFile(textPath, localDbDir, activeDbPath)).toEqual({
      success: false,
      error: 'Invalid database file',
    });
    expect(
      deleteLocalDatabaseFile(nestedDirPath, localDbDir, activeDbPath),
    ).toEqual({
      success: false,
      error: 'Invalid database file',
    });
    expect(fs.existsSync(textPath)).toBe(true);
    expect(fs.existsSync(nestedDirPath)).toBe(true);
  });
});
