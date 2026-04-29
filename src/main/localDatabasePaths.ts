import path from 'path';

export function getLocalDatabaseDir(userDataPath: string): string {
  return path.resolve(userDataPath, 'local-databases');
}

function isWithinDirectory(filePath: string, directoryPath: string): boolean {
  const relativePath = path.relative(directoryPath, filePath);
  return (
    relativePath === '' ||
    (relativePath !== '' &&
      !relativePath.startsWith('..') &&
      !path.isAbsolute(relativePath))
  );
}

export function resolveLocalDatabaseFilePath(
  dbPath: string,
  localDbDir: string,
): string | null {
  const resolvedLocalDbDir = path.resolve(localDbDir);
  const resolvedDbPath = path.resolve(dbPath);

  if (!isWithinDirectory(resolvedDbPath, resolvedLocalDbDir)) {
    return null;
  }

  if (path.extname(resolvedDbPath) !== '.db') {
    return null;
  }

  return resolvedDbPath;
}
