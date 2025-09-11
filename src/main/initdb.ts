import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';

// 홈 디렉토리에 ForNeed 폴더 생성하여 데이터베이스 저장
const homeDir = app.getPath('home');
const forNeedDir = path.join(homeDir, '.forneed');
const dbPath = path.join(forNeedDir, 'database.db');

// 디렉토리 존재 확인 및 생성
if (!fs.existsSync(forNeedDir)) {
  fs.mkdirSync(forNeedDir, { recursive: true });
}

console.log('Database path:', dbPath);
console.log('ForNeed dir:', forNeedDir);
console.log('Directory exists:', fs.existsSync(forNeedDir));

const db = new Database(dbPath);

// 기존 데이터 유지를 위해 DROP 문 제거 - 테이블이 없을 때만 생성

// 테이블 생성 및 초기 데이터 삽입
// 카드타입 테이블 생성
db.exec(`
  CREATE TABLE IF NOT EXISTS CARDTYPES (
    cardtype_id INTEGER PRIMARY KEY AUTOINCREMENT,
    cardtype_name TEXT UNIQUE NOT NULL,
    createdat TEXT
  )
`);

// 기본 카드타입 데이터 삽입 (존재하지 않을 때만)
const defaultTypes = ['todo','entity','habit','action','destination','IF'];
defaultTypes.forEach(name=>{
  db.prepare("INSERT OR IGNORE INTO CARDTYPES (cardtype_name, createdat) VALUES (?, datetime('now'))").run(name);
});

// 프로젝트 테이블 생성
db.exec(`
  CREATE TABLE IF NOT EXISTS PROJECTS (
    project_id TEXT PRIMARY KEY,
    project_name TEXT NOT NULL,
    createdat TEXT
  )
`);

// 카드 테이블 생성
db.exec(`
  CREATE TABLE IF NOT EXISTS CARDS (
    id TEXT PRIMARY KEY,
    project_id TEXT DEFAULT NULL,
    title TEXT NOT NULL,
    content TEXT,
    cardtype INTEGER DEFAULT NULL,
    complete INTEGER DEFAULT 0,
    activate INTEGER DEFAULT 0,
    duration INTEGER,
    es TEXT,
    ls TEXT,
    startdate TEXT,
    enddate TEXT,
    price INTEGER,
    createdat TEXT,
    FOREIGN KEY (project_id) REFERENCES PROJECTS(project_id) ON DELETE CASCADE,
    FOREIGN KEY (cardtype) REFERENCES CARDTYPES(cardtype_id) ON DELETE SET NULL
  )
`);

// 관계타입 테이블 생성
db.exec(`
  CREATE TABLE IF NOT EXISTS RELATIONTYPE (
    relationtype_id INTEGER PRIMARY KEY AUTOINCREMENT,
    typename TEXT NOT NULL,
    oppsite TEXT NOT NULL,
    createdat TEXT,
    set_value TEXT
  )
`);

// 관계 테이블 생성
db.exec(`
  CREATE TABLE IF NOT EXISTS RELATION (
    relation_id INTEGER PRIMARY KEY AUTOINCREMENT,
    relationtype_id INTEGER NOT NULL,
    source TEXT NOT NULL,
    target TEXT NOT NULL,
    project_id TEXT NOT NULL,
    createdat TEXT,
    set_value INTEGER,
    FOREIGN KEY (relationtype_id) REFERENCES RELATIONTYPE(relationtype_id) ON DELETE CASCADE,
    FOREIGN KEY (source) REFERENCES CARDS(id) ON DELETE CASCADE,
    FOREIGN KEY (target) REFERENCES CARDS(id) ON DELETE CASCADE
  )
`);

// 기본 관계타입 데이터 삽입
db.exec(`
  INSERT OR IGNORE INTO RELATIONTYPE (relationtype_id, typename, oppsite) VALUES
  (1, 'for', 'need'),
  (2, 'need', 'for'),
  (3, 'before', 'after'),
  (4, 'after', 'before')
`);

