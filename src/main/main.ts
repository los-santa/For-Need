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
import {
  HabitExpansionInput,
  HabitProperties,
  expandAndUpsertInstances,
  checkHabit,
  uncheckHabit,
  setQuantity,
  getTodayPending,
  getTodayDone,
  getAdherenceLastNDays,
  getCurrentStreak,
  getLongestStreak,
  onRRuleUpdated
} from './habitUtils';
import { v4 as uuidv4 } from 'uuid';
import { randomUUID } from 'crypto';
import { resolveHtmlPath } from './util';

// 세션 관리
let currentSessionId = uuidv4();

// 로깅 함수
interface LogEntry {
  action_type: string;
  target_type?: string;
  target_id?: string;
  details?: any;
  duration_ms?: number;
  error_message?: string;
}

function logUsage(entry: LogEntry) {
  try {
    const logData = {
      timestamp: new Date().toISOString(),
      session_id: currentSessionId,
      action_type: entry.action_type,
      target_type: entry.target_type || null,
      target_id: entry.target_id || null,
      details: entry.details ? JSON.stringify(entry.details) : null,
      duration_ms: entry.duration_ms || null,
      error_message: entry.error_message || null
    };

    db.prepare(`
      INSERT INTO USAGE_LOGS (timestamp, session_id, action_type, target_type, target_id, details, duration_ms, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      logData.timestamp,
      logData.session_id,
      logData.action_type,
      logData.target_type,
      logData.target_id,
      logData.details,
      logData.duration_ms,
      logData.error_message
    );
  } catch (error) {
    log.error('Failed to log usage:', error);
  }
}

// Before/After 관계 검증 함수
function validateBeforeAfterRelationships(cardId: string, field: string, value: any): { valid: boolean; error?: string; conflictCards?: any[] } {
  try {
    // 날짜/시간 관련 필드만 검증
    const dateFields = ['startdate', 'enddate', 'es', 'ls'];
    if (!dateFields.includes(field) || !value) {
      return { valid: true };
    }

    // 현재 카드가 참여하는 before/after 관계 조회
    const beforeAfterRelations = db.prepare(`
      SELECT
        r.relation_id,
        r.source,
        r.target,
        rt.typename,
        sc.title as source_title,
        tc.title as target_title,
        sc.startdate as source_startdate,
        sc.enddate as source_enddate,
        sc.es as source_es,
        sc.ls as source_ls,
        tc.startdate as target_startdate,
        tc.enddate as target_enddate,
        tc.es as target_es,
        tc.ls as target_ls
      FROM RELATION r
      JOIN RELATIONTYPE rt ON r.relationtype_id = rt.relationtype_id
      LEFT JOIN CARDS sc ON r.source = sc.id
      LEFT JOIN CARDS tc ON r.target = tc.id
      WHERE (r.source = ? OR r.target = ?)
        AND (rt.typename = 'before' OR rt.typename = 'after')
        AND r.deleted_at IS NULL
        AND rt.deleted_at IS NULL
        AND sc.deleted_at IS NULL
        AND tc.deleted_at IS NULL
    `).all(cardId, cardId);

    if (beforeAfterRelations.length === 0) {
      return { valid: true };
    }

    const conflictCards: any[] = [];

    // 각 관계에 대해 검증
    for (const relation of beforeAfterRelations) {
      const rel = relation as any;
      const isSource = rel.source === cardId;
      const isBefore = rel.typename === 'before';

      // 현재 카드의 새로운 값으로 임시 객체 생성
      const currentCard = {
        id: cardId,
        startdate: isSource ? (field === 'startdate' ? value : rel.source_startdate) : (field === 'startdate' ? value : rel.target_startdate),
        enddate: isSource ? (field === 'enddate' ? value : rel.source_enddate) : (field === 'enddate' ? value : rel.target_enddate),
        es: isSource ? (field === 'es' ? value : rel.source_es) : (field === 'es' ? value : rel.target_es),
        ls: isSource ? (field === 'ls' ? value : rel.source_ls) : (field === 'ls' ? value : rel.target_ls)
      };

      const otherCard = {
        id: isSource ? rel.target : rel.source,
        title: isSource ? rel.target_title : rel.source_title,
        startdate: isSource ? rel.target_startdate : rel.source_startdate,
        enddate: isSource ? rel.target_enddate : rel.source_enddate,
        es: isSource ? rel.target_es : rel.source_es,
        ls: isSource ? rel.target_ls : rel.source_ls
      };

      // 날짜 비교 함수
      const compareDates = (date1: string | null, date2: string | null): number => {
        if (!date1 && !date2) return 0;
        if (!date1) return -1;
        if (!date2) return 1;
        return new Date(date1).getTime() - new Date(date2).getTime();
      };

      // before 관계 검증
      if ((isSource && isBefore) || (!isSource && !isBefore)) {
        // 현재 카드가 before에 해당하는 경우 (또는 target이 after인 경우)

        // 주요 날짜 검증: startdate vs startdate, enddate vs enddate
        if (currentCard.startdate && otherCard.startdate) {
          if (compareDates(currentCard.startdate, otherCard.startdate) > 0) {
            conflictCards.push({
              ...otherCard,
              conflictType: 'startdate',
              message: `시작일이 ${otherCard.title}의 시작일보다 늦을 수 없습니다.`
            });
          }
        }

        if (currentCard.enddate && otherCard.startdate) {
          if (compareDates(currentCard.enddate, otherCard.startdate) > 0) {
            conflictCards.push({
              ...otherCard,
              conflictType: 'enddate_vs_startdate',
              message: `종료일이 ${otherCard.title}의 시작일보다 늦을 수 없습니다.`
            });
          }
        }

        if (currentCard.enddate && otherCard.enddate) {
          if (compareDates(currentCard.enddate, otherCard.enddate) > 0) {
            conflictCards.push({
              ...otherCard,
              conflictType: 'enddate',
              message: `종료일이 ${otherCard.title}의 종료일보다 늦을 수 없습니다.`
            });
          }
        }

        // ES/LS 검증
        if (currentCard.es && otherCard.es) {
          if (compareDates(currentCard.es, otherCard.es) > 0) {
            conflictCards.push({
              ...otherCard,
              conflictType: 'es',
              message: `ES(빠른 시작일)가 ${otherCard.title}의 ES보다 늦을 수 없습니다.`
            });
          }
        }

        if (currentCard.ls && otherCard.ls) {
          if (compareDates(currentCard.ls, otherCard.ls) > 0) {
            conflictCards.push({
              ...otherCard,
              conflictType: 'ls',
              message: `LS(늦은 시작일)가 ${otherCard.title}의 LS보다 늦을 수 없습니다.`
            });
          }
        }
      }
    }

    if (conflictCards.length > 0) {
      return {
        valid: false,
        error: 'before_after_conflict',
        conflictCards: conflictCards
      };
    }

    return { valid: true };
  } catch (error) {
    log.error('Failed to validate before/after relationships:', error);
    return { valid: true }; // 검증 실패 시 업데이트 허용
  }
}

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
  const startTime = Date.now();
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

    logUsage({
      action_type: 'create_relation',
      target_type: 'relation',
      details: {
        relationtype_id: data.relationtype_id,
        source: data.source,
        target: data.target,
        project_id: data.project_id
      },
      duration_ms: Date.now() - startTime
    });

    return { success: true };
  } catch (error) {
    logUsage({
      action_type: 'create_relation',
      target_type: 'relation',
      error_message: error instanceof Error ? error.message : String(error),
      details: data,
      duration_ms: Date.now() - startTime
    });
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
    const cards = db.prepare('SELECT id, title, cardtype FROM CARDS WHERE deleted_at IS NULL').all() as Card[];
    return { success: true, data: cards };
  } catch (error) {
    log.error('Failed to get cards:', error);
    return { success: false, error: 'Failed to get cards' };
  }
});

// 카드 생성 IPC
ipcMain.handle('create-card', async (_, payload: { title: string; project_id?: string }) => {
  const startTime = Date.now();
  try {
    const title = payload.title.trim();
    // 카드명 중복 확인 (프로젝트별)
    let duplicateCheckQuery: string;
    let duplicateCheckParams: any[];

    if (payload.project_id) {
      // 같은 프로젝트 내에서 중복 확인
      duplicateCheckQuery = `
        SELECT id FROM CARDS 
        WHERE title = ? AND project_id = ? AND deleted_at IS NULL
      `;
      duplicateCheckParams = [title, payload.project_id];
    } else {
      // 프로젝트가 없는 카드들 중에서 중복 확인
      duplicateCheckQuery = `
        SELECT id FROM CARDS 
        WHERE title = ? AND project_id IS NULL AND deleted_at IS NULL
      `;
      duplicateCheckParams = [title];
    }

    const exists = db.prepare(duplicateCheckQuery).get(...duplicateCheckParams);
    if (exists) {
      logUsage({
        action_type: 'create_card',
        target_type: 'card',
        error_message: 'Duplicate title in project',
        details: { title, project_id: payload.project_id },
        duration_ms: Date.now() - startTime
      });
      return { success: false, error: 'duplicate-title-in-project' };
    }

    // 'todo' 카드타입 ID 가져오기
    const todoCardType = db.prepare("SELECT cardtype_id FROM CARDTYPES WHERE cardtype_name = 'todo'").get() as any;
    const defaultCardTypeId = todoCardType ? todoCardType.cardtype_id : null;

    const id = randomUUID();
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO CARDS (id, project_id, title, cardtype, createdat) VALUES (?, ?, ?, ?, ?)`,
    ).run(id, payload.project_id ?? null, title, defaultCardTypeId, now);

    logUsage({
      action_type: 'create_card',
      target_type: 'card',
      target_id: id,
      details: { title, project_id: payload.project_id, cardtype_id: defaultCardTypeId },
      duration_ms: Date.now() - startTime
    });

    return { success: true, data: { id } };
  } catch (error) {
    logUsage({
      action_type: 'create_card',
      target_type: 'card',
      error_message: error instanceof Error ? error.message : String(error),
      duration_ms: Date.now() - startTime
    });
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
    const rows = db.prepare('SELECT cardtype_id, cardtype_name, createdat FROM CARDTYPES WHERE deleted_at IS NULL').all();
    return { success: true, data: rows };
  } catch (error) {
    log.error('Failed to get cardtypes:', error);
    return { success: false, error: 'Failed to get cardtypes' };
  }
});

