// i18n 유틸리티
export type Language = 'ko' | 'en';

// 언어별 번역 데이터
const translations: Record<Language, Record<string, string>> = {
  ko: {
    // 공통
    'common.save': '저장',
    'common.cancel': '취소',
    'common.delete': '삭제',
    'common.edit': '수정',
    'common.create': '생성',
    'common.close': '닫기',
    'common.confirm': '확인',
    'common.reset': '기본값 복원',
    'common.settings': '설정',
    'common.loading': '로딩 중...',
    'common.noData': '데이터가 없습니다.',
    
    // 설정 페이지
    'settings.title': '설정',
    'settings.language': '언어',
    'settings.language.ko': '한국어',
    'settings.language.en': 'English',
    'settings.cardDelete': '카드 삭제',
    'settings.cardDeleteConfirm': '카드 삭제 시 확인창 표시',
    'settings.sleepPattern': '수면 패턴',
    'settings.sleepStart': '수면 시작',
    'settings.sleepEnd': '수면 종료',
    'settings.sleepDuration': '수면시간',
    'settings.newCard': '새 카드 설정',
    'settings.defaultCardType': '기본 카드타입',
    'settings.exportTemplate': '내보내기 텍스트 템플릿',
    'settings.exportTemplateVariables': '사용 가능한 변수: {currentDateTime}, {sleepStartTime}, {sleepEndTime}, {sleepDuration}, {relationCount}, {relationList}, {timeCardsCount}, {timeLegend}, {timeLines}',
    'settings.exportTemplatePlaceholder': '내보내기 텍스트 템플릿을 입력하세요...',
    'settings.saved': '설정이 저장되었습니다',
    'settings.resetConfirm': '설정이 기본값으로 초기화되었습니다',
    'settings.sleepAutoCalculate': '수면 시작/종료 시각을 변경하면 수면시간이 자동으로 계산됩니다. 수동으로도 수정할 수 있습니다.',
    'settings.defaultCardTypeDesc': '새로 생성되는 카드의 기본 카드타입을 설정합니다.',
    
    // 홈
    'home.title': '홈',
    'home.createCard': '카드 생성',
    'home.createRelation': '관계 생성',
    
    // 프로젝트
    'project.title': '프로젝트',
    'project.create': '새 프로젝트 추가',
    'project.list': '프로젝트 목록',
    'project.cards': '카드',
    'project.created': '생성',
    
    // 카드
    'card.title': '제목',
    'card.content': '내용',
    'card.type': '타입',
    'card.relations': '관계',
    'card.created': '생성',
    
    // 관계
    'relation.title': '관계',
    'relation.source': '출발',
    'relation.target': '도착',
    'relation.type': '타입',
    
    // 데이터베이스 설정
    'db.title': '데이터베이스 설정',
    'db.currentPath': '현재 DB 경로',
    'db.selectPath': 'DB 경로 선택',
    'db.createNew': '새 DB 파일 생성',
    'db.recentPaths': '최근 사용한 DB 경로',
    'db.localDatabases': '로컬 데이터베이스',
    'db.loadError': '설정을 불러올 수 없습니다.',
    'db.loadErrorDetail': '설정을 불러오는 중 오류가 발생했습니다.',
  },
  en: {
    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.close': 'Close',
    'common.confirm': 'Confirm',
    'common.reset': 'Reset to Default',
    'common.settings': 'Settings',
    'common.loading': 'Loading...',
    'common.noData': 'No data available.',
    
    // Settings page
    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.language.ko': '한국어',
    'settings.language.en': 'English',
    'settings.cardDelete': 'Card Deletion',
    'settings.cardDeleteConfirm': 'Show confirmation dialog when deleting cards',
    'settings.sleepPattern': 'Sleep Pattern',
    'settings.sleepStart': 'Sleep Start',
    'settings.sleepEnd': 'Sleep End',
    'settings.sleepDuration': 'Sleep Duration',
    'settings.newCard': 'New Card Settings',
    'settings.defaultCardType': 'Default Card Type',
    'settings.exportTemplate': 'Export Text Template',
    'settings.exportTemplateVariables': 'Available variables: {currentDateTime}, {sleepStartTime}, {sleepEndTime}, {sleepDuration}, {relationCount}, {relationList}, {timeCardsCount}, {timeLegend}, {timeLines}',
    'settings.exportTemplatePlaceholder': 'Enter export text template...',
    'settings.saved': 'Settings saved',
    'settings.resetConfirm': 'Settings reset to default',
    'settings.sleepAutoCalculate': 'Sleep duration is automatically calculated when you change sleep start/end times. You can also edit it manually.',
    'settings.defaultCardTypeDesc': 'Set the default card type for newly created cards.',
    
    // Home
    'home.title': 'Home',
    'home.createCard': 'Create Card',
    'home.createRelation': 'Create Relation',
    
    // Project
    'project.title': 'Projects',
    'project.create': 'Add New Project',
    'project.list': 'Project List',
    'project.cards': 'Cards',
    'project.created': 'Created',
    
    // Card
    'card.title': 'Title',
    'card.content': 'Content',
    'card.type': 'Type',
    'card.relations': 'Relations',
    'card.created': 'Created',
    
    // Relation
    'relation.title': 'Relations',
    'relation.source': 'Source',
    'relation.target': 'Target',
    'relation.type': 'Type',
    
    // Database settings
    'db.title': 'Database Settings',
    'db.currentPath': 'Current DB Path',
    'db.selectPath': 'Select DB Path',
    'db.createNew': 'Create New DB File',
    'db.recentPaths': 'Recent DB Paths',
    'db.localDatabases': 'Local Databases',
    'db.loadError': 'Failed to load settings.',
    'db.loadErrorDetail': 'An error occurred while loading settings.',
  }
};

// 현재 언어 상태
let currentLanguage: Language = 'ko';

// 언어 설정
export function setLanguage(lang: Language): void {
  currentLanguage = lang;
  // localStorage에도 저장
  try {
    localStorage.setItem('for-need-language', lang);
  } catch (error) {
    console.warn('Failed to save language to localStorage:', error);
  }
}

// 언어 가져오기
export function getLanguage(): Language {
  // localStorage에서 먼저 확인
  try {
    const saved = localStorage.getItem('for-need-language');
    if (saved === 'ko' || saved === 'en') {
      currentLanguage = saved;
      return saved;
    }
  } catch (error) {
    console.warn('Failed to load language from localStorage:', error);
  }
  return currentLanguage;
}

// 번역 함수
export function t(key: string): string {
  const lang = getLanguage();
  return translations[lang][key] || key;
}

// 언어 초기화 (IPC에서 설정을 가져와서 적용)
export async function initLanguage(): Promise<void> {
  try {
    const result = await window.electron.ipcRenderer.invoke('get-settings');
    if (result.success && result.data.language) {
      setLanguage(result.data.language);
    }
  } catch (error) {
    console.warn('Failed to initialize language:', error);
  }
}








