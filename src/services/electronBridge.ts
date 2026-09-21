/**
 * RAD X Universal Electron & Web Bridge
 * Provides unified interface that switches seamlessly between window.electronAPI and HTTP REST/Mock endpoints
 */

import { Track, DownloadJob, QueueItem, LibraryEntry, ScoutResult, SettingsConfig, HunterFilterParams } from '../types';

declare global {
  interface Window {
    electronAPI?: {
      searchHunter: (params: HunterFilterParams) => Promise<{ success: boolean; results: Track[] }>;
      getQueue: () => Promise<QueueItem[]>;
      addToQueue: (track: Track, format: string) => Promise<{ success: boolean; item?: QueueItem; reason?: string }>;
      removeFromQueue: (id: string) => Promise<boolean>;
      clearQueue: () => Promise<boolean>;
      getDownloads: () => Promise<DownloadJob[]>;
      addDownload: (track: Track, format: string) => Promise<{ success: boolean; job?: DownloadJob; reason?: string }>;
      pauseDownload: (jobId: string) => Promise<boolean>;
      resumeDownload: (jobId: string) => Promise<boolean>;
      cancelDownload: (jobId: string) => Promise<boolean>;
      retryDownload: (jobId: string) => Promise<boolean>;
      clearFinishedDownloads: () => Promise<boolean>;
      onDownloadProgress: (callback: (job: DownloadJob) => void) => () => void;
      onDownloadStatusChange: (callback: (job: DownloadJob) => void) => () => void;
      onLibraryUpdated?: (callback: () => void) => () => void;
      getLibrary: () => Promise<LibraryEntry[]>;
      scanLibrary: () => Promise<{ success: boolean; newTracksCount?: number; totalCount?: number }>;
      deleteFromLibrary: (id: string) => Promise<boolean>;
      getScoutResults: () => Promise<ScoutResult[]>;
      scanScoutRadar: () => Promise<{ success: boolean; newDiscoveriesCount?: number; totalScoutCount?: number }>;
      updateScoutStatus: (id: string, status: string) => Promise<boolean>;
      getSettings: () => Promise<SettingsConfig>;
      updateSettings: (updates: Partial<SettingsConfig>) => Promise<SettingsConfig>;
      openFolder: (folderPath: string) => Promise<{ success: boolean }>;
      getScoutSchedulerStatus?: () => Promise<any>;
      triggerScoutScheduler?: () => Promise<any>;
      toggleScoutScheduler?: (enabled: boolean) => Promise<any>;
      onScoutLog?: (callback: (logLine: string) => void) => () => void;
    };
  }
}

// Unified detection for Electron bridge
export const getElectronAPI = () => {
  if (typeof window !== 'undefined') {
    return window.electronAPI || (window as any).radx || null;
  }
  return null;
};

export const isDesktopElectron = typeof window !== 'undefined' && !!(window.electronAPI || (window as any).radx);

