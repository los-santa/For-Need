// 테마 타입 정의
export type Theme = 'brown' | 'black-gray-white' | 'dark' | 'light';

// 테마 색상 정의
export interface ThemeColors {
  background: string;
  foreground: string;
  panel: string;
  panelBorder: string;
  panelForeground: string;
  accent: string;
  accentForeground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  borderLight: string;
  borderDark: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textDisabled: string;
  bgDark: string;
  bgDarker: string;
  bgPanelHover: string;
  bgOverlay: string;
  bgModal: string;
  inputPlaceholder: string;
  scrollbarThumb: string;
  scrollbarTrack: string;
}

// 테마 정의
export const themes: Record<Theme, ThemeColors> = {
  brown: {
    background: '#3D2F2A',
    foreground: '#F5E6D3',
    panel: '#2C231F',
    panelBorder: 'rgba(245, 230, 211, 0.3)',
    panelForeground: '#F5E6D3',
    accent: '#F5E6D3',
    accentForeground: '#3D2F2A',
    muted: '#2C231F',
    mutedForeground: 'rgba(245, 230, 211, 0.6)',
    border: 'rgba(245, 230, 211, 0.3)',
    borderLight: 'rgba(245, 230, 211, 0.2)',
    borderDark: 'rgba(245, 230, 211, 0.5)',
    textPrimary: '#F5E6D3',
    textSecondary: 'rgba(245, 230, 211, 0.8)',
    textMuted: 'rgba(245, 230, 211, 0.6)',
    textDisabled: 'rgba(245, 230, 211, 0.4)',
    bgDark: '#1e1e1e',
    bgDarker: '#1a1a1a',
    bgPanelHover: '#43362f',
    bgOverlay: 'rgba(0, 0, 0, 0.6)',
    bgModal: '#2a2a2a',
    inputPlaceholder: 'rgba(245, 230, 211, 0.4)',
    scrollbarThumb: 'rgba(245, 230, 211, 0.35)',
    scrollbarTrack: 'rgba(26, 20, 17, 0.9)',
  },
  'black-gray-white': {
    background: '#1a1a1a',
    foreground: '#ffffff',
    panel: '#2a2a2a',
    panelBorder: 'rgba(255, 255, 255, 0.2)',
    panelForeground: '#ffffff',
    accent: '#ffffff',
    accentForeground: '#000000',
    muted: '#2a2a2a',
    mutedForeground: 'rgba(255, 255, 255, 0.6)',
    border: 'rgba(255, 255, 255, 0.2)',
    borderLight: 'rgba(255, 255, 255, 0.1)',
    borderDark: 'rgba(255, 255, 255, 0.3)',
    textPrimary: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.8)',
    textMuted: 'rgba(255, 255, 255, 0.6)',
    textDisabled: 'rgba(255, 255, 255, 0.4)',
    bgDark: '#1e1e1e',
    bgDarker: '#0f0f0f',
    bgPanelHover: '#3a3a3a',
    bgOverlay: 'rgba(0, 0, 0, 0.6)',
    bgModal: '#2a2a2a',
    inputPlaceholder: 'rgba(255, 255, 255, 0.4)',
    scrollbarThumb: 'rgba(255, 255, 255, 0.3)',
    scrollbarTrack: 'rgba(26, 26, 26, 0.9)',
  },
  dark: {
    background: '#121212',
    foreground: '#e0e0e0',
    panel: '#1e1e1e',
    panelBorder: 'rgba(255, 255, 255, 0.12)',
    panelForeground: '#e0e0e0',
    accent: '#bb86fc',
    accentForeground: '#000000',
    muted: '#1e1e1e',
    mutedForeground: 'rgba(255, 255, 255, 0.6)',
    border: 'rgba(255, 255, 255, 0.12)',
    borderLight: 'rgba(255, 255, 255, 0.08)',
    borderDark: 'rgba(255, 255, 255, 0.2)',
    textPrimary: '#e0e0e0',
    textSecondary: 'rgba(255, 255, 255, 0.87)',
    textMuted: 'rgba(255, 255, 255, 0.6)',
    textDisabled: 'rgba(255, 255, 255, 0.38)',
    bgDark: '#0f0f0f',
    bgDarker: '#000000',
    bgPanelHover: '#2a2a2a',
    bgOverlay: 'rgba(0, 0, 0, 0.7)',
    bgModal: '#1e1e1e',
    inputPlaceholder: 'rgba(255, 255, 255, 0.38)',
    scrollbarThumb: 'rgba(255, 255, 255, 0.2)',
    scrollbarTrack: 'rgba(18, 18, 18, 0.9)',
  },
  light: {
    background: '#ffffff',
    foreground: '#212121',
    panel: '#f5f5f5',
    panelBorder: 'rgba(0, 0, 0, 0.12)',
    panelForeground: '#212121',
    accent: '#1976d2',
    accentForeground: '#ffffff',
    muted: '#f5f5f5',
    mutedForeground: 'rgba(0, 0, 0, 0.6)',
    border: 'rgba(0, 0, 0, 0.12)',
    borderLight: 'rgba(0, 0, 0, 0.08)',
    borderDark: 'rgba(0, 0, 0, 0.2)',
    textPrimary: '#212121',
    textSecondary: 'rgba(0, 0, 0, 0.87)',
    textMuted: 'rgba(0, 0, 0, 0.6)',
    textDisabled: 'rgba(0, 0, 0, 0.38)',
    bgDark: '#fafafa',
    bgDarker: '#f5f5f5',
    bgPanelHover: '#eeeeee',
    bgOverlay: 'rgba(0, 0, 0, 0.5)',
    bgModal: '#ffffff',
    inputPlaceholder: 'rgba(0, 0, 0, 0.38)',
    scrollbarThumb: 'rgba(0, 0, 0, 0.2)',
    scrollbarTrack: 'rgba(255, 255, 255, 0.9)',
  },
};

