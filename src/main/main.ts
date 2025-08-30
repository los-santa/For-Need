/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { app, BrowserWindow, ipcMain } from 'electron';
import log from 'electron-log';
import db from './initdb';
import { randomUUID } from 'crypto';
import { resolveHtmlPath } from './util';

// 데이터베이스 초기화
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS PROJECTS (
      project_id TEXT PRIMARY KEY,
      project_name TEXT NOT NULL,
      createdat TEXT
    )
  `);
  log.info('Database initialized successfully');
} catch (error) {
  log.error('Failed to initialize database:', error);
  app.quit();
}

// IPC 통신 타입 정의
interface Project {
  project_id: string;
  project_name: string;
  createdat: string;
}

// 프로젝트 관련 IPC 핸들러
ipcMain.handle('get-projects', async () => {
  try {
    const projects = db.prepare('SELECT * FROM PROJECTS').all() as Project[];
    return { success: true, data: projects };
  } catch (error) {
    log.error('Failed to get projects:', error);
    return { success: false, error: 'Failed to get projects' };
  }
});

ipcMain.handle('create-project', async (_, project: Omit<Project, 'createdat'>) => {
  try {
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO PROJECTS (project_id, project_name, createdat) VALUES (?, ?, ?)',
    ).run(project.project_id, project.project_name, now);
    return { success: true };
  } catch (error) {
    log.error('Failed to create project:', error);
    return { success: false, error: 'Failed to create project' };
  }
});

ipcMain.handle('delete-project', async (_, projectId: string) => {
  try {
    db.prepare('DELETE FROM PROJECTS WHERE project_id = ?').run(projectId);
    return { success: true };
  } catch (error) {
    log.error('Failed to delete project:', error);
    return { success: false, error: 'Failed to delete project' };
  }
});

// --------------------------------------------------------------
// Relation 핸들러
// --------------------------------------------------------------

interface RelationInput {
  relationtype_id: number;
  source: string; // source card id or title
  target: string; // target card id
  project_id?: string;
}

ipcMain.handle('create-relation', async (_, data: RelationInput) => {
  try {
    const now = new Date().toISOString();

    const insert = db.prepare(`INSERT INTO RELATION (relationtype_id, source, target, project_id, createdat) VALUES (?, ?, ?, ?, ?)`);

    // 중복 여부 확인 함수
    const existsStmt = db.prepare(`SELECT 1 FROM RELATION WHERE relationtype_id = ? AND source = ? AND target = ?`);

    const transact = db.transaction(() => {
      if (!existsStmt.get(data.relationtype_id, data.source, data.target)) {
        insert.run(data.relationtype_id, data.source, data.target, data.project_id ?? '', now);
      }

      // 반대 relationtype_id 찾기
      const rtRow = db.prepare('SELECT oppsite FROM RELATIONTYPE WHERE relationtype_id = ?').get(data.relationtype_id) as any;
      if (rtRow) {
        const oppName = rtRow.oppsite;
        const oppRow = db.prepare('SELECT relationtype_id FROM RELATIONTYPE WHERE typename = ?').get(oppName) as any;
        if (oppRow) {
          const oppId = oppRow.relationtype_id;
          if (!existsStmt.get(oppId, data.target, data.source)) {
            insert.run(oppId, data.target, data.source, data.project_id ?? '', now);
          }
        }
      }
    });

    transact();

    return { success: true };
  } catch (error) {
    log.error('Failed to create relation:', error);
    return { success: false, error: 'Failed to create relation' };
  }
});

// 카드 목록 반환 IPC
interface Card {
  id: string;
  title: string;
  cardtype: string | null;
}

ipcMain.handle('get-cards', async () => {
  try {
    const cards = db.prepare('SELECT id, title, cardtype FROM CARDS').all() as Card[];
    return { success: true, data: cards };
  } catch (error) {
    log.error('Failed to get cards:', error);
    return { success: false, error: 'Failed to get cards' };
  }
});

// 카드 생성 IPC
ipcMain.handle('create-card', async (_, payload: { title: string; project_id?: string }) => {
  try {
    const title = payload.title.trim();
    // duplicate check
    const exists = db.prepare('SELECT id FROM CARDS WHERE title = ?').get(title);
    if (exists) {
      return { success: false, error: 'duplicate-title' };
    }

    // 'todo' 카드타입 ID 가져오기
    const todoCardType = db.prepare("SELECT cardtype_id FROM CARDTYPES WHERE cardtype_name = 'todo'").get() as any;
    const defaultCardTypeId = todoCardType ? todoCardType.cardtype_id : null;

    const id = randomUUID();
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO CARDS (id, project_id, title, cardtype, createdat) VALUES (?, ?, ?, ?, ?)`,
    ).run(id, payload.project_id ?? null, title, defaultCardTypeId, now);
    return { success: true, data: { id } };
  } catch (error) {
    log.error('Failed to create card:', error);
    return { success: false, error: 'Failed to create card' };
  }
});

