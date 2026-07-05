import fs from 'fs';
import path from 'path';

export type DeleteLocalDatabaseResult =
  | { success: true }
  | { success: false; error: string };

interface DeleteLocalDatabaseOptions {
  activeDbPath: string;
  localDbDir: string;
}

function isInsideDirectory(filePath: string, directoryPath: string): boolean {
  const relative = path.relative(directoryPath, filePath);
  return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function normalizeExistingPath(filePath: string): string | null {
  try {
    return fs.realpathSync(filePath);
  } catch {
    return null;
  }
}

export function deleteLocalDatabaseFile(
  dbPath: string,
  options: DeleteLocalDatabaseOptions,
): DeleteLocalDatabaseResult {
  try {
    if (!dbPath || path.extname(dbPath).toLowerCase() !== '.db') {
      return { success: false, error: 'invalid-database-file' };
    }

    const localDbDir = normalizeExistingPath(options.localDbDir);
    if (!localDbDir) {
      return { success: false, error: 'File not found' };
    }

    const resolvedDbPath = path.resolve(dbPath);
    if (!fs.existsSync(resolvedDbPath)) {
      return { success: false, error: 'File not found' };
    }

    const fileStats = fs.lstatSync(resolvedDbPath);
    if (!fileStats.isFile()) {
      return { success: false, error: 'invalid-database-file' };
    }

    const realDbPath = fs.realpathSync(resolvedDbPath);
    if (!isInsideDirectory(realDbPath, localDbDir)) {
      return { success: false, error: 'invalid-database-file' };
    }

    const activeDbPath =
      normalizeExistingPath(options.activeDbPath) ?? path.resolve(options.activeDbPath);
    if (realDbPath === activeDbPath) {
      return { success: false, error: 'cannot-delete-active-database' };
    }

    fs.unlinkSync(resolvedDbPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to delete local database' };
  }
}