export const electronBridge = {
  // Hunter
  async searchHunter(params: HunterFilterParams): Promise<Track[]> {
    console.log('[HUNTER] [BRIDGE] searchHunter called with:', params);
    const api = getElectronAPI();
    if (api && typeof api.searchHunter === 'function') {
      try {
        console.log('[IPC] [HUNTER] Invoking desktop searchHunter via bridge');
        const res = await api.searchHunter(params);
        const results = Array.isArray(res) ? res : (res?.results || []);
        console.log('[IPC] [HUNTER] Desktop bridge returned tracks count:', results.length);
        return results;
      } catch (ipcErr) {
        console.warn('[IPC] [HUNTER] IPC search threw error, falling back to REST/catalog:', ipcErr);
      }
    }

    // Try backend API if running in web/Express server
    try {
      const q = encodeURIComponent(params.searchQuery || '');
      const genre = encodeURIComponent(params.genre || 'Industrial Techno');
      const apiRes = await fetch(`/api/hunter?genre=${genre}&q=${q}`);
      if (apiRes.ok) {
        const json = await apiRes.json();
        if (json && Array.isArray(json.results)) {
          console.log('[HUNTER] [BRIDGE] Backend API returned tracks count:', json.results.length);
          return json.results;
        }
      }
    } catch (apiErr) {
      console.warn('[HUNTER] [BRIDGE] Backend API search failed:', apiErr);
    }

    return [];
  },

  // Queue
  async getQueue(): Promise<QueueItem[]> {
    const api = getElectronAPI();
    if (api) {
      return api.getQueue();
    }
    const res = await fetch('/api/queue');
    return res.ok ? res.json() : [];
  },

  async addToQueue(track: Track, format: string): Promise<{ success: boolean; item?: QueueItem; reason?: string }> {
    const api = getElectronAPI();
    if (api) {
      return api.addToQueue(track, format);
    }
    const res = await fetch('/api/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ track, format })
    });
    return res.json();
  },

  async removeFromQueue(id: string): Promise<boolean> {
    const api = getElectronAPI();
    if (api) {
      return api.removeFromQueue(id);
    }
    const res = await fetch(`/api/queue/${id}`, { method: 'DELETE' });
    return res.ok;
  },

  // Downloads
  async getDownloads(): Promise<DownloadJob[]> {
    const api = getElectronAPI();
    if (api) {
      console.log('[IPC] [DOWNLOAD] Fetching downloads via desktop bridge');
      return api.getDownloads();
    }
    const res = await fetch('/api/downloads');
    const jobs = res.ok ? await res.json() : [];
    return jobs;
  },

  async addDownload(track: Track, format: string): Promise<{ success: boolean; job?: DownloadJob; reason?: string }> {
    console.log('[DOWNLOAD] [BRIDGE] addDownload called:', track?.title, format);
    const api = getElectronAPI();
    if (api) {
      return api.addDownload(track, format);
    }
    const res = await fetch('/api/downloads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ track, format })
    });
    return res.json();
  },

  async pauseDownload(jobId: string): Promise<boolean> {
    console.log('[DOWNLOAD] [BRIDGE] pauseDownload called:', jobId);
    const api = getElectronAPI();
    if (api) {
      return api.pauseDownload(jobId);
    }
    const res = await fetch(`/api/downloads/${jobId}/pause`, { method: 'POST' });
    return res.ok;
  },

  async resumeDownload(jobId: string): Promise<boolean> {
    console.log('[DOWNLOAD] [BRIDGE] resumeDownload called:', jobId);
    const api = getElectronAPI();
    if (api) {
      return api.resumeDownload(jobId);
    }
    const res = await fetch(`/api/downloads/${jobId}/resume`, { method: 'POST' });
    return res.ok;
  },

  async cancelDownload(jobId: string): Promise<boolean> {
    console.log('[DOWNLOAD] [BRIDGE] cancelDownload called:', jobId);
    const api = getElectronAPI();
    if (api) {
      return api.cancelDownload(jobId);
    }
    const res = await fetch(`/api/downloads/${jobId}`, { method: 'DELETE' });
    return res.ok;
  },

  async retryDownload(jobId: string): Promise<{ success: boolean; job?: DownloadJob; reason?: string }> {
    console.log('[DOWNLOAD] [BRIDGE] retryDownload called:', jobId);
    const api = getElectronAPI();
    if (api) {
      const success = await api.retryDownload(jobId);
      return { success };
    }
    const res = await fetch(`/api/downloads/${jobId}/retry`, { method: 'POST' });
    return res.json();
  },

  async clearFinishedDownloads(): Promise<boolean> {
    const api = getElectronAPI();
    if (api) {
      return api.clearFinishedDownloads();
    }
    const res = await fetch('/api/downloads/clear-finished', { method: 'POST' });
    return res.ok;
  },

  onDownloadProgress(callback: (job: DownloadJob) => void): () => void {
    if (isDesktopElectron && window.electronAPI) {
      return window.electronAPI.onDownloadProgress(callback);
    }
    return () => {};
  },

  onLibraryUpdated(callback: () => void): () => void {
    if (isDesktopElectron && window.electronAPI && window.electronAPI.onLibraryUpdated) {
      return window.electronAPI.onLibraryUpdated(callback);
    }
    return () => {};
  },

  // Library
  async getLibrary(): Promise<LibraryEntry[]> {
    if (isDesktopElectron && window.electronAPI) {
      return window.electronAPI.getLibrary();
    }
    const res = await fetch('/api/library');
    return res.ok ? res.json() : [];
  },

  async scanLibrary(): Promise<{ success: boolean; newTracksCount?: number }> {
    if (isDesktopElectron && window.electronAPI) {
      return window.electronAPI.scanLibrary();
    }
    const res = await fetch('/api/library/scan', { method: 'POST' });
    return res.json();
  },

  async deleteFromLibrary(id: string): Promise<boolean> {
    if (isDesktopElectron && window.electronAPI) {
      return window.electronAPI.deleteFromLibrary(id);
    }
    const res = await fetch(`/api/library/${id}`, { method: 'DELETE' });
    return res.ok;
  },

  // Scout
  async getScoutResults(): Promise<ScoutResult[]> {
    if (isDesktopElectron && window.electronAPI) {
      return window.electronAPI.getScoutResults();
    }
    const res = await fetch('/api/scout');
    return res.ok ? res.json() : [];
  },

  async scanScoutRadar(): Promise<{ success: boolean; newDiscoveriesCount?: number }> {
    if (isDesktopElectron && window.electronAPI) {
      return window.electronAPI.scanScoutRadar();
    }
    const res = await fetch('/api/scout/scan', { method: 'POST' });
    return res.json();
  },

  // Settings
  async getSettings(): Promise<SettingsConfig> {
    if (isDesktopElectron && window.electronAPI) {
      return window.electronAPI.getSettings();
    }
    const res = await fetch('/api/settings');
    return res.ok
      ? res.json()
      : {
          musicDirectory: 'C:\\Music',
          scoutDirectory: 'C:\\Music\\Scout',
          autoScanOnStartup: true,
          maxConcurrentDownloads: 3,
          preferredFormat: 'MP3',
          audioBitrate: '320kbps',
          enableDailyScout: true,
          scoutIntervalHours: 24,
          crossfadeDurationSec: 4,
          highThinkingEnabled: true,
          themeMode: 'cyberpunk-dark',
          autoScout: true,
          scoutIntervalMinutes: 30,
          autoDownload: true,
          avoidDuplicates: true,
          maxDownloadsPerCycle: 20,
          minTrackDuration: 120,
          maxTrackDuration: 1200,
          enabledGenres: ['Hard Techno', 'Industrial Techno', 'Dark Techno', 'Peak Time Techno', 'EBM', 'Synthwave']
        };
  },

  async updateSettings(updates: Partial<SettingsConfig>): Promise<SettingsConfig> {
    if (isDesktopElectron && window.electronAPI) {
      return window.electronAPI.updateSettings(updates);
    }
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return res.json();
  },

  // Autonomous ScoutScheduler 24/7
  async getScoutSchedulerStatus() {
    const api = getElectronAPI();
    if (api && typeof api.getScoutSchedulerStatus === 'function') {
      try {
        return await api.getScoutSchedulerStatus();
      } catch (e) {
        console.warn('[SCOUT] Electron getScoutSchedulerStatus failed, using REST:', e);
      }
    }
    const res = await fetch('/api/scout/scheduler/status');
    return res.ok ? res.json() : null;
  },

  async triggerScoutScheduler() {
    const api = getElectronAPI();
    if (api && typeof api.triggerScoutScheduler === 'function') {
      try {
        return await api.triggerScoutScheduler();
      } catch (e) {
        console.warn('[SCOUT] Electron triggerScoutScheduler failed, using REST:', e);
      }
    }
    const res = await fetch('/api/scout/scheduler/trigger', { method: 'POST' });
    return res.json();
  },

  async toggleScoutScheduler(enabled: boolean) {
    const api = getElectronAPI();
    if (api && typeof api.toggleScoutScheduler === 'function') {
      try {
        return await api.toggleScoutScheduler(enabled);
      } catch (e) {
        console.warn('[SCOUT] Electron toggleScoutScheduler failed, using REST:', e);
      }
    }
    const res = await fetch('/api/scout/scheduler/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });
    return res.json();
  },

  async getScoutSchedulerLogs() {
    const res = await fetch('/api/scout/scheduler/logs');
    return res.ok ? res.json() : { logs: [] };
  },

  onScoutLog(callback: (logLine: string) => void): () => void {
    const api = getElectronAPI();
    if (api && typeof api.onScoutLog === 'function') {
      return api.onScoutLog(callback);
    }
    return () => {};
  },

  // Deep Neural Scout with Gemini 3.1 Pro + Thinking Mode High
  async askNeuralScout(track: Partial<Track | LibraryEntry>, query: string): Promise<{ success: boolean; analysis: string; error?: string }> {
    const res = await fetch('/api/ai/neural-scout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ track, query })
    });
    return res.json();
  }
};
