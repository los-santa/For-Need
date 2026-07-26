import fs from 'fs';
import path from 'path';

export interface DeleteLocalDatabaseOptions {
  localDbDir: string;
  activeDbPath: string;
}

export interface DeleteLocalDatabaseResult {
  success: boolean;
  error?: string;
}

function isInsideDirectory(parentDir: string, childPath: string): boolean {
  const relativePath = path.relative(parentDir, childPath);
  return (
    relativePath === '' ||
    (!relativePath.startsWith('..') && !path.isAbsolute(relativePath))
  );
}

function safeRealPath(filePath: string): string {
  try {
    return fs.realpathSync(filePath);
  } catch {
    return path.resolve(filePath);
  }
}

export function deleteLocalDatabaseFile(
  dbPath: string,
  options: DeleteLocalDatabaseOptions,
): DeleteLocalDatabaseResult {
  try {
    const localDbDir = path.resolve(options.localDbDir);
    const targetPath = path.resolve(dbPath);

    if (path.extname(targetPath) !== '.db') {
      return { success: false, error: 'Only .db files can be deleted' };
    }

    if (!fs.existsSync(targetPath)) {
      return { success: false, error: 'File not found' };
    }

    const targetStats = fs.lstatSync(targetPath);
    if (!targetStats.isFile()) {
      return { success: false, error: 'Only regular database files can be deleted' };
    }

    const realLocalDbDir = safeRealPath(localDbDir);
    const realTargetPath = fs.realpathSync(targetPath);

    if (!isInsideDirectory(realLocalDbDir, realTargetPath)) {
      return {
        success: false,
        error: 'Database file must be inside the local database directory',
      };
    }

    const realActiveDbPath = safeRealPath(options.activeDbPath);
    if (realTargetPath === realActiveDbPath) {
      return { success: false, error: 'Cannot delete the active database' };
    }

    fs.unlinkSync(targetPath);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete local database',
    };
  }
}
