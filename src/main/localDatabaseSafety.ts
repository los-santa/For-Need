import path from 'path';

export function isPathInsideDirectory(
  candidatePath: string,
  directoryPath: string,
): boolean {
  const relativePath = path.relative(
    path.resolve(directoryPath),
    path.resolve(candidatePath),
  );

  return (
    relativePath !== '' &&
    !relativePath.startsWith('..') &&
    !path.isAbsolute(relativePath)
  );
}

export function isDeletableLocalDatabasePath(
  dbPath: string,
  localDbDir: string,
  currentDbPath: string,
): boolean {
  const resolvedDbPath = path.resolve(dbPath);

  return (
    path.extname(resolvedDbPath).toLowerCase() === '.db' &&
    isPathInsideDirectory(resolvedDbPath, localDbDir) &&
    resolvedDbPath !== path.resolve(currentDbPath)
  );
}
