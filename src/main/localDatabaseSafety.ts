import fs from 'fs';
import path from 'path';

interface DeleteLocalDatabaseSuccess {
  success: true;
}

interface DeleteLocalDatabaseFailure {
  success: false;
  error: string;
}

export type DeleteLocalDatabaseResult =
  | DeleteLocalDatabaseSuccess
  | DeleteLocalDatabaseFailure;

interface SafeDeletePathSuccess {
  success: true;
  safePath: string;
}

interface SafeDeletePathFailure {
  success: false;
  error: string;
}

type SafeDeletePathResult = SafeDeletePathSuccess | SafeDeletePathFailure;

function normalizeForComparison(filePath: string): string {
  const resolvedPath = path.resolve(filePath);
  return process.platform === 'win32' ? resolvedPath.toLowerCase() : resolvedPath;
}

export function resolveSafeLocalDatabaseDeletePath(
  dbPath: string,
  localDbDir: string,
  currentDbPath?: string,
): SafeDeletePathResult {
  if (typeof dbPath !== 'string' || dbPath.trim() === '') {
    return { success: false, error: 'Invalid database path' };
  }

  const resolvedLocalDbDir = path.resolve(localDbDir);
  const resolvedDbPath = path.resolve(dbPath);
  const relativePath = path.relative(resolvedLocalDbDir, resolvedDbPath);

  if (
    relativePath === '' ||
    relativePath.startsWith('..') ||
    path.isAbsolute(relativePath)
  ) {
    return { success: false, error: 'Database path is outside local database directory' };
  }

  if (path.extname(resolvedDbPath).toLowerCase() !== '.db') {
    return { success: false, error: 'Only .db files can be deleted' };
  }

  if (
    currentDbPath &&
    normalizeForComparison(currentDbPath) === normalizeForComparison(resolvedDbPath)
  ) {
    return { success: false, error: 'Cannot delete the active database' };
  }

  return { success: true, safePath: resolvedDbPath };
}

export function deleteLocalDatabaseFile(
  dbPath: string,
  localDbDir: string,
  currentDbPath?: string,
): DeleteLocalDatabaseResult {
  const safePathResult = resolveSafeLocalDatabaseDeletePath(
    dbPath,
    localDbDir,
    currentDbPath,
  );

  if (!safePathResult.success) {
    return { success: false, error: safePathResult.error };
  }

  if (!fs.existsSync(safePathResult.safePath)) {
    return { success: false, error: 'File not found' };
  }

  if (!fs.statSync(safePathResult.safePath).isFile()) {
    return { success: false, error: 'Path is not a file' };
  }

  fs.unlinkSync(safePathResult.safePath);
  return { success: true };
}