// relations by source
interface RelationRow {
  relation_id: number;
  relationtype_id: number;
  typename: string;
  target: string;
  target_title: string | null;
}

ipcMain.handle('get-relations-by-source', async (_, sourceId: string) => {
  try {
    const stmt = db.prepare(`
      SELECT r.relation_id, r.relationtype_id, rt.typename, r.target, c.title AS target_title
      FROM RELATION r
      LEFT JOIN RELATIONTYPE rt ON rt.relationtype_id = r.relationtype_id
      LEFT JOIN CARDS c ON c.id = r.target
      WHERE r.source = ?
    `);

    const rows = stmt.all(sourceId) as RelationRow[];
    return { success: true, data: rows };
  } catch (error) {
    log.error('Failed to get relations:', error);
    return { success: false, error: 'Failed to get relations' };
  }
});

// cardtypes & relationtypes list
ipcMain.handle('get-cardtypes', async () => {
  try {
    const rows = db.prepare('SELECT cardtype_id, cardtype_name, createdat FROM CARDTYPES').all();
    return { success: true, data: rows };
  } catch (error) {
    log.error('Failed to get cardtypes:', error);
    return { success: false, error: 'Failed to get cardtypes' };
  }
});

ipcMain.handle('get-relationtypes', async () => {
  try {
    const rows = db.prepare('SELECT relationtype_id, typename, oppsite, set_value, createdat FROM RELATIONTYPE').all();
    return { success: true, data: rows };
  } catch (error) {
    log.error('Failed to get relationtypes:', error);
    return { success: false, error: 'Failed to get relationtypes' };
  }
});

// update card type
ipcMain.handle('update-cardtype', async (_, payload: { card_id: string; cardtype: number }) => {
  try {
    db.prepare('UPDATE CARDS SET cardtype = ? WHERE id = ?').run(payload.cardtype, payload.card_id);
    return { success: true };
  } catch (error) {
    log.error('Failed to update card type:', error);
    return { success: false, error: 'Failed to update card type' };
  }
});

// ------------------------------------------------------------------
// Card title update
// ------------------------------------------------------------------
ipcMain.handle('update-card-title', async (_, payload: { card_id: string; title: string }) => {
  try {
    db.prepare('UPDATE CARDS SET title = ? WHERE id = ?').run(payload.title.trim(), payload.card_id);
    return { success: true };
  } catch (error) {
    log.error('Failed to update card title:', error);
    return { success: false, error: 'Failed to update card title' };
  }
});

// ------------------------------------------------------------------
// CardType creation
// ------------------------------------------------------------------
ipcMain.handle('create-cardtype', async (_, payload: { name: string }) => {
  try {
    const now = new Date().toISOString();
    const stmt = db.prepare('INSERT INTO CARDTYPES (cardtype_name, createdat) VALUES (?, ?)');
    const info = stmt.run(payload.name.trim(), now);
    const id = info.lastInsertRowid as number;
    return { success: true, data: { id } };
  } catch (error) {
    // 카드타입 이름이 이미 존재할 경우 해당 id 반환
    try {
      const row = db.prepare('SELECT cardtype_id FROM CARDTYPES WHERE cardtype_name = ?').get(payload.name.trim());
      if (row) {
        return { success: true, data: { id: (row as any).cardtype_id } };
      }
    } catch (innerErr) {
      log.error('Failed to fetch existing cardtype:', innerErr);
    }
    log.error('Failed to create cardtype:', error);
    return { success: false, error: 'Failed to create cardtype' };
  }
});