// 별칭 테이블 생성
db.exec(`
  CREATE TABLE IF NOT EXISTS ALIAS (
    alias_id INTEGER PRIMARY KEY AUTOINCREMENT,
    alias_name TEXT UNIQUE NOT NULL,
    createdat TEXT
  )
`);

// 현재 별칭 테이블 마이그레이션 (여러 별칭 지원)
try {
  // 기존 테이블 구조 확인
  const tableInfo = db.prepare("PRAGMA table_info(CURRENT_ALIAS)").all();
  const hasPrimaryKeyConstraint = tableInfo.some((col: any) => col.pk === 1 && col.name === 'card_id');

  if (hasPrimaryKeyConstraint) {
    console.log('Migrating CURRENT_ALIAS table to support multiple aliases...');

    // 기존 데이터 백업
    const existingData = db.prepare('SELECT * FROM CURRENT_ALIAS').all();

    // 기존 테이블 삭제 후 새로 생성
    db.exec('DROP TABLE IF EXISTS CURRENT_ALIAS');
    db.exec(`
      CREATE TABLE CURRENT_ALIAS (
        card_id TEXT NOT NULL,
        alias_id INTEGER NOT NULL,
        createdat TEXT,
        PRIMARY KEY (card_id, alias_id),
        FOREIGN KEY (card_id) REFERENCES CARDS(id) ON DELETE CASCADE,
        FOREIGN KEY (alias_id) REFERENCES ALIAS(alias_id) ON DELETE CASCADE
      )
    `);

    // 기존 데이터 복원
    if (existingData.length > 0) {
      const insertStmt = db.prepare('INSERT INTO CURRENT_ALIAS (card_id, alias_id, createdat) VALUES (?, ?, ?)');
      for (const row of existingData) {
        insertStmt.run(row.card_id, row.alias_id, row.createdat);
      }
    }

    console.log('CURRENT_ALIAS table migration completed');
  }
} catch (error) {
  console.log('Creating new CURRENT_ALIAS table...');
}

// 현재 별칭 테이블 생성 (카드별 현재 사용 중인 별칭들 - 여러 개 지원)
db.exec(`
  CREATE TABLE IF NOT EXISTS CURRENT_ALIAS (
    card_id TEXT NOT NULL,
    alias_id INTEGER NOT NULL,
    createdat TEXT,
    PRIMARY KEY (card_id, alias_id),
    FOREIGN KEY (card_id) REFERENCES CARDS(id) ON DELETE CASCADE,
    FOREIGN KEY (alias_id) REFERENCES ALIAS(alias_id) ON DELETE CASCADE
  )
`);

// 기존 카드들을 'todo' 카드타입으로 마이그레이션
try {
  console.log('Migrating existing cards to todo cardtype...');

  // 'todo' 카드타입 ID 가져오기
  const todoCardType = db.prepare("SELECT cardtype_id FROM CARDTYPES WHERE cardtype_name = 'todo'").get() as any;

  if (todoCardType) {
    // 카드타입이 NULL이거나 다른 카드타입인 모든 카드를 'todo'로 업데이트
    const updateResult = db.prepare("UPDATE CARDS SET cardtype = ? WHERE cardtype IS NULL OR cardtype != ?")
      .run(todoCardType.cardtype_id, todoCardType.cardtype_id);

    if (updateResult.changes > 0) {
      console.log(`Updated ${updateResult.changes} cards to 'todo' cardtype`);
    }
  }
} catch (error) {
  console.log('Card migration error:', error);
}

// 소프트 삭제를 위한 deleted_at 컬럼 추가 마이그레이션
try {
  console.log('Adding deleted_at columns for soft delete...');

  // CARDS 테이블에 deleted_at 컬럼 추가
  try {
    db.exec('ALTER TABLE CARDS ADD COLUMN deleted_at TEXT');
    console.log('Added deleted_at column to CARDS table');
  } catch (error) {
    // 이미 존재하는 경우 무시
  }

  // CARDTYPES 테이블에 deleted_at 컬럼 추가
  try {
    db.exec('ALTER TABLE CARDTYPES ADD COLUMN deleted_at TEXT');
    console.log('Added deleted_at column to CARDTYPES table');
  } catch (error) {
    // 이미 존재하는 경우 무시
  }

  // RELATION 테이블에 deleted_at 컬럼 추가
  try {
    db.exec('ALTER TABLE RELATION ADD COLUMN deleted_at TEXT');
    console.log('Added deleted_at column to RELATION table');
  } catch (error) {
    // 이미 존재하는 경우 무시
  }

  // RELATIONTYPE 테이블에 deleted_at 컬럼 추가
  try {
    db.exec('ALTER TABLE RELATIONTYPE ADD COLUMN deleted_at TEXT');
    console.log('Added deleted_at column to RELATIONTYPE table');
  } catch (error) {
    // 이미 존재하는 경우 무시
  }

  console.log('Soft delete migration completed');
} catch (error) {
  console.log('Soft delete migration error:', error);
}

