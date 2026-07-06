import fs from 'fs';
import path from 'path';

type DeleteLocalDatabaseSuccess = {
  success: true;
};

type DeleteLocalDatabaseFailure = {
  success: false;
  error: string;
};

export type DeleteLocalDatabaseResult =
  | DeleteLocalDatabaseSuccess
  | DeleteLocalDatabaseFailure;

function isPathInside(parentDir: string, childPath: string): boolean {
  const relative = path.relative(parentDir, childPath);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function resolveExistingPath(filePath: string): string {
  try {
    return fs.realpathSync(filePath);
  } catch {
    return path.resolve(filePath);
  }
}

export function deleteLocalDatabaseFile(
  dbPath: string,
  localDbDir: string,
  activeDbPath: string,
): DeleteLocalDatabaseResult {
  const localDbRoot = path.resolve(localDbDir);
  const targetPath = path.resolve(dbPath);

  if (!isPathInside(localDbRoot, targetPath)) {
    return { success: false, error: 'Invalid database path' };
  }

  if (path.extname(targetPath) !== '.db') {
    return { success: false, error: 'Invalid database file' };
  }

  if (!fs.existsSync(targetPath)) {
    return { success: false, error: 'File not found' };
  }

  const targetStats = fs.lstatSync(targetPath);
  if (!targetStats.isFile()) {
    return { success: false, error: 'Invalid database file' };
  }

  const activePath = path.resolve(activeDbPath);
  if (
    targetPath === activePath ||
    resolveExistingPath(targetPath) === resolveExistingPath(activePath)
  ) {
    return { success: false, error: 'Cannot delete active database' };
  }

  fs.unlinkSync(targetPath);
  return { success: true };
}