// ------------------------------------------------------------------
// RelationType creation
// ------------------------------------------------------------------
ipcMain.handle('create-relationtype', async (_, payload: { typename: string; oppsite: string }) => {
  try {
    const now = new Date().toISOString();
    const typename = payload.typename.trim();
    const opposite = payload.oppsite.trim();
    if(!opposite){
      return { success:false, error:'empty-opposite' };
    }

    // 1) 메인 타입 삽입
    let mainId: number;
    try {
      const res = db.prepare('INSERT INTO RELATIONTYPE (typename, oppsite, createdat) VALUES (?, ?, ?)')
        .run(typename, opposite, now);
      mainId = Number(res.lastInsertRowid);
    } catch (err) {
      // 이미 존재하면 해당 ID 획득
      const row = db.prepare('SELECT relationtype_id, oppsite FROM RELATIONTYPE WHERE typename = ?').get(typename) as any;
      mainId = row.relationtype_id;
    }

    // 2) 반대 타입 존재 여부 확인 후 없으면 삽입
    let oppId: number;
    const oppRow = db.prepare('SELECT relationtype_id FROM RELATIONTYPE WHERE typename = ?').get(opposite) as any;
    if (oppRow) {
      oppId = oppRow.relationtype_id;
      // oppRow 가 있을 때 oppsite 값이 올바른지 확인
      db.prepare('UPDATE RELATIONTYPE SET oppsite = ? WHERE relationtype_id = ?').run(typename, oppId);
    } else {
      const res = db.prepare('INSERT INTO RELATIONTYPE (typename, oppsite, createdat) VALUES (?, ?, ?)')
        .run(opposite, typename, now);
      oppId = Number(res.lastInsertRowid);
    }

    // 3) 메인 타입의 oppsite 값이 정확한지 보정 (중복 삽입으로 인해 catch 에서 가져온 경우 등)
    db.prepare('UPDATE RELATIONTYPE SET oppsite = ? WHERE relationtype_id = ?').run(opposite, mainId);

    return { success: true, data: { id: mainId } };
  } catch (error) {
    log.error('Failed to create relationtype:', error);
    return { success: false, error: 'Failed to create relationtype' };
  }
});

// ------------------------------------------------------------------
// Update CardType name
// ------------------------------------------------------------------
ipcMain.handle('rename-cardtype', async (_, payload: { cardtype_id: number; name: string }) => {
  try {
    db.prepare('UPDATE CARDTYPES SET cardtype_name = ? WHERE cardtype_id = ?').run(payload.name.trim(), payload.cardtype_id);
    return { success: true };
  } catch (error) {
    log.error('Failed to rename cardtype:', error);
    return { success: false, error: 'Failed to rename cardtype' };
  }
});

// ------------------------------------------------------------------
// Delete CardType
// ------------------------------------------------------------------
ipcMain.handle('delete-cardtype', async (_, cardtype_id: number) => {
  try {
    db.prepare('DELETE FROM CARDTYPES WHERE cardtype_id = ?').run(cardtype_id);
    // CARDS.cardtype 는 FK ON DELETE SET NULL 이므로 추가 조치 불필요
    return { success: true };
  } catch (error) {
    log.error('Failed to delete cardtype:', error);
    return { success: false, error: 'Failed to delete cardtype' };
  }
});