// 사용로그 테이블 생성
try {
  console.log('Creating usage logs table...');

  db.exec(`
    CREATE TABLE IF NOT EXISTS USAGE_LOGS (
      log_id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      session_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      details TEXT,
      duration_ms INTEGER,
      error_message TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // 로그 조회 성능을 위한 인덱스 생성
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_usage_logs_timestamp ON USAGE_LOGS(timestamp);
    CREATE INDEX IF NOT EXISTS idx_usage_logs_session ON USAGE_LOGS(session_id);
    CREATE INDEX IF NOT EXISTS idx_usage_logs_action ON USAGE_LOGS(action_type);
    CREATE INDEX IF NOT EXISTS idx_usage_logs_target ON USAGE_LOGS(target_type);
  `);

  console.log('Usage logs table created successfully');
} catch (error) {
  console.log('Usage logs table creation error:', error);
}

// =========================
// 습관 추적 시스템 DDL
// =========================

// 습관 속성 서브테이블 (1:1 cards.id, cardtype이 'habit'인 카드만)
db.exec(`
  CREATE TABLE IF NOT EXISTS habit_properties (
    -- 식별/연결 (기존 CARDS와 호환)
    card_id            TEXT PRIMARY KEY,                          -- FK cards.id (cardtype이 'habit'만 허용)

    -- 반복 정의(RFC5545)
    dtstart_local      TEXT NOT NULL,                             -- 'YYYY-MM-DDTHH:MM:SS' (로컬 시작)
    tzid               TEXT NOT NULL,                             -- IANA TZ (예: 'Asia/Seoul')
    rrule              TEXT NOT NULL,                             -- 예: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR'
    rdates_json        TEXT,                                      -- JSON 배열: 추가 발생 ISO8601
    exdates_json       TEXT,                                      -- JSON 배열: 제외 일시 ISO8601
    wkst               TEXT DEFAULT 'MO',                         -- 주 시작 요일
    until_utc          TEXT,                                      -- ISO8601Z
    count_limit        INTEGER,                                   -- 발생 횟수 제한

    -- 수행 단위/시간
    duration_minutes   INTEGER NOT NULL DEFAULT 0,                -- 0=체크형, >0=블록형
    min_spacing_minutes INTEGER NOT NULL DEFAULT 0,               -- 인스턴스 간 최소 간격

    -- 측정/정량화
    unit_label         TEXT,                                      -- 예: '회', '분', '페이지'
    target_per_occurrence INTEGER NOT NULL DEFAULT 1,             -- 발생당 목표치
    max_per_day        INTEGER,                                   -- 하루 상한(옵션)
    rollover_mode      TEXT NOT NULL DEFAULT 'none',             -- 'none'|'forward'|'backward'

    -- 목표/목표주기
    weekly_quota       INTEGER,                                   -- 주간 총 목표
    monthly_quota      INTEGER,                                   -- 월간 총 목표
    adherence_target   REAL,                                      -- 목표 달성률(%)

    -- 스트릭/최근 상태(요약 캐시)
    streak_count       INTEGER NOT NULL DEFAULT 0,
    longest_streak     INTEGER NOT NULL DEFAULT 0,
    last_completed_at  TEXT,                                      -- 로컬 기준 ISO8601

    -- 알림/리마인더
    notify_enabled     INTEGER NOT NULL DEFAULT 0,               -- 0/1
    notify_before_min  INTEGER,                                   -- 시작 전 알림 분
    notify_at_local    TEXT,                                      -- 고정 알림시각

    -- 수명주기/상태
    status             TEXT NOT NULL DEFAULT 'active',           -- 'active'|'paused'|'archived'
    start_date         TEXT,                                      -- 'YYYY-MM-DD'
    end_date           TEXT,                                      -- 'YYYY-MM-DD'

    -- 메타
    color_hex          TEXT,                                      -- UI 색상
    icon               TEXT,                                      -- UI 아이콘 키
    notes              TEXT,                                      -- 설명

    -- 감사/타임스탬프
    created_at         TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at         TEXT,

    FOREIGN KEY(card_id) REFERENCES CARDS(id) ON DELETE CASCADE
  )
`);

