import fs from 'fs';
import path from 'path';

export type DeleteLocalDatabaseResult =
  | { success: true }
  | { success: false; error: string };

type DeleteLocalDatabaseOptions = {
  localDbDir: string;
  currentDbPath?: string;
};

function isPathInsideDirectory(filePath: string, directory: string): boolean {
  const relativePath = path.relative(directory, filePath);
  return (
    relativePath === '' ||
    (!relativePath.startsWith('..') && !path.isAbsolute(relativePath))
  );
}

export function deleteLocalDatabaseFile(
  dbPath: string,
  options: DeleteLocalDatabaseOptions,
): DeleteLocalDatabaseResult {
  const resolvedDbPath = path.resolve(dbPath);
  const resolvedLocalDbDir = path.resolve(options.localDbDir);

  if (!isPathInsideDirectory(resolvedDbPath, resolvedLocalDbDir)) {
    return { success: false, error: 'Only local database files can be deleted' };
  }

  if (path.extname(resolvedDbPath).toLowerCase() !== '.db') {
    return { success: false, error: 'Only .db files can be deleted' };
  }

  if (
    options.currentDbPath &&
    path.resolve(options.currentDbPath) === resolvedDbPath
  ) {
    return { success: false, error: 'The active database cannot be deleted' };
  }

  if (!fs.existsSync(resolvedDbPath)) {
    return { success: false, error: 'File not found' };
  }

  if (!fs.lstatSync(resolvedDbPath).isFile()) {
    return { success: false, error: 'Only database files can be deleted' };
  }

  fs.unlinkSync(resolvedDbPath);
  return { success: true };
}
