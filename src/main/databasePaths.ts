import path from 'path';

function normalizeForPlatform(filePath: string): string {
  const resolved = path.resolve(filePath);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

export function isPathInsideDirectory(filePath: string, directoryPath: string): boolean {
  const normalizedFilePath = normalizeForPlatform(filePath);
  const normalizedDirectoryPath = normalizeForPlatform(directoryPath);
  const relativePath = path.relative(normalizedDirectoryPath, normalizedFilePath);

  return (
    relativePath.length > 0 &&
    !relativePath.startsWith('..') &&
    !path.isAbsolute(relativePath)
  );
}

export function isSamePath(firstPath: string, secondPath: string): boolean {
  return normalizeForPlatform(firstPath) === normalizeForPlatform(secondPath);
}

export function validateLocalDatabaseDeletePath(
  dbPath: string,
  localDbDir: string,
  activeDbPath?: string,
): { valid: true } | { valid: false; error: string } {
  if (!dbPath || path.extname(dbPath).toLowerCase() !== '.db') {
    return { valid: false, error: 'Only .db files can be deleted' };
  }

  if (!isPathInsideDirectory(dbPath, localDbDir)) {
    return { valid: false, error: 'Database is outside the local database folder' };
  }

  if (activeDbPath && isSamePath(dbPath, activeDbPath)) {
    return { valid: false, error: 'Cannot delete the active database' };
  }

  return { valid: true };
}
