import path from 'path';

export type LocalDatabaseDeletionValidation =
  | { success: true; resolvedPath: string }
  | { success: false; error: string };

const isPathInsideDirectory = (directoryPath: string, candidatePath: string) => {
  const relativePath = path.relative(directoryPath, candidatePath);
  return relativePath !== '' && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
};

export const validateLocalDatabaseDeletionPath = (
  dbPath: string,
  localDatabaseDirectory: string,
  currentDatabasePath: string,
): LocalDatabaseDeletionValidation => {
  if (!dbPath || typeof dbPath !== 'string') {
    return { success: false, error: 'Invalid database path' };
  }

  const resolvedLocalDirectory = path.resolve(localDatabaseDirectory);
  const resolvedDbPath = path.resolve(dbPath);
  const resolvedCurrentDbPath = path.resolve(currentDatabasePath);

  if (!isPathInsideDirectory(resolvedLocalDirectory, resolvedDbPath)) {
    return { success: false, error: 'Database path is outside local database directory' };
  }

  if (path.extname(resolvedDbPath) !== '.db') {
    return { success: false, error: 'Only .db files can be deleted' };
  }

  if (resolvedDbPath === resolvedCurrentDbPath) {
    return { success: false, error: 'Cannot delete the active database' };
  }

  return { success: true, resolvedPath: resolvedDbPath };
};
