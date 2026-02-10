import { contextBridge, ipcRenderer } from 'electron';

// 보안을 위해 필요한 API만 노출
contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  // DB 관련 API
  database: {
    getDbPath: () => ipcRenderer.invoke('get-db-path'),
    setDbPath: (dbPath: string | null) => ipcRenderer.invoke('set-db-path', dbPath),
    selectDbFile: () => ipcRenderer.invoke('select-db-file'),
    getCurrentDbPath: () => ipcRenderer.invoke('get-current-db-path'),
    loadCircles: () => ipcRenderer.invoke('load-circles'),
    loadArrows: () => ipcRenderer.invoke('load-arrows'),
    loadArrowsFiltered: (relationtypeIds: number[] | null) => ipcRenderer.invoke('load-arrows-filtered', relationtypeIds),
    loadRelationTypes: () => ipcRenderer.invoke('load-relation-types'),
    connectDatabase: (dbPath: string) => ipcRenderer.invoke('connect-database', dbPath),
  },
});