ipcMain.handle('get-relationtypes', async () => {
  try {
    const rows = db.prepare('SELECT relationtype_id, typename, oppsite, set_value, createdat FROM RELATIONTYPE WHERE deleted_at IS NULL').all();
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
  const startTime = Date.now();
  try {
    const now = new Date().toISOString();
    const stmt = db.prepare('INSERT INTO CARDTYPES (cardtype_name, createdat) VALUES (?, ?)');
    const info = stmt.run(payload.name.trim(), now);
    const id = info.lastInsertRowid as number;

    logUsage({
      action_type: 'create_cardtype',
      target_type: 'cardtype',
      target_id: String(id),
      details: { name: payload.name.trim() },
      duration_ms: Date.now() - startTime
    });

    return { success: true, data: { id } };
  } catch (error) {
    // 카드타입 이름이 이미 존재할 경우 해당 id 반환
    try {
      const row = db.prepare('SELECT cardtype_id FROM CARDTYPES WHERE cardtype_name = ?').get(payload.name.trim());
      if (row) {
        logUsage({
          action_type: 'create_cardtype',
          target_type: 'cardtype',
          target_id: String((row as any).cardtype_id),
          details: { name: payload.name.trim(), existing: true },
          duration_ms: Date.now() - startTime
        });
        return { success: true, data: { id: (row as any).cardtype_id } };
      }
    } catch (innerErr) {
      log.error('Failed to fetch existing cardtype:', innerErr);
    }

    logUsage({
      action_type: 'create_cardtype',
      target_type: 'cardtype',
      error_message: error instanceof Error ? error.message : String(error),
      details: { name: payload.name.trim() },
      duration_ms: Date.now() - startTime
    });

    log.error('Failed to create cardtype:', error);
    return { success: false, error: 'Failed to create cardtype' };
  }
});

// ------------------------------------------------------------------
// RelationType creation
// ------------------------------------------------------------------
ipcMain.handle('create-relationtype', async (_, payload: { typename: string; oppsite: string }) => {
  const startTime = Date.now();
  try {
    const now = new Date().toISOString();
    const typename = payload.typename.trim();
    const opposite = payload.oppsite.trim();
    if(!opposite){
      logUsage({
        action_type: 'create_relationtype',
        target_type: 'relationtype',
        error_message: 'Empty opposite',
        details: { typename, opposite },
        duration_ms: Date.now() - startTime
      });
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

    logUsage({
      action_type: 'create_relationtype',
      target_type: 'relationtype',
      target_id: String(mainId),
      details: { typename, opposite, oppId },
      duration_ms: Date.now() - startTime
    });

    return { success: true, data: { id: mainId } };
  } catch (error) {
    logUsage({
      action_type: 'create_relationtype',
      target_type: 'relationtype',
      error_message: error instanceof Error ? error.message : String(error),
      details: payload,
      duration_ms: Date.now() - startTime
    });
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
// Soft Delete CardType
// ------------------------------------------------------------------
ipcMain.handle('delete-cardtype', async (_, cardtype_id: number) => {
  try {
    // 소프트 삭제: deleted_at 필드를 현재 시간으로 설정
    db.prepare('UPDATE CARDTYPES SET deleted_at = datetime("now") WHERE cardtype_id = ?').run(cardtype_id);
    return { success: true };
  } catch (error) {
    log.error('Failed to soft delete cardtype:', error);
    return { success: false, error: 'Failed to soft delete cardtype' };
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
// Soft Delete RelationType
// ------------------------------------------------------------------
ipcMain.handle('delete-relationtype', async (_, relationtype_id: number) => {
  try {
    const row = db.prepare('SELECT typename, oppsite FROM RELATIONTYPE WHERE relationtype_id = ?').get(relationtype_id) as any;
    if(!row) return { success:false, error:'not-found'};
    const { typename, oppsite } = row;

    // 소프트 삭제: 해당 관계타입과 반대 관계타입 모두 deleted_at 설정
    const tx = db.transaction(() => {
      db.prepare('UPDATE RELATIONTYPE SET deleted_at = datetime("now") WHERE relationtype_id = ?').run(relationtype_id);
      db.prepare('UPDATE RELATIONTYPE SET deleted_at = datetime("now") WHERE typename = ?').run(oppsite);
    });
    tx();
    return { success: true };
  } catch (error) {
    log.error('Failed to soft delete relationtype:', error);
    return { success: false, error: 'Failed to soft delete relationtype' };
  }
});

// ------------------------------------------------------------------
// Soft Delete Relation
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

    // 소프트 삭제: deleted_at 필드 설정
    const softDel = db.prepare('UPDATE RELATION SET deleted_at = datetime("now") WHERE relation_id = ?');
    const softDelByProps = db.prepare('UPDATE RELATION SET deleted_at = datetime("now") WHERE relationtype_id = ? AND source = ? AND target = ? AND deleted_at IS NULL');

    const tx = db.transaction(() => {
      softDel.run(relation_id);
      if (oppRelId !== null) {
        softDelByProps.run(oppRelId, target, source);
      }
    });
    tx();

    return { success: true };
  } catch (error) {
    log.error('Failed to soft delete relation:', error);
    return { success: false, error: 'Failed to soft delete relation' };
  }
});

// ------------------------------------------------------------------
// Get all relations (simple list) - only non-deleted
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
      WHERE r.deleted_at IS NULL
        AND rt.deleted_at IS NULL
        AND sc.deleted_at IS NULL
        AND tc.deleted_at IS NULL
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
  const startTime = Date.now();
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
      logUsage({
        action_type: 'update_card',
        target_type: 'card',
        target_id: payload.card_id,
        error_message: 'Field not allowed',
        details: { field: payload.field },
        duration_ms: Date.now() - startTime
      });
      return { success: false, error: 'field-not-allowed' };
    }

    // Before/After 관계 검증
    const validation = validateBeforeAfterRelationships(payload.card_id, payload.field, payload.value);
    if (!validation.valid) {
      logUsage({
        action_type: 'update_card',
        target_type: 'card',
        target_id: payload.card_id,
        error_message: 'Before/After relationship conflict',
        details: { field: payload.field, value: payload.value, conflicts: validation.conflictCards },
        duration_ms: Date.now() - startTime
      });
      return {
        success: false,
        error: validation.error,
        conflictCards: validation.conflictCards
      };
    }

    const stmt = db.prepare(`UPDATE CARDS SET ${payload.field} = ? WHERE id = ?`);
    stmt.run(payload.value, payload.card_id);

    logUsage({
      action_type: 'update_card',
      target_type: 'card',
      target_id: payload.card_id,
      details: { field: payload.field, value: payload.value },
      duration_ms: Date.now() - startTime
    });

    return { success: true };
  } catch (error) {
    logUsage({
      action_type: 'update_card',
      target_type: 'card',
      target_id: payload.card_id,
      error_message: error instanceof Error ? error.message : String(error),
      details: payload,
      duration_ms: Date.now() - startTime
    });
    log.error('Failed to update card field:', error);
    return { success: false, error: 'Failed to update card field' };
  }
});

// ------------------------------------------------------------------
// Soft Delete Card
// ------------------------------------------------------------------
ipcMain.handle('delete-card', async (_, card_id: string) => {
  const startTime = Date.now();
  try {
    // 카드 정보 조회 (로그용)
    const cardInfo = db.prepare('SELECT title FROM CARDS WHERE id = ?').get(card_id) as any;

    // 소프트 삭제: deleted_at 필드를 현재 시간으로 설정
    db.prepare('UPDATE CARDS SET deleted_at = datetime("now") WHERE id = ?').run(card_id);

    logUsage({
      action_type: 'delete_card',
      target_type: 'card',
      target_id: card_id,
      details: { title: cardInfo?.title },
      duration_ms: Date.now() - startTime
    });

    return { success: true };
  } catch (error) {
    logUsage({
      action_type: 'delete_card',
      target_type: 'card',
      target_id: card_id,
      error_message: error instanceof Error ? error.message : String(error),
      duration_ms: Date.now() - startTime
    });
    log.error('Failed to soft delete card:', error);
    return { success: false, error: 'Failed to soft delete card' };
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
  } catch (error: any) {
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
    let alias = db.prepare('SELECT * FROM ALIAS WHERE alias_name = ?').get(alias_name.trim()) as any;
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
    let alias = db.prepare('SELECT * FROM ALIAS WHERE alias_name = ?').get(alias_name.trim()) as any;
    if (!alias) {
      const result = db.prepare('INSERT INTO ALIAS (alias_name, createdat) VALUES (?, ?)')
        .run(alias_name.trim(), now);
      alias = { alias_id: result.lastInsertRowid, alias_name: alias_name.trim(), createdat: now };
    }

    // 이미 해당 카드에 이 별칭이 있는지 확인
    const existing = db.prepare('SELECT * FROM CURRENT_ALIAS WHERE card_id = ? AND alias_id = ?')
      .get(card_id, alias.alias_id) as any;

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

// 개발자 콘솔 자동 열림 비활성화
// if (isDebug) {
//   require('electron-debug').default();
// }

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
  const isDev = process.env.NODE_ENV === 'development';

    const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    title: 'ForNeed',
    show: false, // 모든 모드에서 자동으로 보이지 않도록
    alwaysOnTop: false,
    focusable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  // ready-to-show 이벤트 후에 포커스 없이 보여주기
  mainWindow.once('ready-to-show', () => {
    if (isDev) {
      mainWindow.showInactive(); // 개발 모드에서는 포커스 없이
    } else {
      mainWindow.show(); // 프로덕션에서는 일반적으로 보여주기
    }
  });
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

// ------------------------------------------------------------------
// 휴지통 관련 API들
// ------------------------------------------------------------------

// 삭제된 카드 목록 조회
ipcMain.handle('get-deleted-cards', async () => {
  try {
    const rows = db.prepare(`
      SELECT c.id, c.title, c.deleted_at, ct.cardtype_name
      FROM CARDS c
      LEFT JOIN CARDTYPES ct ON ct.cardtype_id = c.cardtype
      WHERE c.deleted_at IS NOT NULL
      ORDER BY c.deleted_at DESC
    `).all();
    return { success: true, data: rows };
  } catch (error) {
    log.error('Failed to get deleted cards:', error);
    return { success: false, error: 'Failed to get deleted cards' };
  }
});

// 삭제된 관계 목록 조회
ipcMain.handle('get-deleted-relations', async () => {
  try {
    const rows = db.prepare(`
      SELECT r.relation_id, r.relationtype_id, rt.typename, r.source, sc.title AS source_title,
             r.target, tc.title AS target_title, r.deleted_at
      FROM RELATION r
      LEFT JOIN RELATIONTYPE rt ON rt.relationtype_id = r.relationtype_id
      LEFT JOIN CARDS sc ON sc.id = r.source
      LEFT JOIN CARDS tc ON tc.id = r.target
      WHERE r.deleted_at IS NOT NULL
      ORDER BY r.deleted_at DESC
    `).all();
    return { success: true, data: rows };
  } catch (error) {
    log.error('Failed to get deleted relations:', error);
    return { success: false, error: 'Failed to get deleted relations' };
  }
});

// 삭제된 카드타입 목록 조회
ipcMain.handle('get-deleted-cardtypes', async () => {
  try {
    const rows = db.prepare(`
      SELECT cardtype_id, cardtype_name, deleted_at
      FROM CARDTYPES
      WHERE deleted_at IS NOT NULL
      ORDER BY deleted_at DESC
    `).all();
    return { success: true, data: rows };
  } catch (error) {
    log.error('Failed to get deleted cardtypes:', error);
    return { success: false, error: 'Failed to get deleted cardtypes' };
  }
});

// 삭제된 관계타입 목록 조회
ipcMain.handle('get-deleted-relationtypes', async () => {
  try {
    const rows = db.prepare(`
      SELECT relationtype_id, typename, oppsite, deleted_at
      FROM RELATIONTYPE
      WHERE deleted_at IS NOT NULL
      ORDER BY deleted_at DESC
    `).all();
    return { success: true, data: rows };
  } catch (error) {
    log.error('Failed to get deleted relationtypes:', error);
    return { success: false, error: 'Failed to get deleted relationtypes' };
  }
});

// 개별 복구 함수들
ipcMain.handle('restore-card', async (_, card_id: string) => {
  try {
    db.prepare('UPDATE CARDS SET deleted_at = NULL WHERE id = ?').run(card_id);
    return { success: true };
  } catch (error) {
    log.error('Failed to restore card:', error);
    return { success: false, error: 'Failed to restore card' };
  }
});

ipcMain.handle('restore-relation', async (_, relation_id: number) => {
  try {
    db.prepare('UPDATE RELATION SET deleted_at = NULL WHERE relation_id = ?').run(relation_id);
    return { success: true };
  } catch (error) {
    log.error('Failed to restore relation:', error);
    return { success: false, error: 'Failed to restore relation' };
  }
});

ipcMain.handle('restore-cardtype', async (_, cardtype_id: number) => {
  try {
    db.prepare('UPDATE CARDTYPES SET deleted_at = NULL WHERE cardtype_id = ?').run(cardtype_id);
    return { success: true };
  } catch (error) {
    log.error('Failed to restore cardtype:', error);
    return { success: false, error: 'Failed to restore cardtype' };
  }
});

ipcMain.handle('restore-relationtype', async (_, relationtype_id: number) => {
  try {
    db.prepare('UPDATE RELATIONTYPE SET deleted_at = NULL WHERE relationtype_id = ?').run(relationtype_id);
    return { success: true };
  } catch (error) {
    log.error('Failed to restore relationtype:', error);
    return { success: false, error: 'Failed to restore relationtype' };
  }
});

// 영구 삭제 함수들
ipcMain.handle('permanent-delete-card', async (_, card_id: string) => {
  try {
    db.prepare('DELETE FROM CARDS WHERE id = ?').run(card_id);
    return { success: true };
  } catch (error) {
    log.error('Failed to permanently delete card:', error);
    return { success: false, error: 'Failed to permanently delete card' };
  }
});

ipcMain.handle('permanent-delete-relation', async (_, relation_id: number) => {
  try {
    db.prepare('DELETE FROM RELATION WHERE relation_id = ?').run(relation_id);
    return { success: true };
  } catch (error) {
    log.error('Failed to permanently delete relation:', error);
    return { success: false, error: 'Failed to permanently delete relation' };
  }
});

ipcMain.handle('permanent-delete-cardtype', async (_, cardtype_id: number) => {
  try {
    db.prepare('DELETE FROM CARDTYPES WHERE cardtype_id = ?').run(cardtype_id);
    return { success: true };
  } catch (error) {
    log.error('Failed to permanently delete cardtype:', error);
    return { success: false, error: 'Failed to permanently delete cardtype' };
  }
});

ipcMain.handle('permanent-delete-relationtype', async (_, relationtype_id: number) => {
  try {
    db.prepare('DELETE FROM RELATIONTYPE WHERE relationtype_id = ?').run(relationtype_id);
    return { success: true };
  } catch (error) {
    log.error('Failed to permanently delete relationtype:', error);
    return { success: false, error: 'Failed to permanently delete relationtype' };
  }
});

// 전체 복구 함수들
ipcMain.handle('restore-all-cards', async () => {
  try {
    const result = db.prepare('UPDATE CARDS SET deleted_at = NULL WHERE deleted_at IS NOT NULL').run();
    return { success: true, data: { restored: result.changes } };
  } catch (error) {
    log.error('Failed to restore all cards:', error);
    return { success: false, error: 'Failed to restore all cards' };
  }
});

ipcMain.handle('restore-all-relations', async () => {
  try {
    const result = db.prepare('UPDATE RELATION SET deleted_at = NULL WHERE deleted_at IS NOT NULL').run();
    return { success: true, data: { restored: result.changes } };
  } catch (error) {
    log.error('Failed to restore all relations:', error);
    return { success: false, error: 'Failed to restore all relations' };
  }
});

ipcMain.handle('restore-all-cardtypes', async () => {
  try {
    const result = db.prepare('UPDATE CARDTYPES SET deleted_at = NULL WHERE deleted_at IS NOT NULL').run();
    return { success: true, data: { restored: result.changes } };
  } catch (error) {
    log.error('Failed to restore all cardtypes:', error);
    return { success: false, error: 'Failed to restore all cardtypes' };
  }
});

ipcMain.handle('restore-all-relationtypes', async () => {
  try {
    const result = db.prepare('UPDATE RELATIONTYPE SET deleted_at = NULL WHERE deleted_at IS NOT NULL').run();
    return { success: true, data: { restored: result.changes } };
  } catch (error) {
    log.error('Failed to restore all relationtypes:', error);
    return { success: false, error: 'Failed to restore all relationtypes' };
  }
});

// 전체 영구 삭제 함수들
ipcMain.handle('clear-all-cards', async () => {
  try {
    const result = db.prepare('DELETE FROM CARDS WHERE deleted_at IS NOT NULL').run();
    return { success: true, data: { deleted: result.changes } };
  } catch (error) {
    log.error('Failed to clear all cards:', error);
    return { success: false, error: 'Failed to clear all cards' };
  }
});

ipcMain.handle('clear-all-relations', async () => {
  try {
    const result = db.prepare('DELETE FROM RELATION WHERE deleted_at IS NOT NULL').run();
    return { success: true, data: { deleted: result.changes } };
  } catch (error) {
    log.error('Failed to clear all relations:', error);
    return { success: false, error: 'Failed to clear all relations' };
  }
});

ipcMain.handle('clear-all-cardtypes', async () => {
  try {
    const result = db.prepare('DELETE FROM CARDTYPES WHERE deleted_at IS NOT NULL').run();
    return { success: true, data: { deleted: result.changes } };
  } catch (error) {
    log.error('Failed to clear all cardtypes:', error);
    return { success: false, error: 'Failed to clear all cardtypes' };
  }
});

ipcMain.handle('clear-all-relationtypes', async () => {
  try {
    const result = db.prepare('DELETE FROM RELATIONTYPE WHERE deleted_at IS NOT NULL').run();
    return { success: true, data: { deleted: result.changes } };
  } catch (error) {
    log.error('Failed to clear all relationtypes:', error);
    return { success: false, error: 'Failed to clear all relationtypes' };
  }
});

// ------------------------------------------------------------------
// 사용로그 분석 API들
// ------------------------------------------------------------------

// 페이지 방문 로깅
ipcMain.handle('log-page-visit', async (_, page: string) => {
  logUsage({
    action_type: 'navigate_to_page',
    target_type: 'page',
    target_id: page
  });
  return { success: true };
});

// 기본 통계 조회
ipcMain.handle('get-usage-stats', async () => {
  try {
    const stats = {
      // 기본 카운트
      total_actions: db.prepare('SELECT COUNT(*) as count FROM USAGE_LOGS').get() as any,
      total_sessions: db.prepare('SELECT COUNT(DISTINCT session_id) as count FROM USAGE_LOGS').get() as any,
      total_cards_created: db.prepare("SELECT COUNT(*) as count FROM USAGE_LOGS WHERE action_type = 'create_card' AND error_message IS NULL").get() as any,
      total_relations_created: db.prepare("SELECT COUNT(*) as count FROM USAGE_LOGS WHERE action_type = 'create_relation' AND error_message IS NULL").get() as any,
      total_cards_deleted: db.prepare("SELECT COUNT(*) as count FROM USAGE_LOGS WHERE action_type = 'delete_card' AND error_message IS NULL").get() as any,

      // 에러 통계
      total_errors: db.prepare('SELECT COUNT(*) as count FROM USAGE_LOGS WHERE error_message IS NOT NULL').get() as any,

      // 최근 7일 활동
      last_7_days_actions: db.prepare(`
        SELECT COUNT(*) as count
        FROM USAGE_LOGS
        WHERE datetime(timestamp) >= datetime('now', '-7 days')
      `).get() as any,

      // 평균 세션 시간 (분)
      avg_session_duration: db.prepare(`
        SELECT AVG(session_duration) as avg_minutes
        FROM (
          SELECT
            session_id,
            (julianday(MAX(timestamp)) - julianday(MIN(timestamp))) * 24 * 60 as session_duration
          FROM USAGE_LOGS
          GROUP BY session_id
          HAVING COUNT(*) > 1
        )
      `).get() as any
    };

    return { success: true, data: stats };
  } catch (error) {
    log.error('Failed to get usage stats:', error);
    return { success: false, error: 'Failed to get usage stats' };
  }
});

// 기능별 사용 빈도
ipcMain.handle('get-action-frequency', async () => {
  try {
    const frequency = db.prepare(`
      SELECT
        action_type,
        COUNT(*) as count,
        COUNT(CASE WHEN error_message IS NULL THEN 1 END) as success_count,
        COUNT(CASE WHEN error_message IS NOT NULL THEN 1 END) as error_count,
        AVG(duration_ms) as avg_duration_ms
      FROM USAGE_LOGS
      GROUP BY action_type
      ORDER BY count DESC
    `).all();

    return { success: true, data: frequency };
  } catch (error) {
    log.error('Failed to get action frequency:', error);
    return { success: false, error: 'Failed to get action frequency' };
  }
});

// 시간대별 활동 패턴
ipcMain.handle('get-hourly-activity', async () => {
  try {
    const activity = db.prepare(`
      SELECT
        strftime('%H', timestamp) as hour,
        COUNT(*) as action_count
      FROM USAGE_LOGS
      WHERE datetime(timestamp) >= datetime('now', '-30 days')
      GROUP BY strftime('%H', timestamp)
      ORDER BY hour
    `).all();

    return { success: true, data: activity };
  } catch (error) {
    log.error('Failed to get hourly activity:', error);
    return { success: false, error: 'Failed to get hourly activity' };
  }
});

// 일별 활동 패턴 (최근 30일)
ipcMain.handle('get-daily-activity', async () => {
  try {
    const activity = db.prepare(`
      SELECT
        DATE(timestamp) as date,
        COUNT(*) as action_count,
        COUNT(DISTINCT session_id) as session_count,
        COUNT(CASE WHEN action_type = 'create_card' THEN 1 END) as cards_created,
        COUNT(CASE WHEN action_type = 'create_relation' THEN 1 END) as relations_created
      FROM USAGE_LOGS
      WHERE datetime(timestamp) >= datetime('now', '-30 days')
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
    `).all();

    return { success: true, data: activity };
  } catch (error) {
    log.error('Failed to get daily activity:', error);
    return { success: false, error: 'Failed to get daily activity' };
  }
});

// 에러 분석
ipcMain.handle('get-error-analysis', async () => {
  try {
    const errors = db.prepare(`
      SELECT
        action_type,
        error_message,
        COUNT(*) as count,
        MAX(timestamp) as last_occurrence
      FROM USAGE_LOGS
      WHERE error_message IS NOT NULL
      GROUP BY action_type, error_message
      ORDER BY count DESC, last_occurrence DESC
    `).all();

    return { success: true, data: errors };
  } catch (error) {
    log.error('Failed to get error analysis:', error);
    return { success: false, error: 'Failed to get error analysis' };
  }
});

// 최근 활동 로그
ipcMain.handle('get-recent-logs', async (_, limit: number = 100) => {
  try {
    const logs = db.prepare(`
      SELECT
        timestamp,
        action_type,
        target_type,
        target_id,
        details,
        duration_ms,
        error_message
      FROM USAGE_LOGS
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(limit);

    return { success: true, data: logs };
  } catch (error) {
    log.error('Failed to get recent logs:', error);
    return { success: false, error: 'Failed to get recent logs' };
  }
});

// 세션별 분석
ipcMain.handle('get-session-analysis', async () => {
  try {
    const sessions = db.prepare(`
      SELECT
        session_id,
        MIN(timestamp) as start_time,
        MAX(timestamp) as end_time,
        COUNT(*) as action_count,
        (julianday(MAX(timestamp)) - julianday(MIN(timestamp))) * 24 * 60 as duration_minutes,
        COUNT(CASE WHEN action_type = 'create_card' THEN 1 END) as cards_created,
        COUNT(CASE WHEN action_type = 'create_relation' THEN 1 END) as relations_created,
        COUNT(CASE WHEN error_message IS NOT NULL THEN 1 END) as errors
      FROM USAGE_LOGS
      GROUP BY session_id
      ORDER BY start_time DESC
      LIMIT 50
    `).all();

    return { success: true, data: sessions };
  } catch (error) {
    log.error('Failed to get session analysis:', error);
    return { success: false, error: 'Failed to get session analysis' };
  }
});

// =========================
// 습관 추적 IPC 핸들러들
// =========================

// 습관 속성 생성/수정
ipcMain.handle('create-habit', async (event, habitData: Partial<HabitProperties>) => {
  try {
    logUsage({
      action_type: 'create-habit',
      target_type: 'habit',
      target_id: habitData.cardId,
      details: { rrule: habitData.rrule }
    });

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO habit_properties (
        card_id, dtstart_local, tzid, rrule, rdates_json, exdates_json, wkst,
        until_utc, count_limit, duration_minutes, min_spacing_minutes,
        unit_label, target_per_occurrence, max_per_day, rollover_mode,
        weekly_quota, monthly_quota, adherence_target,
        notify_enabled, notify_before_min, notify_at_local,
        status, start_date, end_date, color_hex, icon, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      habitData.cardId,
      habitData.dtstartLocal,
      habitData.tzid,
      habitData.rrule,
      habitData.rdatesJson || null,
      habitData.exdatesJson || null,
      habitData.wkst || 'MO',
      habitData.untilUtc || null,
      habitData.countLimit || null,
      habitData.durationMinutes || 0,
      habitData.minSpacingMinutes || 0,
      habitData.unitLabel || null,
      habitData.targetPerOccurrence || 1,
      habitData.maxPerDay || null,
      habitData.rolloverMode || 'none',
      habitData.weeklyQuota || null,
      habitData.monthlyQuota || null,
      habitData.adherenceTarget || null,
      habitData.notifyEnabled || 0,
      habitData.notifyBeforeMin || null,
      habitData.notifyAtLocal || null,
      habitData.status || 'active',
      habitData.startDate || null,
      habitData.endDate || null,
      habitData.colorHex || null,
      habitData.icon || null,
      habitData.notes || null
    );

    return { success: true, data: { cardId: habitData.cardId } };
  } catch (error) {
    log.error('Failed to create habit:', error);
    logUsage({
      action_type: 'create-habit',
      error_message: String(error)
    });
    return { success: false, error: 'Failed to create habit' };
  }
});

// 습관 속성 조회
ipcMain.handle('get-habit', async (event, cardId: string) => {
  try {
    const habit = db.prepare('SELECT * FROM habit_properties WHERE card_id = ? AND deleted_at IS NULL').get(cardId);
    return { success: true, data: habit };
  } catch (error) {
    log.error('Failed to get habit:', error);
    return { success: false, error: 'Failed to get habit' };
  }
});

// 모든 습관 조회
ipcMain.handle('get-habits', async () => {
  try {
    const habits = db.prepare(`
      SELECT 
        hp.*,
        c.title,
        c.content
      FROM habit_properties hp
      JOIN CARDS c ON hp.card_id = c.id
      WHERE hp.deleted_at IS NULL 
      AND c.deleted_at IS NULL
      ORDER BY hp.created_at DESC
    `).all();
    
    return { success: true, data: habits };
  } catch (error) {
    log.error('Failed to get habits:', error);
    return { success: false, error: 'Failed to get habits' };
  }
});

// 습관 속성 업데이트
ipcMain.handle('update-habit', async (event, cardId: string, updates: Partial<HabitProperties>) => {
  try {
    // 기존 데이터 조회
    const oldHabit = db.prepare('SELECT * FROM habit_properties WHERE card_id = ?').get(cardId);
    if (!oldHabit) {
      return { success: false, error: 'Habit not found' };
    }

    // 업데이트 쿼리 생성
    const updateFields: string[] = [];
    const values: any[] = [];
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = ?`);
        values.push(value);
      }
    });
    
    if (updateFields.length === 0) {
      return { success: true, data: oldHabit };
    }
    
    values.push(cardId);
    
    const updateStmt = db.prepare(`
      UPDATE habit_properties 
      SET ${updateFields.join(', ')} 
      WHERE card_id = ?
    `);
    
    updateStmt.run(...values);
    
    // RRULE 관련 변경사항이 있다면 캐시 재전개
    const rruleChanged = updates.rrule || updates.dtstartLocal || updates.tzid || 
                        updates.rdatesJson || updates.exdatesJson;
    
    if (rruleChanged) {
      const newHabit = db.prepare('SELECT * FROM habit_properties WHERE card_id = ?').get(cardId) as HabitProperties;
      await onRRuleUpdated(db, cardId, oldHabit, newHabit);
    }

    return { success: true, data: { cardId } };
  } catch (error) {
    log.error('Failed to update habit:', error);
    return { success: false, error: 'Failed to update habit' };
  }
});

// 습관 삭제 (소프트 삭제)
ipcMain.handle('delete-habit', async (event, cardId: string) => {
  try {
    const stmt = db.prepare(`
      UPDATE habit_properties 
      SET deleted_at = datetime('now') 
      WHERE card_id = ?
    `);
    
    stmt.run(cardId);
    
    return { success: true, data: { cardId } };
  } catch (error) {
    log.error('Failed to delete habit:', error);
    return { success: false, error: 'Failed to delete habit' };
  }
});

// RRULE 전개 및 캐시 생성
ipcMain.handle('expand-habit-instances', async (event, input: HabitExpansionInput) => {
  try {
    await expandAndUpsertInstances(db, input);
    return { success: true };
  } catch (error) {
    log.error('Failed to expand habit instances:', error);
    return { success: false, error: 'Failed to expand habit instances' };
  }
});

// 습관 체크
ipcMain.handle('check-habit', async (event, cardId: string, occurrenceKey: string, quantity?: number, note?: string) => {
  try {
    logUsage({
      action_type: 'check-habit',
      target_type: 'habit',
      target_id: cardId,
      details: { occurrenceKey, quantity: quantity || 1 }
    });

    await checkHabit(db, cardId, occurrenceKey, quantity, note);
    return { success: true };
  } catch (error) {
    log.error('Failed to check habit:', error);
    logUsage({
      action_type: 'check-habit',
      error_message: String(error)
    });
    return { success: false, error: 'Failed to check habit' };
  }
});

// 습관 언체크
ipcMain.handle('uncheck-habit', async (event, cardId: string, occurrenceKey: string) => {
  try {
    logUsage({
      action_type: 'uncheck-habit',
      target_type: 'habit',
      target_id: cardId,
      details: { occurrenceKey }
    });

    await uncheckHabit(db, cardId, occurrenceKey);
    return { success: true };
  } catch (error) {
    log.error('Failed to uncheck habit:', error);
    logUsage({
      action_type: 'uncheck-habit',
      error_message: String(error)
    });
    return { success: false, error: 'Failed to uncheck habit' };
  }
});

// 습관 수량 설정
ipcMain.handle('set-habit-quantity', async (event, cardId: string, occurrenceKey: string, quantity: number) => {
  try {
    logUsage({
      action_type: 'set-habit-quantity',
      target_type: 'habit',
      target_id: cardId,
      details: { occurrenceKey, quantity }
    });

    await setQuantity(db, cardId, occurrenceKey, quantity);
    return { success: true };
  } catch (error) {
    log.error('Failed to set habit quantity:', error);
    logUsage({
      action_type: 'set-habit-quantity',
      error_message: String(error)
    });
    return { success: false, error: 'Failed to set habit quantity' };
  }
});

// 오늘 미완료 습관 조회
ipcMain.handle('get-today-pending-habits', async (event, localDayStartIso: string, localDayEndIso: string, tzid: string) => {
  try {
    const habits = await getTodayPending(db, localDayStartIso, localDayEndIso, tzid);
    return { success: true, data: habits };
  } catch (error) {
    log.error('Failed to get today pending habits:', error);
    return { success: false, error: 'Failed to get today pending habits' };
  }
});

// 오늘 완료된 습관 조회
ipcMain.handle('get-today-done-habits', async (event, localDayStartIso: string, localDayEndIso: string, tzid: string) => {
  try {
    const habits = await getTodayDone(db, localDayStartIso, localDayEndIso, tzid);
    return { success: true, data: habits };
  } catch (error) {
    log.error('Failed to get today done habits:', error);
    return { success: false, error: 'Failed to get today done habits' };
  }
});

// 습관 달성률 조회
ipcMain.handle('get-habit-adherence', async (event, cardId: string, days?: number) => {
  try {
    const adherence = await getAdherenceLastNDays(db, cardId, days);
    return { success: true, data: { adherence } };
  } catch (error) {
    log.error('Failed to get habit adherence:', error);
    return { success: false, error: 'Failed to get habit adherence' };
  }
});

// 현재 스트릭 조회
ipcMain.handle('get-current-streak', async (event, cardId: string) => {
  try {
    const streak = await getCurrentStreak(db, cardId);
    return { success: true, data: { streak } };
  } catch (error) {
    log.error('Failed to get current streak:', error);
    return { success: false, error: 'Failed to get current streak' };
  }
});

// 최장 스트릭 조회
ipcMain.handle('get-longest-streak', async (event, cardId: string) => {
  try {
    const streak = await getLongestStreak(db, cardId);
    return { success: true, data: { streak } };
  } catch (error) {
    log.error('Failed to get longest streak:', error);
    return { success: false, error: 'Failed to get longest streak' };
  }
});

// 습관 인스턴스 조회 (특정 기간)
ipcMain.handle('get-habit-instances', async (event, cardId: string, startUtc: string, endUtc: string) => {
  try {
    const instances = db.prepare(`
      SELECT 
        hic.*,
        CASE WHEN hl.id IS NOT NULL THEN 1 ELSE 0 END as is_completed,
        hl.done_quantity,
        hl.note,
        hl.updated_at as completed_at
      FROM habit_instances_cache hic
      LEFT JOIN habit_logs hl ON hic.card_id = hl.card_id AND hic.occurrence_key = hl.occurrence_key
      WHERE hic.card_id = ?
      AND hic.start_utc >= ?
      AND hic.start_utc <= ?
      AND hic.is_exception = 0
      ORDER BY hic.start_utc
    `).all(cardId, startUtc, endUtc);
    
    return { success: true, data: instances };
  } catch (error) {
    log.error('Failed to get habit instances:', error);
    return { success: false, error: 'Failed to get habit instances' };
  }
});

// 습관 로그 조회
ipcMain.handle('get-habit-logs', async (event, cardId: string, limit?: number) => {
  try {
    const query = limit 
      ? `SELECT * FROM habit_logs WHERE card_id = ? ORDER BY updated_at DESC LIMIT ?`
      : `SELECT * FROM habit_logs WHERE card_id = ? ORDER BY updated_at DESC`;
    
    const params = limit ? [cardId, limit] : [cardId];
    const logs = db.prepare(query).all(...params);
    
    return { success: true, data: logs };
  } catch (error) {
    log.error('Failed to get habit logs:', error);
    return { success: false, error: 'Failed to get habit logs' };
  }
});

// =========================
// 프로젝트 관리 IPC 핸들러들
// =========================

// 모든 프로젝트 조회
ipcMain.handle('get-projects', async () => {
  try {
    const projects = db.prepare(`
      SELECT 
        p.*,
        COUNT(c.id) as card_count
      FROM PROJECTS p
      LEFT JOIN CARDS c ON p.project_id = c.project_id AND c.deleted_at IS NULL
      GROUP BY p.project_id, p.project_name, p.createdat
      ORDER BY p.createdat DESC
    `).all();
    
    return { success: true, data: projects };
  } catch (error) {
    log.error('Failed to get projects:', error);
    return { success: false, error: 'Failed to get projects' };
  }
});

// 프로젝트 생성
ipcMain.handle('create-project', async (event, projectName: string) => {
  try {
    logUsage({
      action_type: 'create-project',
      target_type: 'project',
      details: { projectName }
    });

    // 프로젝트명 중복 확인
    const existingProject = db.prepare('SELECT project_id FROM PROJECTS WHERE project_name = ?').get(projectName);
    if (existingProject) {
      return { success: false, error: 'Project name already exists' };
    }

    const projectId = randomUUID();
    const stmt = db.prepare(`
      INSERT INTO PROJECTS (project_id, project_name, createdat)
      VALUES (?, ?, datetime('now'))
    `);
    
    stmt.run(projectId, projectName);
    
    return { success: true, data: { project_id: projectId, project_name: projectName } };
  } catch (error) {
    log.error('Failed to create project:', error);
    logUsage({
      action_type: 'create-project',
      error_message: String(error)
    });
    return { success: false, error: 'Failed to create project' };
  }
});

// 프로젝트 수정
ipcMain.handle('update-project', async (event, projectId: string, projectName: string) => {
  try {
    logUsage({
      action_type: 'update-project',
      target_type: 'project',
      target_id: projectId,
      details: { projectName }
    });

    // 다른 프로젝트에 같은 이름이 있는지 확인
    const existingProject = db.prepare(
      'SELECT project_id FROM PROJECTS WHERE project_name = ? AND project_id != ?'
    ).get(projectName, projectId);
    
    if (existingProject) {
      return { success: false, error: 'Project name already exists' };
    }

    const stmt = db.prepare(`
      UPDATE PROJECTS 
      SET project_name = ? 
      WHERE project_id = ?
    `);
    
    const result = stmt.run(projectName, projectId);
    
    if (result.changes === 0) {
      return { success: false, error: 'Project not found' };
    }
    
    return { success: true, data: { project_id: projectId, project_name: projectName } };
  } catch (error) {
    log.error('Failed to update project:', error);
    logUsage({
      action_type: 'update-project',
      error_message: String(error)
    });
    return { success: false, error: 'Failed to update project' };
  }
});

// 프로젝트 삭제
ipcMain.handle('delete-project', async (event, projectId: string) => {
  try {
    logUsage({
      action_type: 'delete-project',
      target_type: 'project',
      target_id: projectId
    });

    // 트랜잭션으로 프로젝트와 연결된 카드들 처리
    const transaction = db.transaction(() => {
      // 프로젝트에 속한 카드들의 project_id를 NULL로 설정
      db.prepare('UPDATE CARDS SET project_id = NULL WHERE project_id = ?').run(projectId);
      
      // 프로젝트 삭제
      const result = db.prepare('DELETE FROM PROJECTS WHERE project_id = ?').run(projectId);
      
      return result;
    });
    
    const result = transaction();
    
    if (result.changes === 0) {
      return { success: false, error: 'Project not found' };
    }
    
    return { success: true, data: { project_id: projectId } };
  } catch (error) {
    log.error('Failed to delete project:', error);
    logUsage({
      action_type: 'delete-project',
      error_message: String(error)
    });
    return { success: false, error: 'Failed to delete project' };
  }
});

// 특정 프로젝트의 카드들 조회
ipcMain.handle('get-project-cards', async (event, projectId: string) => {
  try {
    const cards = db.prepare(`
      SELECT 
        c.*,
        ct.cardtype_name,
        COUNT(r.id) as relation_count
      FROM CARDS c
      LEFT JOIN CARDTYPES ct ON c.cardtype = ct.cardtype_id
      LEFT JOIN RELATIONS r ON (c.id = r.source_card OR c.id = r.target_card) AND r.deleted_at IS NULL
      WHERE c.project_id = ? AND c.deleted_at IS NULL
      GROUP BY c.id
      ORDER BY c.createdat DESC
    `).all(projectId);
    
    return { success: true, data: cards };
  } catch (error) {
    log.error('Failed to get project cards:', error);
    return { success: false, error: 'Failed to get project cards' };
  }
});

// =========================
// 카드명 중복방지 기능 추가
// =========================

// 기존 create-card 핸들러에 중복방지 로직 추가를 위해 수정
// (먼저 기존 create-card 핸들러를 찾아서 수정해야 함)

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
    });