// 반복 전개 결과 캐시 테이블
db.exec(`
  CREATE TABLE IF NOT EXISTS habit_instances_cache (
    card_id         TEXT NOT NULL,
    occurrence_key  TEXT NOT NULL,                                -- UTC 키: 'YYYYMMDDTHHMMSSZ'
    start_utc       TEXT NOT NULL,                                -- ISO8601Z
    end_utc         TEXT,                                         -- duration_minutes>0이면 필수
    is_exception    INTEGER NOT NULL DEFAULT 0,                  -- EXDATE 적용 결과
    generated_at    TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY(card_id, occurrence_key),
    FOREIGN KEY(card_id) REFERENCES CARDS(id) ON DELETE CASCADE
  )
`);

// 수행 기록 테이블 (멱등 upsert 대상)
db.exec(`
  CREATE TABLE IF NOT EXISTS habit_logs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id         TEXT NOT NULL,
    occurrence_key  TEXT NOT NULL,                                -- 인스턴스 식별자
    done_quantity   INTEGER NOT NULL DEFAULT 1,                  -- 정량 수행치
    note            TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(card_id, occurrence_key),
    FOREIGN KEY(card_id) REFERENCES CARDS(id) ON DELETE CASCADE
  )
`);

// 트리거: habit 카드타입만 허용
db.exec(`
  CREATE TRIGGER IF NOT EXISTS habit_props_enforce_cardtype
  BEFORE INSERT ON habit_properties
  FOR EACH ROW
  BEGIN
    SELECT CASE
      WHEN (
        SELECT ct.cardtype_name 
        FROM CARDS c 
        JOIN CARDTYPES ct ON c.cardtype = ct.cardtype_id 
        WHERE c.id = NEW.card_id
      ) <> 'habit'
      THEN RAISE(ABORT, 'Card must have cardtype habit')
    END;
  END
`);

// 트리거: habit_properties updated_at 자동 갱신
db.exec(`
  CREATE TRIGGER IF NOT EXISTS habit_props_touch_updated_at
  AFTER UPDATE ON habit_properties
  FOR EACH ROW
  BEGIN
    UPDATE habit_properties SET updated_at = datetime('now') WHERE card_id = NEW.card_id;
  END
`);

// 트리거: habit_logs updated_at 자동 갱신
db.exec(`
  CREATE TRIGGER IF NOT EXISTS habit_logs_touch_updated_at
  AFTER UPDATE ON habit_logs
  FOR EACH ROW
  BEGIN
    UPDATE habit_logs SET updated_at = datetime('now') WHERE id = NEW.id;
  END
`);

// 인덱스
db.exec(`
  CREATE INDEX IF NOT EXISTS ix_inst_time ON habit_instances_cache(start_utc);
  CREATE INDEX IF NOT EXISTS ix_inst_card_time ON habit_instances_cache(card_id, start_utc);
  CREATE UNIQUE INDEX IF NOT EXISTS ux_logs_card_occ ON habit_logs(card_id, occurrence_key);
`);

// 'habit' 카드타입이 없으면 추가
try {
  db.prepare("INSERT OR IGNORE INTO CARDTYPES (cardtype_name, createdat) VALUES ('habit', datetime('now'))").run();
  console.log('Added habit cardtype if not exists');
} catch (error) {
  console.log('Habit cardtype creation error:', error);
}

export default db;
