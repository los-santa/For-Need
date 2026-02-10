import * as fs from 'fs';
import * as path from 'path';

// better-sqlite3는 네이티브 모듈이므로 동적 require 사용
let Database: any;
try {
  Database = require('better-sqlite3');
} catch (error) {
  console.error('better-sqlite3 로드 실패:', error);
}

let db: any | null = null;
let currentDbPath: string | null = null;

// DB 연결
export function connectDatabase(dbPath: string): { success: boolean; error?: string } {
  try {
    // better-sqlite3 모듈 확인
    if (!Database) {
      return { success: false, error: 'better-sqlite3 모듈을 로드할 수 없습니다.' };
    }

    // 기존 연결 닫기
    if (db) {
      db.close();
      db = null;
    }

    // 파일이 존재하는지 확인
    if (!fs.existsSync(dbPath)) {
      return { success: false, error: '데이터베이스 파일을 찾을 수 없습니다.' };
    }

    // DB 연결
    db = new Database(dbPath, { readonly: true });
    currentDbPath = dbPath;

    // 테스트 쿼리
    db.prepare('SELECT 1').get();

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || '데이터베이스 연결에 실패했습니다.' };
  }
}

// DB 연결 해제
export function disconnectDatabase(): void {
  if (db) {
    db.close();
    db = null;
    currentDbPath = null;
  }
}

// 현재 연결된 DB 경로 가져오기
export function getCurrentDbPath(): string | null {
  return currentDbPath;
}

// Circle 데이터 로드 (CARDS 테이블에서)
export function loadCircles(): any[] {
  if (!db) {
    throw new Error('데이터베이스가 연결되지 않았습니다.');
  }

  try {
    // CARDS 테이블이 있는지 확인
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='CARDS'"
    ).get();

    if (!tables) {
      return [];
    }

    // CARDS 데이터 조회 (deleted_at이 NULL인 것만, 소프트 삭제 제외)
    const stmt = db.prepare(`
      SELECT 
        id,
        project_id,
        title,
        content,
        cardtype,
        complete,
        activate,
        duration,
        es,
        ls,
        startdate,
        enddate,
        price,
        createdat
      FROM CARDS 
      WHERE deleted_at IS NULL
      ORDER BY createdat DESC
    `);
    return stmt.all();
  } catch (error: any) {
    throw new Error(`Circle 데이터 로드 실패: ${error.message}`);
  }
}

// Arrow 데이터 로드 (RELATION 테이블에서)
export function loadArrows(): any[] {
  if (!db) {
    throw new Error('데이터베이스가 연결되지 않았습니다.');
  }

  try {
    // RELATION 테이블이 있는지 확인
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='RELATION'"
    ).get();

    if (!tables) {
      return [];
    }

    // RELATION 데이터 조회 (deleted_at이 NULL인 것만, 소프트 삭제 제외)
    // RELATIONTYPE과 JOIN하여 관계 이름(typename) 가져오기
    // 주의: 'from'과 'to'는 SQL 예약어이므로 다른 이름 사용
    const stmt = db.prepare(`
      SELECT 
        r.relation_id as relation_id,
        r.source as source,
        r.target as target,
        r.relationtype_id as relationtype_id,
        COALESCE(rt.typename, '') as typename
      FROM RELATION r
      LEFT JOIN RELATIONTYPE rt ON r.relationtype_id = rt.relationtype_id 
        AND (rt.deleted_at IS NULL OR rt.deleted_at = '')
      WHERE r.deleted_at IS NULL OR r.deleted_at = ''
      ORDER BY r.relation_id
    `);
    const result = stmt.all();
    console.log('Arrow 데이터 로드 결과:', result.length, '개');
    if (result.length > 0) {
      console.log('첫 번째 Arrow 샘플:', result[0]);
    }
    return result;
  } catch (error: any) {
    throw new Error(`Arrow 데이터 로드 실패: ${error.message}`);
  }
}

// 관계타입 목록 로드 (RELATIONTYPE 테이블에서)
export function loadRelationTypes(): any[] {
  if (!db) {
    throw new Error('데이터베이스가 연결되지 않았습니다.');
  }

  try {
    // RELATIONTYPE 테이블이 있는지 확인
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='RELATIONTYPE'"
    ).get();

    if (!tables) {
      return [];
    }

    // RELATIONTYPE 데이터 조회 (deleted_at이 NULL인 것만)
    const stmt = db.prepare(`
      SELECT 
        relationtype_id,
        typename
      FROM RELATIONTYPE 
      WHERE deleted_at IS NULL OR deleted_at = ''
      ORDER BY typename
    `);
    return stmt.all();
  } catch (error: any) {
    throw new Error(`관계타입 데이터 로드 실패: ${error.message}`);
  }
}

// 필터링된 Arrow 데이터 로드 (특정 relationtype_id만)
export function loadArrowsFiltered(relationtypeIds: number[] | null = null): any[] {
  if (!db) {
    throw new Error('데이터베이스가 연결되지 않았습니다.');
  }

  try {
    // RELATION 테이블이 있는지 확인
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='RELATION'"
    ).get();

    if (!tables) {
      return [];
    }

    let query = `
      SELECT 
        r.relation_id as relation_id,
        r.source as source,
        r.target as target,
        r.relationtype_id as relationtype_id,
        COALESCE(rt.typename, '') as typename
      FROM RELATION r
      LEFT JOIN RELATIONTYPE rt ON r.relationtype_id = rt.relationtype_id 
        AND (rt.deleted_at IS NULL OR rt.deleted_at = '')
      WHERE (r.deleted_at IS NULL OR r.deleted_at = '')
    `;

    // 필터링이 있으면 WHERE 절에 추가
    if (relationtypeIds && relationtypeIds.length > 0) {
      const placeholders = relationtypeIds.map(() => '?').join(',');
      query += ` AND r.relationtype_id IN (${placeholders})`;
    }

    query += ` ORDER BY r.relation_id`;

    const stmt = relationtypeIds && relationtypeIds.length > 0
      ? db.prepare(query).bind(...relationtypeIds)
      : db.prepare(query);

    const result = stmt.all();
    console.log(`Arrow 데이터 로드 결과 (필터: ${relationtypeIds?.length || '전체'}개 관계타입):`, result.length, '개');
    return result;
  } catch (error: any) {
    throw new Error(`Arrow 데이터 로드 실패: ${error.message}`);
  }
}

// 데이터베이스 스키마 확인
export function getTableInfo(tableName: string): any[] {
  if (!db) {
    throw new Error('데이터베이스가 연결되지 않았습니다.');
  }

  try {
    const stmt = db.prepare(`PRAGMA table_info(${tableName})`);
    return stmt.all();
  } catch (error: any) {
    throw new Error(`테이블 정보 조회 실패: ${error.message}`);
  }
}

