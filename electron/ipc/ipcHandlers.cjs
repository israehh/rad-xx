/**
 * RAD X IPC Handlers
 * Clean, secure, and isolated IPC dispatch layer connecting Electron Main with Preload Bridge
 */

const { ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { inspectAudioFile, formatBytes } = require('../utils/ytdlp.cjs');

function registerIpcHandlers(managers, mainWindow) {
  const { queueManager, downloadManager, libraryManager, settingsManager, hunterEngine, scoutEngine, scoutScheduler } = managers;

  if (scoutScheduler) {
    scoutScheduler.on('log', (logData) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('scout:onLog', logData);
      }
    });
  }

  // --- HUNTER IPC ---
  const handleHunterSearch = async (event, params) => {
    console.log('[IPC] [HUNTER] Received search IPC request params:', params);
    try {
      const results = await hunterEngine.search(params || {});
      console.log(`[IPC] [HUNTER] Search completed successfully with ${results?.length || 0} tracks`);
      return { success: true, results };
    } catch (err) {
      console.error('[IPC] [HUNTER] search handler exception:', err);
      return { success: false, results: [], error: err.message };
    }
  };

  ipcMain.handle('hunter:search', handleHunterSearch);
  ipcMain.handle('hunter-search', handleHunterSearch);

  // --- QUEUE IPC ---
  ipcMain.handle('queue:get', async () => {
    return queueManager.getAll();
  });

  ipcMain.handle('queue:add', async (event, { track, format }) => {
    return queueManager.add(track, format);
  });

  ipcMain.handle('queue:remove', async (event, { id }) => {
    return queueManager.remove(id);
  });

  ipcMain.handle('queue:clear', async () => {
    return queueManager.clear();
  });

  // --- DOWNLOAD MANAGER IPC ---
  ipcMain.handle('download:get', async () => {
    console.log('[IPC] [DOWNLOAD] download:get called');
    return downloadManager.getAll();
  });

  ipcMain.handle('download:add', async (event, { track, format }) => {
    console.log('[IPC] [DOWNLOAD] download:add called for track:', track?.title);
    return downloadManager.addJob(track, format);
  });

  ipcMain.handle('download:pause', async (event, { jobId }) => {
    console.log('[IPC] [DOWNLOAD] download:pause called for jobId:', jobId);
    return downloadManager.pauseJob(jobId);
  });

  ipcMain.handle('download:resume', async (event, { jobId }) => {
    console.log('[IPC] [DOWNLOAD] download:resume called for jobId:', jobId);
    return downloadManager.resumeJob(jobId);
  });

  ipcMain.handle('download:cancel', async (event, { jobId }) => {
    console.log('[IPC] [DOWNLOAD] download:cancel called for jobId:', jobId);
    return downloadManager.cancelJob(jobId);
  });

  ipcMain.handle('download:retry', async (event, { jobId }) => {
    console.log('[IPC] [DOWNLOAD] download:retry called for jobId:', jobId);
    return downloadManager.retryJob(jobId);
  });

  ipcMain.handle('download:clearFinished', async () => {
    console.log('[IPC] [DOWNLOAD] download:clearFinished called');
    return downloadManager.clearFinished();
  });

  // Stream download progress events to Renderer window safely
  downloadManager.on('jobProgress', (job) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('download:onProgress', job);
    }
  });

  downloadManager.on('jobStatusChange', (job) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('download:onStatusChange', job);
    }
  });

  // Automatically integrate completed download into Library and tracks.json with authentic metadata
  downloadManager.on('jobFinished', async (job) => {
    try {
      const filePath = job.targetPath;
      const fileName = path.basename(filePath);
      const rawName = fileName.replace(/\.[^/.]+$/, '');
      const parts = rawName.split(' - ');
      const artist = parts.length > 1 ? parts[0].trim() : (job.artist || 'Underground Artist');
      const title = parts.length > 1 ? parts.slice(1).join(' - ').trim() : (job.title || rawName);

      let audioMeta = null;
      if (fs.existsSync(filePath)) {
        audioMeta = await inspectAudioFile(filePath);
      }

      const stats = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
      const fileSize = stats ? stats.size : (job.progress?.totalBytes || 12000000);

      const newLibraryTrack = {
        id: `lib-${job.trackId || Date.now()}`,
        filePath,
        fileName,
        title,
        artist,
        album: 'Descargas RAD X',
        genre: job.genre || 'Industrial Techno',
        bpm: job.bpm || 148,
        key: job.key || 'Am',
        duration: audioMeta?.duration || job.duration || '05:00',
        durationSec: audioMeta?.durationSec || job.durationSec || 300,
        format: audioMeta?.format || job.format || 'MP3',
        channels: audioMeta?.channels || 2,
        fileSize,
        fileSizeFormatted: formatBytes(fileSize),
        bitrate: audioMeta?.bitrate || (job.format === 'WEBM' ? '160 kbps Opus' : '320 kbps'),
        dateAdded: Date.now(),
        lastScanned: Date.now(),
        folderCategory: filePath.toLowerCase().includes('scout') ? 'Scout' : 'Main',
        playCount: 0
      };

      libraryManager.addTrack(newLibraryTrack);

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('library:onUpdated', libraryManager.getAll());
      }
    } catch (syncErr) {
      console.error('[IPC] Error al registrar descarga en biblioteca:', syncErr);
    }
  });

  // --- LIBRARY IPC ---
  ipcMain.handle('library:get', async () => {
    return libraryManager.getAll();
  });

  ipcMain.handle('library:scan', async () => {
    return libraryManager.scanDirectories();
  });

  ipcMain.handle('library:delete', async (event, { id }) => {
    return libraryManager.deleteTrack(id);
  });

  // --- SCOUT IPC ---
  ipcMain.handle('scout:get', async () => {
    return scoutEngine.getAll();
  });

  ipcMain.handle('scout:scan', async () => {
    return scoutEngine.runDailyRadarScan();
  });

  ipcMain.handle('scout:updateStatus', async (event, { id, status }) => {
    return scoutEngine.updateItemStatus(id, status);
  });

  // --- SCOUT SCHEDULER IPC ---
  ipcMain.handle('scout:scheduler-status', async () => {
    if (scoutScheduler) {
      return scoutScheduler.getStatus();
    }
    return { active: false, error: 'Scheduler not initialized' };
  });

  ipcMain.handle('scout:get-scheduler-status', async () => {
    if (scoutScheduler) {
      return scoutScheduler.getStatus();
    }
    return { active: false, error: 'Scheduler not initialized' };
  });

  ipcMain.handle('scout:scheduler-trigger', async () => {
    if (scoutScheduler) {
      await scoutScheduler.executeCycle();
      return { success: true, status: scoutScheduler.getStatus() };
    }
    return { success: false, reason: 'Scheduler not initialized' };
  });

  ipcMain.handle('scout:trigger-scheduler', async () => {
    if (scoutScheduler) {
      await scoutScheduler.executeCycle();
      return { success: true, status: scoutScheduler.getStatus() };
    }
    return { success: false, reason: 'Scheduler not initialized' };
  });

  ipcMain.handle('scout:scheduler-toggle', async (event, { enabled }) => {
    if (scoutScheduler) {
      if (enabled) {
        scoutScheduler.start();
      } else {
        scoutScheduler.stop();
      }
      return { success: true, status: scoutScheduler.getStatus() };
    }
    return { success: false };
  });

  ipcMain.handle('scout:toggle-scheduler', async (event, { enabled }) => {
    if (scoutScheduler) {
      if (enabled) {
        scoutScheduler.start();
      } else {
        scoutScheduler.stop();
      }
      return { success: true, status: scoutScheduler.getStatus() };
    }
    return { success: false };
  });

  // --- SETTINGS IPC ---
  ipcMain.handle('settings:get', async () => {
    return settingsManager.getSettings();
  });

  ipcMain.handle('settings:update', async (event, updates) => {
    return settingsManager.updateSettings(updates);
  });

  // --- SYSTEM IPC ---
  ipcMain.handle('system:openPath', async (event, { folderPath }) => {
    if (shell && folderPath) {
      await shell.openPath(folderPath);
      return { success: true };
    }
    return { success: false, reason: 'Unsupported path or platform' };
  });
}

module.exports = { registerIpcHandlers };
