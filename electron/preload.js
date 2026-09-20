/**
 * RAD X Secure Preload Script
 * Exposes strictly typed, whitelisted IPC communication bridge using Context Isolation
 */

const { contextBridge, ipcRenderer } = require('electron');

const electronAPI = {
  // Hunter
  searchHunter: async (params) => {
    console.log('[IPC] [HUNTER] preload invoking hunter search with params:', params);
    try {
      // Support both hunter:search and hunter-search channels
      const res = await ipcRenderer.invoke('hunter:search', params).catch(() => {
        return ipcRenderer.invoke('hunter-search', params);
      });
      console.log('[IPC] [HUNTER] preload search response:', res);
      return res;
    } catch (err) {
      console.error('[IPC] [HUNTER] preload search error:', err);
      return { success: false, results: [], error: err.message };
    }
  },

  // Queue
  getQueue: () => ipcRenderer.invoke('queue:get'),
  addToQueue: (track, format) => ipcRenderer.invoke('queue:add', { track, format }),
  removeFromQueue: (id) => ipcRenderer.invoke('queue:remove', { id }),
  clearQueue: () => ipcRenderer.invoke('queue:clear'),

  // Downloads
  getDownloads: () => {
    console.log('[IPC] [DOWNLOAD] preload requesting downloads list');
    return ipcRenderer.invoke('download:get');
  },
  addDownload: (track, format) => {
    console.log('[IPC] [DOWNLOAD] preload requesting add download:', track?.title, format);
    return ipcRenderer.invoke('download:add', { track, format });
  },
  pauseDownload: (jobId) => {
    console.log('[IPC] [DOWNLOAD] preload pause:', jobId);
    return ipcRenderer.invoke('download:pause', { jobId });
  },
  resumeDownload: (jobId) => {
    console.log('[IPC] [DOWNLOAD] preload resume:', jobId);
    return ipcRenderer.invoke('download:resume', { jobId });
  },
  cancelDownload: (jobId) => {
    console.log('[IPC] [DOWNLOAD] preload cancel:', jobId);
    return ipcRenderer.invoke('download:cancel', { jobId });
  },
  retryDownload: (jobId) => {
    console.log('[IPC] [DOWNLOAD] preload retry:', jobId);
    return ipcRenderer.invoke('download:retry', { jobId });
  },
  clearFinishedDownloads: () => ipcRenderer.invoke('download:clearFinished'),

  // Download listeners
  onDownloadProgress: (callback) => {
    const handler = (_event, value) => {
      console.log('[IPC] [DOWNLOAD] Progress event received:', value?.id, `${value?.progress?.percentage}%`);
      callback(value);
    };
    ipcRenderer.on('download:onProgress', handler);
    return () => ipcRenderer.removeListener('download:onProgress', handler);
  },
  onDownloadStatusChange: (callback) => {
    const handler = (_event, value) => {
      console.log('[IPC] [DOWNLOAD] Status change event:', value?.id, value?.status);
      callback(value);
    };
    ipcRenderer.on('download:onStatusChange', handler);
    return () => ipcRenderer.removeListener('download:onStatusChange', handler);
  },

  // Library
  getLibrary: () => ipcRenderer.invoke('library:get'),
  scanLibrary: () => ipcRenderer.invoke('library:scan'),
  deleteFromLibrary: (id) => ipcRenderer.invoke('library:delete', { id }),
  onLibraryUpdated: (callback) => {
    const handler = (_event, value) => callback(value);
    ipcRenderer.on('library:onUpdated', handler);
    return () => ipcRenderer.removeListener('library:onUpdated', handler);
  },

  // Scout
  getScoutResults: () => ipcRenderer.invoke('scout:get'),
  scanScoutRadar: () => ipcRenderer.invoke('scout:scan'),
  updateScoutStatus: (id, status) => ipcRenderer.invoke('scout:updateStatus', { id, status }),
  getScoutSchedulerStatus: () => ipcRenderer.invoke('scout:scheduler-status'),
  triggerScoutScheduler: () => ipcRenderer.invoke('scout:scheduler-trigger'),
  toggleScoutScheduler: (enabled) => ipcRenderer.invoke('scout:scheduler-toggle', { enabled }),
  onScoutLog: (callback) => {
    const handler = (_event, value) => callback(value);
    ipcRenderer.on('scout:onLog', handler);
    return () => ipcRenderer.removeListener('scout:onLog', handler);
  },

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (updates) => ipcRenderer.invoke('settings:update', updates),

  // System
  openFolder: (folderPath) => ipcRenderer.invoke('system:openPath', { folderPath })
};

// Expose under both electronAPI and radx namespaces for full compatibility
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
contextBridge.exposeInMainWorld('radx', electronAPI);
