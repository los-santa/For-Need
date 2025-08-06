import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';

// 사용자 데이터 디렉토리에 데이터베이스 생성
const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'database.db');

// 디렉토리 존재 확인 및 생성
if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}

const db = new Database(dbPath);

// 기존 데이터 유지를 위해 DROP 문 제거
// 테이블이 없을 때만 생성하도록 CREATE TABLE IF NOT EXISTS 사용

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
const defaultTypes = ['entity','habit','action','destination','IF'];
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

export default db;
