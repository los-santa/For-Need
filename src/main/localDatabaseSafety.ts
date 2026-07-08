import fs from 'fs';
import path from 'path';

type DeleteLocalDatabaseSuccess = { success: true };
type DeleteLocalDatabaseFailure = { success: false; error: string };

export type DeleteLocalDatabaseResult =
  | DeleteLocalDatabaseSuccess
  | DeleteLocalDatabaseFailure;

export function getManagedLocalDatabaseDir(userDataPath: string): string {
  return path.join(userDataPath, 'local-databases');
}

function isInsideDirectory(filePath: string, directoryPath: string): boolean {
  const relativePath = path.relative(directoryPath, filePath);
  return (
    relativePath !== '' &&
    !relativePath.startsWith('..') &&
    !path.isAbsolute(relativePath)
  );
}

export function deleteLocalDatabaseFile(
  userDataPath: string,
  dbPath: string,
  activeDbPath?: string,
): DeleteLocalDatabaseResult {
  const localDbDir = path.resolve(getManagedLocalDatabaseDir(userDataPath));
  const requestedPath = path.resolve(dbPath);

  if (!isInsideDirectory(requestedPath, localDbDir)) {
    return { success: false, error: 'Can only delete managed local databases' };
  }

  if (path.extname(requestedPath).toLowerCase() !== '.db') {
    return { success: false, error: 'Can only delete .db files' };
  }

  if (activeDbPath && path.resolve(activeDbPath) === requestedPath) {
    return { success: false, error: 'Cannot delete the active database' };
  }

  if (!fs.existsSync(requestedPath)) {
    return { success: false, error: 'File not found' };
  }

  const stats = fs.statSync(requestedPath);
  if (!stats.isFile()) {
    return { success: false, error: 'Can only delete database files' };
  }

  fs.unlinkSync(requestedPath);
  return { success: true };
}
