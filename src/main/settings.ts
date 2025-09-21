import { app } from 'electron';
import path from 'path';
import fs from 'fs';

export interface AppSettings {
  dbPath?: string;
  version: string;
  recentDbPaths?: string[]; // 최근 사용한 DB 경로 목록
}

// 설정 파일 경로
const settingsDir = path.join(app.getPath('userData'));
const settingsPath = path.join(settingsDir, 'settings.json');

// 기본 설정
const defaultSettings: AppSettings = {
  dbPath: path.join(app.getPath('home'), '.forneed', 'database.db'),
  version: '1.0.0',
  recentDbPaths: []
};

// 설정 디렉토리 생성
if (!fs.existsSync(settingsDir)) {
  fs.mkdirSync(settingsDir, { recursive: true });
}

// 설정 로드
export function loadSettings(): AppSettings {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf-8');
      const settings = JSON.parse(data);
      return { ...defaultSettings, ...settings };
    }
  } catch (error) {
    console.warn('Failed to load settings:', error);
  }

  // 기본 설정으로 파일 생성
  saveSettings(defaultSettings);
  return defaultSettings;
}

// 설정 저장
export function saveSettings(settings: AppSettings): void {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

// DB 경로 변경
export function setDatabasePath(newPath: string): boolean {
  try {
    const settings = loadSettings();

    // 디렉토리 확인 및 생성
    const dbDir = path.dirname(newPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // 이전 경로가 있고 새 경로와 다르면 최근 목록에 추가
    if (settings.dbPath && settings.dbPath !== newPath) {
      addToRecentDbPaths(settings, settings.dbPath);
    }

    settings.dbPath = newPath;
    saveSettings(settings);
    return true;
  } catch (error) {
    console.error('Failed to set database path:', error);
    return false;
  }
}

// 현재 DB 경로 가져오기
export function getDatabasePath(): string {
  const settings = loadSettings();
  return settings.dbPath || defaultSettings.dbPath!;
}

// 최근 DB 경로 목록에 추가 (중복 제거 및 최대 10개 유지)
function addToRecentDbPaths(settings: AppSettings, dbPath: string): void {
  if (!settings.recentDbPaths) {
    settings.recentDbPaths = [];
  }

  // 중복 제거
  settings.recentDbPaths = settings.recentDbPaths.filter(path => path !== dbPath);
  
  // 맨 앞에 추가
  settings.recentDbPaths.unshift(dbPath);
  
  // 최대 10개까지만 유지
  if (settings.recentDbPaths.length > 10) {
    settings.recentDbPaths = settings.recentDbPaths.slice(0, 10);
  }
}

// 최근 DB 경로 목록 가져오기 (파일 존재 여부 확인)
export function getRecentDbPaths(): string[] {
  const settings = loadSettings();
  if (!settings.recentDbPaths) {
    return [];
  }

  // 실제로 존재하는 파일만 반환
  return settings.recentDbPaths.filter(dbPath => {
    try {
      return fs.existsSync(dbPath);
    } catch {
      return false;
    }
  });
}

// 최근 DB 경로 목록에서 제거
export function removeFromRecentDbPaths(dbPath: string): void {
  const settings = loadSettings();
  if (settings.recentDbPaths) {
    settings.recentDbPaths = settings.recentDbPaths.filter(path => path !== dbPath);
    saveSettings(settings);
  }
}
