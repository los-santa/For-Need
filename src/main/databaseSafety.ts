import path from 'path';

export interface LocalDatabaseDeleteCheckInput {
  dbPath: string;
  localDbDir: string;
  activeDbPath: string;
  configuredDbPath: string;
}

export interface LocalDatabaseDeleteCheckResult {
  allowed: boolean;
  resolvedDbPath: string;
  error?: string;
}

function isPathInsideDirectory(filePath: string, directoryPath: string): boolean {
  const relativePath = path.relative(
    path.resolve(directoryPath),
    path.resolve(filePath),
  );

  return (
    relativePath !== '' &&
    !relativePath.startsWith('..') &&
    !path.isAbsolute(relativePath)
  );
}

export function checkLocalDatabaseDeletion({
  dbPath,
  localDbDir,
  activeDbPath,
  configuredDbPath,
}: LocalDatabaseDeleteCheckInput): LocalDatabaseDeleteCheckResult {
  const resolvedDbPath = path.resolve(dbPath);

  if (
    !isPathInsideDirectory(resolvedDbPath, localDbDir) ||
    path.extname(resolvedDbPath) !== '.db'
  ) {
    return {
      allowed: false,
      resolvedDbPath,
      error: 'Invalid local database path',
    };
  }

  if (
    resolvedDbPath === path.resolve(activeDbPath) ||
    resolvedDbPath === path.resolve(configuredDbPath)
  ) {
    return {
      allowed: false,
      resolvedDbPath,
      error: 'Cannot delete the active database',
    };
  }

  return { allowed: true, resolvedDbPath };
}
