/**
 * RAD X Main Electron Process
 * High-performance, secure audio intelligence desktop workstation
 */

const { app, BrowserWindow, session } = require('electron');
const path = require('path');
const { StorageManager } = require('./storage/StorageManager.cjs');
const { SettingsManager } = require('./managers/SettingsManager.cjs');
const { QueueManager } = require('./managers/QueueManager.cjs');
const { DownloadManager } = require('./managers/DownloadManager.cjs');
const { LibraryManager } = require('./managers/LibraryManager.cjs');
const { HunterEngine } = require('./services/HunterEngine.cjs');
const { ScoutEngine } = require('./services/ScoutEngine.cjs');
const { registerIpcHandlers } = require('./ipc/ipcHandlers.cjs');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1080,
    minHeight: 700,
    backgroundColor: '#090a0f',
    title: 'RAD X // UNDERGROUND AUDIO INTELLIGENCE',
    frame: true,
    titleBarStyle: 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      enableRemoteModule: false,
      spellcheck: false
    }
  });

  // Inject Strict Content Security Policy (CSP)
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://images.unsplash.com https://i.ytimg.com; connect-src 'self' http://localhost:3000 ws://localhost:3000; media-src 'self' blob: data:;"
        ]
      }
    });
  });

  // Initialize Storage and Core Subsystems
  const dataDir = path.join(app.getPath('userData'), 'radx_data');
  const storageManager = new StorageManager(dataDir);
  const settingsManager = new SettingsManager(storageManager);
  const queueManager = new QueueManager(storageManager);
  const downloadManager = new DownloadManager(storageManager, settingsManager);
  const libraryManager = new LibraryManager(storageManager, settingsManager);
  const hunterEngine = new HunterEngine(downloadManager, queueManager, libraryManager);
  const scoutEngine = new ScoutEngine(storageManager, libraryManager, downloadManager);

  // Register IPC Handlers
  registerIpcHandlers(
    {
      queueManager,
      downloadManager,
      libraryManager,
      settingsManager,
      hunterEngine,
      scoutEngine
    },
    mainWindow
  );

  const isDev = !app.isPackaged && (process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL);
  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
