import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// 브라우저 모드에서 Electron API 모킹
if (typeof window !== 'undefined' && !window.electron) {
  console.warn('⚠️ 브라우저 모드: Electron API가 모킹됩니다.');
  window.electron = {
    ipcRenderer: {
      sendMessage: (channel: string, ...args: unknown[]) => {
        console.log('[Browser Mock] sendMessage:', channel, args);
      },
      on: (channel: string, func: (...args: unknown[]) => void) => {
        console.log('[Browser Mock] on:', channel);
        return () => {};
      },
      once: (channel: string, func: (...args: unknown[]) => void) => {
        console.log('[Browser Mock] once:', channel);
      },
      invoke: async (channel: string, ...args: unknown[]): Promise<unknown> => {
        console.log('[Browser Mock] invoke:', channel, args);
        // 브라우저 모드에서는 빈 응답 반환
        return { success: false, data: null, error: '브라우저 모드에서는 Electron API를 사용할 수 없습니다.' };
      },
    },
  } as any;
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}

// calling IPC exposed from preload script
window.electron?.ipcRenderer.once('ipc-example', (arg) => {
  // eslint-disable-next-line no-console
  console.log(arg);
});
window.electron?.ipcRenderer.sendMessage('ipc-example', ['ping']);