// ------------------------------------------------------------------
// Update RelationType name & opposite
// ------------------------------------------------------------------
ipcMain.handle('rename-relationtype', async (_, payload: { relationtype_id: number; typename: string; oppsite: string}) => {
  try {
    const newName = payload.typename.trim();
    const newOpp = payload.oppsite.trim();

    // 1) 기존 typename 가져오기
    const before = db.prepare('SELECT typename FROM RELATIONTYPE WHERE relationtype_id = ?').get(payload.relationtype_id) as any;
    const oldName = before?.typename as string;

    // 2) 현재 row 업데이트
    db.prepare('UPDATE RELATIONTYPE SET typename = ?, oppsite = ? WHERE relationtype_id = ?').run(newName, newOpp, payload.relationtype_id);

    // 3) oppsite 참조하는 상대 row의 oppsite 값 보정
    if (oldName) {
      db.prepare('UPDATE RELATIONTYPE SET oppsite = ? WHERE oppsite = ?').run(newName, oldName);
    }

    // 4) 반대 row의 typename 이 newOpp 와 일치하는지 확인, 없으면 생성
    const oppRow = db.prepare('SELECT relationtype_id FROM RELATIONTYPE WHERE typename = ?').get(newOpp) as any;
    if (!oppRow) {
      db.prepare('INSERT INTO RELATIONTYPE (typename, oppsite, createdat) VALUES (?, ?, ?)').run(newOpp, newName, new Date().toISOString());
    }
    else {
      db.prepare('UPDATE RELATIONTYPE SET oppsite = ? WHERE relationtype_id = ?').run(newName, oppRow.relationtype_id);
    }

    return { success: true };
  } catch (error) {
    log.error('Failed to rename relationtype:', error);
    return { success: false, error: 'Failed to rename relationtype' };
  }
});

// ------------------------------------------------------------------
// Delete RelationType
// ------------------------------------------------------------------
ipcMain.handle('delete-relationtype', async (_, relationtype_id: number) => {
  try {
    const row = db.prepare('SELECT typename, oppsite FROM RELATIONTYPE WHERE relationtype_id = ?').get(relationtype_id) as any;
    if(!row) return { success:false, error:'not-found'};
    const { typename, oppsite } = row;
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM RELATIONTYPE WHERE relationtype_id = ?').run(relationtype_id);
      db.prepare('DELETE FROM RELATIONTYPE WHERE typename = ?').run(oppsite);
    });
    tx();
    return { success: true };
  } catch (error) {
    log.error('Failed to delete relationtype:', error);
    return { success: false, error: 'Failed to delete relationtype' };
  }
});

// ------------------------------------------------------------------
// Delete Relation
// ------------------------------------------------------------------
ipcMain.handle('delete-relation', async (_, relation_id: number) => {
  try {
    const row = db.prepare('SELECT relationtype_id, source, target FROM RELATION WHERE relation_id = ?').get(relation_id) as any;
    if (!row) return { success: false, error: 'not-found' };

    const { relationtype_id, source, target } = row;

    const oppNameRow = db.prepare('SELECT oppsite FROM RELATIONTYPE WHERE relationtype_id = ?').get(relationtype_id) as any;
    let oppRelId: number | null = null;
    if (oppNameRow) {
      const oppTypeRow = db.prepare('SELECT relationtype_id FROM RELATIONTYPE WHERE typename = ?').get(oppNameRow.oppsite) as any;
      if (oppTypeRow) {
        oppRelId = oppTypeRow.relationtype_id;
      }
    }

    const del = db.prepare('DELETE FROM RELATION WHERE relation_id = ?');
    const delByProps = db.prepare('DELETE FROM RELATION WHERE relationtype_id = ? AND source = ? AND target = ?');

    const tx = db.transaction(() => {
      del.run(relation_id);
      if (oppRelId !== null) {
        delByProps.run(oppRelId, target, source);
      }
    });
    tx();

    return { success: true };
  } catch (error) {
    log.error('Failed to delete relation:', error);
    return { success: false, error: 'Failed to delete relation' };
  }
});

// ------------------------------------------------------------------
// Get all relations (simple list)
// ------------------------------------------------------------------
ipcMain.handle('get-relations', async () => {
  try {
    const rows = db.prepare(`
      SELECT r.relation_id, r.relationtype_id, rt.typename, r.source, sc.title AS source_title,
             r.target, tc.title AS target_title
      FROM RELATION r
      LEFT JOIN RELATIONTYPE rt ON rt.relationtype_id = r.relationtype_id
      LEFT JOIN CARDS sc ON sc.id = r.source
      LEFT JOIN CARDS tc ON tc.id = r.target
      ORDER BY r.relation_id DESC
    `).all();
    return { success: true, data: rows };
  } catch (error) {
    log.error('Failed to get relations:', error);
    return { success: false, error: 'Failed to get relations' };
  }
});