// 테마 이름 (한국어)
export const themeNames: Record<Theme, string> = {
  brown: '브라운',
  'black-gray-white': '블랙/그레이/화이트',
  dark: '다크',
  light: '라이트',
};

// CSS 변수에 테마 적용
export function applyTheme(theme: Theme): void {
  const colors = themes[theme];
  const root = document.documentElement;

  // CSS 변수 설정
  root.style.setProperty('--background', colors.background);
  root.style.setProperty('--foreground', colors.foreground);
  root.style.setProperty('--panel', colors.panel);
  root.style.setProperty('--panel-border', colors.panelBorder);
  root.style.setProperty('--panel-foreground', colors.panelForeground);
  root.style.setProperty('--accent', colors.accent);
  root.style.setProperty('--accent-foreground', colors.accentForeground);
  root.style.setProperty('--muted', colors.muted);
  root.style.setProperty('--muted-foreground', colors.mutedForeground);
  root.style.setProperty('--border', colors.border);
  root.style.setProperty('--border-light', colors.borderLight);
  root.style.setProperty('--border-dark', colors.borderDark);
  root.style.setProperty('--text-primary', colors.textPrimary);
  root.style.setProperty('--text-secondary', colors.textSecondary);
  root.style.setProperty('--text-muted', colors.textMuted);
  root.style.setProperty('--text-disabled', colors.textDisabled);
  root.style.setProperty('--bg-dark', colors.bgDark);
  root.style.setProperty('--bg-darker', colors.bgDarker);
  root.style.setProperty('--bg-panel-hover', colors.bgPanelHover);
  root.style.setProperty('--bg-overlay', colors.bgOverlay);
  root.style.setProperty('--bg-modal', colors.bgModal);
  root.style.setProperty('--input-placeholder', colors.inputPlaceholder);

  // 스크롤바 스타일 업데이트
  const styleId = 'theme-scrollbar-style';
  let styleElement = document.getElementById(styleId) as HTMLStyleElement;
  
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = styleId;
    document.head.appendChild(styleElement);
  }

  styleElement.textContent = `
    html,
    body {
      scrollbar-width: thin;
      scrollbar-color: ${colors.scrollbarThumb} ${colors.scrollbarTrack};
    }

    *::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    *::-webkit-scrollbar-track {
      background: ${colors.scrollbarTrack};
      border-radius: 999px;
    }

    *::-webkit-scrollbar-thumb {
      background: linear-gradient(
        180deg,
        ${colors.scrollbarThumb.replace('0.3', '0.5')},
        ${colors.scrollbarThumb.replace('0.3', '0.2')}
      );
      border-radius: 999px;
      border: 2px solid ${colors.scrollbarTrack};
    }

    *::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(
        180deg,
        ${colors.scrollbarThumb.replace('0.3', '0.7')},
        ${colors.scrollbarThumb.replace('0.3', '0.4')}
      );
    }
  `;
}

// 테마별 색상 팔레트 (그래프 뷰용)
export function getThemeColors(theme: Theme): string[] {
  switch (theme) {
    case 'brown':
      return ['#8B6F47', '#A58B6F', '#6B5444', '#9B8B7E', '#7A6855', '#B39B83', '#5C4B3A', '#C4B5A0'];
    case 'black-gray-white':
      return ['#808080', '#A0A0A0', '#606060', '#909090', '#707070', '#B0B0B0', '#505050', '#C0C0C0'];
    case 'dark':
      return ['#bb86fc', '#03dac6', '#cf6679', '#6200ee', '#018786', '#b00020', '#3700b3', '#03dac5'];
    case 'light':
      return ['#1976d2', '#388e3c', '#f57c00', '#7b1fa2', '#c2185b', '#0097a7', '#5d4037', '#455a64'];
    default:
      return ['#808080', '#A0A0A0', '#606060', '#909090', '#707070', '#B0B0B0', '#505050', '#C0C0C0'];
  }
}
