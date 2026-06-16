import fs from 'fs';
import path from 'path';

export type DatabasePathMode = 'open' | 'create';

const SQLITE_HEADER = Buffer.from('SQLite format 3\0', 'utf8');
const FORNEED_TABLE_NAMES = new Set([
  'CARDTYPES',
  'CARDS',
  'RELATIONTYPE',
  'RELATIONS',
  'PROJECTS',
]);

type ValidationResult = {
  valid: boolean;
  path?: string;
  error?: string;
};

type DeleteValidationResult = ValidationResult & {
  resolvedPath?: string;
};

export function getLocalDatabaseDir(userDataPath: string): string {
  return path.join(userDataPath, 'local-databases');
}

function isDbExtension(filePath: string): boolean {
  return path.extname(filePath).toLowerCase() === '.db';
}

function isInsideDirectory(parentDir: string, childPath: string): boolean {
  const relativePath = path.relative(parentDir, childPath);
  return (
    relativePath.length > 0 &&
    !relativePath.startsWith('..') &&
    !path.isAbsolute(relativePath)
  );
}

function inspectExistingSqliteDatabase(dbPath: string): ValidationResult {
  const header = Buffer.alloc(SQLITE_HEADER.length);
  const fd = fs.openSync(dbPath, 'r');

  try {
    fs.readSync(fd, header, 0, SQLITE_HEADER.length, 0);
  } finally {
    fs.closeSync(fd);
  }

  if (!header.equals(SQLITE_HEADER)) {
    return {
      valid: false,
      error: '선택한 파일은 SQLite 데이터베이스가 아닙니다.',
    };
  }

  try {
    // better-sqlite3 is resolved from release/app at runtime in this Electron app.
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    const SqliteDatabase = require('better-sqlite3');
    const database = new SqliteDatabase(dbPath, {
      readonly: true,
      fileMustExist: true,
    });

    try {
      const quickCheck = database.prepare('PRAGMA quick_check').pluck().get();
      if (quickCheck !== 'ok') {
        return {
          valid: false,
          error: '선택한 데이터베이스가 손상되어 열 수 없습니다.',
        };
      }

      const tableNames = database
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
        )
        .pluck()
        .all() as string[];

      const hasForNeedSchema = tableNames.some((name) =>
        FORNEED_TABLE_NAMES.has(name),
      );

      if (!hasForNeedSchema) {
        return {
          valid: false,
          error: '선택한 파일은 ForNeed 데이터베이스가 아닙니다.',
        };
      }
    } finally {
      database.close();
    }
  } catch {
    return {
      valid: false,
      error: '선택한 데이터베이스를 검증할 수 없습니다.',
    };
  }

  return { valid: true, path: dbPath };
}

export function validateDatabasePathForChange(
  dbPath: string,
  mode: DatabasePathMode = 'open',
): ValidationResult {
  const databaseMode = mode === 'create' ? 'create' : 'open';

  if (typeof dbPath !== 'string' || dbPath.trim().length === 0) {
    return { valid: false, error: 'DB 경로가 비어 있습니다.' };
  }

  const normalizedPath = path.resolve(dbPath);

  if (!isDbExtension(normalizedPath)) {
    return { valid: false, error: 'DB 파일은 .db 확장자여야 합니다.' };
  }

  const parentDir = path.dirname(normalizedPath);
  if (!fs.existsSync(parentDir)) {
    if (databaseMode === 'open') {
      return {
        valid: false,
        error: '선택한 DB 파일의 폴더가 존재하지 않습니다.',
      };
    }

    return { valid: true, path: normalizedPath };
  }

  const parentStats = fs.statSync(parentDir);
  if (!parentStats.isDirectory()) {
    return {
      valid: false,
      error: '선택한 DB 경로의 상위 경로가 폴더가 아닙니다.',
    };
  }

  if (!fs.existsSync(normalizedPath)) {
    if (databaseMode === 'open') {
      return { valid: false, error: '선택한 DB 파일이 존재하지 않습니다.' };
    }

    return { valid: true, path: normalizedPath };
  }

  const stats = fs.statSync(normalizedPath);
  if (!stats.isFile()) {
    return { valid: false, error: '선택한 DB 경로가 파일이 아닙니다.' };
  }

  if (stats.size === 0) {
    if (databaseMode === 'open') {
      return {
        valid: false,
        error: '빈 파일은 기존 DB로 선택할 수 없습니다. 새 DB 생성 기능을 사용해주세요.',
      };
    }

    return { valid: true, path: normalizedPath };
  }

  return inspectExistingSqliteDatabase(normalizedPath);
}

export function validateDatabasePathForStartup(
  dbPath: string,
): ValidationResult {
  if (typeof dbPath !== 'string' || dbPath.trim().length === 0) {
    return { valid: false, error: 'DB 경로가 비어 있습니다.' };
  }

  const normalizedPath = path.resolve(dbPath);

  if (!isDbExtension(normalizedPath)) {
    return { valid: false, error: 'DB 파일은 .db 확장자여야 합니다.' };
  }

  if (!fs.existsSync(normalizedPath)) {
    return { valid: true, path: normalizedPath };
  }

  const stats = fs.statSync(normalizedPath);
  if (!stats.isFile()) {
    return { valid: false, error: '설정된 DB 경로가 파일이 아닙니다.' };
  }

  if (stats.size === 0) {
    return { valid: true, path: normalizedPath };
  }

  return inspectExistingSqliteDatabase(normalizedPath);
}

export function resolveSafeLocalDatabaseDeletion(
  dbPath: string,
  currentDbPath: string,
  localDbDir: string,
): DeleteValidationResult {
  if (typeof dbPath !== 'string' || dbPath.trim().length === 0) {
    return { valid: false, error: '삭제할 DB 경로가 비어 있습니다.' };
  }

  const normalizedPath = path.resolve(dbPath);
  if (!isDbExtension(normalizedPath)) {
    return { valid: false, error: 'DB 파일만 삭제할 수 있습니다.' };
  }

  if (!fs.existsSync(normalizedPath)) {
    return { valid: false, error: 'File not found' };
  }

  if (!fs.existsSync(localDbDir)) {
    return { valid: false, error: '로컬 DB 폴더가 존재하지 않습니다.' };
  }

  const localDbDirRealPath = fs.realpathSync(localDbDir);
  const targetRealPath = fs.realpathSync(normalizedPath);

  if (!isInsideDirectory(localDbDirRealPath, targetRealPath)) {
    return {
      valid: false,
      error: '로컬 DB 폴더 안의 데이터베이스만 삭제할 수 있습니다.',
    };
  }

  const targetStats = fs.statSync(targetRealPath);
  if (!targetStats.isFile()) {
    return { valid: false, error: '삭제할 DB 경로가 파일이 아닙니다.' };
  }

  const currentNormalizedPath = path.resolve(currentDbPath);
  const currentComparablePath = fs.existsSync(currentNormalizedPath)
    ? fs.realpathSync(currentNormalizedPath)
    : currentNormalizedPath;

  if (targetRealPath === currentComparablePath) {
    return {
      valid: false,
      error: '현재 사용 중인 데이터베이스는 삭제할 수 없습니다.',
    };
  }

  return {
    valid: true,
    path: normalizedPath,
    resolvedPath: targetRealPath,
  };
}
