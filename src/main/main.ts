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

    db.prepare(
      `INSERT INTO RELATION (relationtype_id, source, target, project_id, createdat) VALUES (?, ?, ?, ?, ?)`,
    ).run(
      data.relationtype_id,
      data.source,
      data.target,
      data.project_id ?? '',
      now,
    );

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

    const id = randomUUID();
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO CARDS (id, project_id, title, createdat) VALUES (?, ?, ?, ?)`,
    ).run(id, payload.project_id ?? null, title, now);
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
    const rows = db.prepare('SELECT cardtype_id, cardtype_name FROM CARDTYPES').all();
    return { success: true, data: rows };
  } catch (error) {
    log.error('Failed to get cardtypes:', error);
    return { success: false, error: 'Failed to get cardtypes' };
  }
});

ipcMain.handle('get-relationtypes', async () => {
  try {
    const rows = db.prepare('SELECT relationtype_id, typename FROM RELATIONTYPE').all();
    return { success: true, data: rows };
  } catch (error) {
    log.error('Failed to get relationtypes:', error);
    return { success: false, error: 'Failed to get relationtypes' };
  }
});

// update card type
ipcMain.handle('update-cardtype', async (_, payload: { card_id: string; cardtype: string }) => {
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
    const id = randomUUID();
    const now = new Date().toISOString();
    db.prepare('INSERT INTO CARDTYPES (cardtype_id, cardtype_name, createdat) VALUES (?, ?, ?)')
      .run(id, payload.name.trim(), now);
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
    const result = db.prepare('INSERT INTO RELATIONTYPE (typename, oppsite, createdat) VALUES (?, ?, ?)')
      .run(payload.typename.trim(), payload.oppsite.trim(), now);
    const id = Number(result.lastInsertRowid);
    return { success: true, data: { id } };
  } catch (error) {
    // 이미 존재할 경우 id 반환
    try {
      const row = db.prepare('SELECT relationtype_id FROM RELATIONTYPE WHERE typename = ?').get(payload.typename.trim());
      if (row) {
        return { success: true, data: { id: (row as any).relationtype_id } };
      }
    } catch (innerErr) {
      log.error('Failed to fetch existing relationtype:', innerErr);
    }
    log.error('Failed to create relationtype:', error);
    return { success: false, error: 'Failed to create relationtype' };
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
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (process.env.NODE_ENV === 'development') {
    // electron-react-boilerplate renderer dev 서버 (기본 1212)
    mainWindow.loadURL('http://localhost:1212');
    if (isDebug) {
      mainWindow.webContents.openDevTools();
    }
  } else {
    // 패키징 또는 프로덕션 빌드 시 dist 폴더의 정적 파일 사용
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }
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
