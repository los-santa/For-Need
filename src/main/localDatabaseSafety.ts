import fs from 'fs';
import path from 'path';

type FileSystem = Pick<
  typeof fs,
  'existsSync' | 'realpathSync' | 'statSync' | 'unlinkSync'
>;

export interface DeleteLocalDatabaseOptions {
  localDbDir: string;
  activeDbPath: string;
  fsModule?: FileSystem;
}

export interface DeleteLocalDatabaseResult {
  success: boolean;
  error?: string;
}

function isPathInside(parentPath: string, childPath: string): boolean {
  const relativePath = path.relative(parentPath, childPath);
  return (
    relativePath.length > 0 &&
    !relativePath.startsWith('..') &&
    !path.isAbsolute(relativePath)
  );
}

function resolveExistingPath(fsModule: FileSystem, filePath: string): string {
  return fsModule.realpathSync(filePath);
}

export function deleteLocalDatabaseFile(
  dbPath: string,
  options: DeleteLocalDatabaseOptions,
): DeleteLocalDatabaseResult {
  const fsModule = options.fsModule ?? fs;

  try {
    if (typeof dbPath !== 'string' || dbPath.trim() === '') {
      return { success: false, error: 'Invalid database path' };
    }

    if (!fsModule.existsSync(dbPath)) {
      return { success: false, error: 'File not found' };
    }

    if (!fsModule.existsSync(options.localDbDir)) {
      return { success: false, error: 'Local database directory not found' };
    }

    const localDbDir = resolveExistingPath(fsModule, options.localDbDir);
    const targetPath = resolveExistingPath(fsModule, dbPath);

    if (!isPathInside(localDbDir, targetPath)) {
      return { success: false, error: 'Database is outside the local database directory' };
    }

    if (path.extname(targetPath).toLowerCase() !== '.db') {
      return { success: false, error: 'Only .db files can be deleted' };
    }

    if (!fsModule.statSync(targetPath).isFile()) {
      return { success: false, error: 'Database path is not a file' };
    }

    const activeDbPath = fsModule.existsSync(options.activeDbPath)
      ? resolveExistingPath(fsModule, options.activeDbPath)
      : path.resolve(options.activeDbPath);

    if (targetPath === activeDbPath) {
      return { success: false, error: 'Cannot delete the active database' };
    }

    fsModule.unlinkSync(targetPath);
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to delete local database' };
  }
}
