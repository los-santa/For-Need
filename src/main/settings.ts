import { app } from 'electron';
import path from 'path';
import fs from 'fs';

export interface AppSettings {
  dbPath?: string;
  version: string;
}

// 설정 파일 경로
const settingsDir = path.join(app.getPath('userData'));
const settingsPath = path.join(settingsDir, 'settings.json');

// 기본 설정
const defaultSettings: AppSettings = {
  dbPath: path.join(app.getPath('home'), '.forneed', 'database.db'),
  version: '1.0.0'
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
