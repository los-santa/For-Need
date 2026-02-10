export interface ElectronAPI {
  platform: string;
  versions: {
    node: string;
    chrome: string;
    electron: string;
  };
  database: {
    getDbPath: () => Promise<string | null>;
    setDbPath: (dbPath: string | null) => Promise<{ success: boolean; error?: string }>;
    selectDbFile: () => Promise<string | null>;
    getCurrentDbPath: () => Promise<string | null>;
    loadCircles: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
    loadArrows: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
    loadArrowsFiltered: (relationtypeIds: number[] | null) => Promise<{ success: boolean; data?: any[]; error?: string }>;
    loadRelationTypes: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
    connectDatabase: (dbPath: string) => Promise<{ success: boolean; error?: string }>;
  };
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}


