import { ElectronHandler } from '../main/preload';

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    electron: ElectronHandler & {
      ipcRenderer: ElectronHandler['ipcRenderer'] & {
        invoke(channel: string, ...args: unknown[]): Promise<unknown>;
      };
    };
  }
}

export {};
