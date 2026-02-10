import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as http from 'http';
import * as fs from 'fs';
import * as dbManager from './database';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 개발 모드 여부 확인
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// 안전한 로깅 함수 (EPIPE 에러 방지)
function safeLog(...args: any[]) {
  try {
    // process.stdout.write를 직접 사용하여 더 안전하게 처리
    if (process.stdout.writable && !process.stdout.destroyed) {
      const message = args.map(arg => String(arg)).join(' ') + '\n';
      process.stdout.write(message, (err) => {
        // 에러를 무시 (EPIPE 등)
        if (err && err.code !== 'EPIPE' && err.code !== 'ENOTCONN') {
          // 심각한 에러만 처리 (하지만 throw는 하지 않음)
        }
      });
    }
  } catch (error: any) {
    // 모든 에러를 무시 (EPIPE, ENOTCONN 등)
    // 개발 환경에서만 발생하는 문제이므로 무시
  }
}

function safeError(...args: any[]) {
  try {
    // process.stderr.write를 직접 사용하여 더 안전하게 처리
    if (process.stderr.writable && !process.stderr.destroyed) {
      const message = args.map(arg => String(arg)).join(' ') + '\n';
      process.stderr.write(message, (err) => {
        // 에러를 무시 (EPIPE 등)
        if (err && err.code !== 'EPIPE' && err.code !== 'ENOTCONN') {
          // 심각한 에러만 처리 (하지만 throw는 하지 않음)
        }
      });
    }
  } catch (error: any) {
    // 모든 에러를 무시 (EPIPE, ENOTCONN 등)
    // 개발 환경에서만 발생하는 문제이므로 무시
  }
}

// 개발 서버 URL (Vite 기본 포트)
const VITE_DEV_SERVER_URL = 'http://localhost:3000';

// Vite 개발 서버가 준비될 때까지 기다리는 함수
async function waitForServer(url: string, maxAttempts = 30): Promise<boolean> {
  const urlObj = new URL(url);
  const hostname = urlObj.hostname;
  const port = parseInt(urlObj.port || '3000');

  for (let i = 0; i < maxAttempts; i++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const req = http.get({ hostname, port, path: '/', timeout: 1000 }, (res) => {
          resolve();
          res.destroy();
        });
        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
      });
      return true;
    } catch (error) {
      // 서버가 아직 준비되지 않음, 잠시 대기
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  return false;
}

async function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // 개발 환경에서는 sandbox 비활성화 (필요시 활성화)
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: true, // 창을 즉시 표시
  });

  // 개발 모드에서는 Vite 개발 서버 사용, 프로덕션에서는 빌드된 파일 사용
  if (isDev) {
    // Vite 개발 서버가 준비될 때까지 대기
    safeLog('Vite 개발 서버 연결 대기 중...');
    const serverReady = await waitForServer(VITE_DEV_SERVER_URL);
    if (serverReady) {
      safeLog('Vite 개발 서버에 연결되었습니다.');
      await mainWindow.loadURL(VITE_DEV_SERVER_URL);
    } else {
      safeError('Vite 개발 서버에 연결할 수 없습니다. 재시도 중...');
      // 재시도 로직 추가
      mainWindow.webContents.on('did-fail-load', () => {
        setTimeout(() => {
          mainWindow.loadURL(VITE_DEV_SERVER_URL).catch((err) => safeError(err));
        }, 1000);
      });
      await mainWindow.loadURL(VITE_DEV_SERVER_URL);
    }
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../../build/index.html'));
  }
}

// IPC 핸들러 설정
function setupIpcHandlers() {
  // DB 경로 설정 가져오기
  ipcMain.handle('get-db-path', async () => {
    const userDataPath = app.getPath('userData');
    const configPath = path.join(userDataPath, 'config.json');
    
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        return config.dbPath || null;
      } catch (error) {
        return null;
      }
    }
    return null;
  });

  // DB 경로 설정 저장
  ipcMain.handle('set-db-path', async (_, dbPath: string | null) => {
    const userDataPath = app.getPath('userData');
    const configPath = path.join(userDataPath, 'config.json');
    
    let config: any = {};
    if (fs.existsSync(configPath)) {
      try {
        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      } catch (error) {
        // 무시하고 새로 생성
      }
    }
    
    config.dbPath = dbPath;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    
    // DB 경로가 설정되면 자동으로 연결
    if (dbPath) {
      const result = dbManager.connectDatabase(dbPath);
      return { success: result.success, error: result.error };
    } else {
      dbManager.disconnectDatabase();
      return { success: true };
    }
  });

  // DB 파일 선택 대화상자
  ipcMain.handle('select-db-file', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'SQLite Database', extensions: ['db', 'sqlite', 'sqlite3'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  // 현재 연결된 DB 경로 가져오기
  ipcMain.handle('get-current-db-path', () => {
    return dbManager.getCurrentDbPath();
  });

  // Circle 데이터 로드
  ipcMain.handle('load-circles', () => {
    try {
      const data = dbManager.loadCircles();
      safeLog(`Circle 데이터 로드: ${data.length}개`);
      return { success: true, data };
    } catch (error: any) {
      safeError('Circle 데이터 로드 실패:', error);
      return { success: false, error: error.message || '데이터 로드에 실패했습니다.' };
    }
  });

  // Arrow 데이터 로드
  ipcMain.handle('load-arrows', () => {
    try {
      const data = dbManager.loadArrows();
      safeLog(`Arrow 데이터 로드: ${data.length}개`);
      return { success: true, data };
    } catch (error: any) {
      safeError('Arrow 데이터 로드 실패:', error);
      return { success: false, error: error.message || '데이터 로드에 실패했습니다.' };
    }
  });

  // 필터링된 Arrow 데이터 로드
  ipcMain.handle('load-arrows-filtered', (_, relationtypeIds: number[] | null) => {
    try {
      const data = dbManager.loadArrowsFiltered(relationtypeIds);
      safeLog(`Arrow 데이터 로드 (필터 적용): ${data.length}개`);
      return { success: true, data };
    } catch (error: any) {
      safeError('Arrow 데이터 로드 실패:', error);
      return { success: false, error: error.message || '데이터 로드에 실패했습니다.' };
    }
  });

  // 관계타입 목록 로드
  ipcMain.handle('load-relation-types', () => {
    try {
      const data = dbManager.loadRelationTypes();
      safeLog(`관계타입 데이터 로드: ${data.length}개`);
      return { success: true, data };
    } catch (error: any) {
      safeError('관계타입 데이터 로드 실패:', error);
      return { success: false, error: error.message || '데이터 로드에 실패했습니다.' };
    }
  });

  // DB 연결
  ipcMain.handle('connect-database', (_, dbPath: string) => {
    return dbManager.connectDatabase(dbPath);
  });
}

// 앱이 준비되면 창 생성
app.whenReady().then(async () => {
  setupIpcHandlers();
  
  // 저장된 DB 경로가 있으면 자동 연결
  const userDataPath = app.getPath('userData');
  const configPath = path.join(userDataPath, 'config.json');
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (config.dbPath && fs.existsSync(config.dbPath)) {
        dbManager.connectDatabase(config.dbPath);
      }
    } catch (error) {
      // 무시
    }
  }

  await createWindow();

  // macOS에서는 모든 창이 닫혀도 앱이 계속 실행됨
  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

// 앱 종료 시 DB 연결 해제
app.on('will-quit', () => {
  dbManager.disconnectDatabase();
});

// 모든 창이 닫히면 종료 (macOS 제외)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