// 카드 상세 조회
ipcMain.handle('get-card-detail', async (_, cardId: string) => {
  try {
    const row = db.prepare('SELECT * FROM CARDS WHERE id = ?').get(cardId);
    return { success: true, data: row };
  } catch (error) {
    log.error('Failed to get card detail:', error);
    return { success: false, error: 'Failed to get card detail' };
  }
});

// 카드 필드 단일 업데이트
ipcMain.handle('update-card-field', async (_, payload: { card_id: string; field: string; value: unknown }) => {
  try {
    const allowed = [
      'project_id',
      'title',
      'content',
      'cardtype',
      'complete',
      'activate',
      'duration',
      'es',
      'ls',
      'startdate',
      'enddate',
      'price',
    ];
    if (!allowed.includes(payload.field)) {
      return { success: false, error: 'field-not-allowed' };
    }
    const stmt = db.prepare(`UPDATE CARDS SET ${payload.field} = ? WHERE id = ?`);
    stmt.run(payload.value, payload.card_id);
    return { success: true };
  } catch (error) {
    log.error('Failed to update card field:', error);
    return { success: false, error: 'Failed to update card field' };
  }
});

// ------------------------------------------------------------------
// Delete Card
// ------------------------------------------------------------------
ipcMain.handle('delete-card', async (_, card_id: string) => {
  try {
    db.prepare('DELETE FROM CARDS WHERE id = ?').run(card_id);
    return { success: true };
  } catch (error) {
    log.error('Failed to delete card:', error);
    return { success: false, error: 'Failed to delete card' };
  }
});

// ------------------------------------------------------------------
// Alias Management
// ------------------------------------------------------------------

// 모든 별칭 조회
ipcMain.handle('get-aliases', async () => {
  try {
    const aliases = db.prepare('SELECT * FROM ALIAS ORDER BY alias_name').all();
    return { success: true, data: aliases };
  } catch (error) {
    log.error('Failed to get aliases:', error);
    return { success: false, error: 'Failed to get aliases' };
  }
});

// 새 별칭 생성
ipcMain.handle('create-alias', async (_, payload: { alias_name: string }) => {
  try {
    const now = new Date().toISOString();
    const aliasName = payload.alias_name.trim();

    if (!aliasName) {
      return { success: false, error: 'Alias name is required' };
    }

    const result = db.prepare('INSERT INTO ALIAS (alias_name, createdat) VALUES (?, ?)')
      .run(aliasName, now);

    return { success: true, data: { alias_id: result.lastInsertRowid, alias_name: aliasName } };
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      // 이미 존재하는 별칭인 경우 해당 별칭 정보 반환
      const existing = db.prepare('SELECT * FROM ALIAS WHERE alias_name = ?').get(payload.alias_name.trim());
      return { success: true, data: existing };
    }
    log.error('Failed to create alias:', error);
    return { success: false, error: 'Failed to create alias' };
  }
});

// 특정 카드의 모든 별칭 조회
ipcMain.handle('get-card-aliases', async (_, card_id: string) => {
  try {
    const results = db.prepare(`
      SELECT a.alias_id, a.alias_name, ca.createdat as assigned_at
      FROM CURRENT_ALIAS ca
      JOIN ALIAS a ON ca.alias_id = a.alias_id
      WHERE ca.card_id = ?
      ORDER BY a.alias_name
    `).all(card_id);

    return { success: true, data: results };
  } catch (error) {
    log.error('Failed to get card aliases:', error);
    return { success: false, error: 'Failed to get card aliases' };
  }
});

// 기존 호환성을 위한 별칭 (단일 별칭만 반환)
ipcMain.handle('get-card-alias', async (_, card_id: string) => {
  try {
    const result = db.prepare(`
      SELECT a.alias_id, a.alias_name, ca.createdat as assigned_at
      FROM CURRENT_ALIAS ca
      JOIN ALIAS a ON ca.alias_id = a.alias_id
      WHERE ca.card_id = ?
      ORDER BY ca.createdat
      LIMIT 1
    `).get(card_id);

    return { success: true, data: result || null };
  } catch (error) {
    log.error('Failed to get card alias:', error);
    return { success: false, error: 'Failed to get card alias' };
  }
});

// 카드에 별칭 설정
ipcMain.handle('set-card-alias', async (_, payload: { card_id: string; alias_name: string }) => {
  try {
    const { card_id, alias_name } = payload;
    const now = new Date().toISOString();

    if (!alias_name.trim()) {
      // 빈 별칭이면 기존 별칭 제거
      db.prepare('DELETE FROM CURRENT_ALIAS WHERE card_id = ?').run(card_id);
      return { success: true, data: null };
    }

    // 별칭이 존재하는지 확인, 없으면 생성
    let alias = db.prepare('SELECT * FROM ALIAS WHERE alias_name = ?').get(alias_name.trim());
    if (!alias) {
      const result = db.prepare('INSERT INTO ALIAS (alias_name, createdat) VALUES (?, ?)')
        .run(alias_name.trim(), now);
      alias = { alias_id: result.lastInsertRowid, alias_name: alias_name.trim(), createdat: now };
    }

    // 카드에 별칭 할당 (REPLACE로 기존 별칭 덮어쓰기)
    db.prepare('REPLACE INTO CURRENT_ALIAS (card_id, alias_id, createdat) VALUES (?, ?, ?)')
      .run(card_id, alias.alias_id, now);

    return { success: true, data: alias };
  } catch (error) {
    log.error('Failed to set card alias:', error);
    return { success: false, error: 'Failed to set card alias' };
  }
});

// 카드에 새 별칭 추가
ipcMain.handle('add-card-alias', async (_, payload: { card_id: string; alias_name: string }) => {
  try {
    const { card_id, alias_name } = payload;
    const now = new Date().toISOString();

    if (!alias_name.trim()) {
      return { success: false, error: 'Alias name is required' };
    }

    // 별칭이 존재하는지 확인, 없으면 생성
    let alias = db.prepare('SELECT * FROM ALIAS WHERE alias_name = ?').get(alias_name.trim());
    if (!alias) {
      const result = db.prepare('INSERT INTO ALIAS (alias_name, createdat) VALUES (?, ?)')
        .run(alias_name.trim(), now);
      alias = { alias_id: result.lastInsertRowid, alias_name: alias_name.trim(), createdat: now };
    }

    // 이미 해당 카드에 이 별칭이 있는지 확인
    const existing = db.prepare('SELECT * FROM CURRENT_ALIAS WHERE card_id = ? AND alias_id = ?')
      .get(card_id, alias.alias_id);

    if (existing) {
      return { success: false, error: 'duplicate', message: '이미 있는 별칭입니다.' };
    }

    // 카드에 별칭 추가
    db.prepare('INSERT INTO CURRENT_ALIAS (card_id, alias_id, createdat) VALUES (?, ?, ?)')
      .run(card_id, alias.alias_id, now);

    return { success: true, data: alias };
  } catch (error) {
    log.error('Failed to add card alias:', error);
    return { success: false, error: 'Failed to add card alias' };
  }
});

// 카드에서 특정 별칭 제거
ipcMain.handle('remove-card-alias', async (_, payload: { card_id: string; alias_id: number }) => {
  try {
    const { card_id, alias_id } = payload;

    db.prepare('DELETE FROM CURRENT_ALIAS WHERE card_id = ? AND alias_id = ?')
      .run(card_id, alias_id);

    return { success: true };
  } catch (error) {
    log.error('Failed to remove card alias:', error);
    return { success: false, error: 'Failed to remove card alias' };
  }
});

// 카드의 모든 별칭 제거 (기존 호환성)
ipcMain.handle('delete-card-alias', async (_, card_id: string) => {
  try {
    db.prepare('DELETE FROM CURRENT_ALIAS WHERE card_id = ?').run(card_id);
    return { success: true };
  } catch (error) {
    log.error('Failed to delete card alias:', error);
    return { success: false, error: 'Failed to delete card alias' };
  }
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug').default();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    title: 'ForNeed',
    fullscreen: process.env.NODE_ENV === 'development',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));
}

app.whenReady().then(async () => {
  if (isDebug) {
    await installExtensions();
  }
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }

  if (process.env.NODE_ENV === 'development') {
    try {
      console.log('dev 모드: electronmon 프로세스 종료');
      process.kill(process.ppid, 'SIGINT');
    } catch (err) {
      // 이미 종료되었거나 권한 문제일 경우 무시
    }
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
    });
