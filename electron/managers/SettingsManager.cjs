/**
 * RAD X Settings Manager
 * Handles user preferences, directories, audio quality, and persistence
 */

class SettingsManager {
  constructor(storageManager) {
    this.storage = storageManager;
    this.STORAGE_KEY = 'settings';
    this.defaultSettings = {
      musicDirectory: process.platform === 'win32' ? 'C:\\Music' : pathJoinHome('Music'),
      scoutDirectory: process.platform === 'win32' ? 'C:\\Music\\Scout' : pathJoinHome('Music/Scout'),
      autoScanOnStartup: true,
      maxConcurrentDownloads: 3,
      preferredFormat: 'MP3',
      audioBitrate: '320kbps',
      enableDailyScout: true,
      scoutIntervalHours: 24,
      crossfadeDurationSec: 4,
      highThinkingEnabled: true,
      themeMode: 'cyberpunk-dark'
    };
  }

  getSettings() {
    const saved = this.storage.get(this.STORAGE_KEY, {});
    return { ...this.defaultSettings, ...saved };
  }

  updateSettings(updates) {
    const current = this.getSettings();
    const updated = { ...current, ...updates };
    this.storage.set(this.STORAGE_KEY, updated);
    return updated;
  }
}

function pathJoinHome(sub) {
  const home = process.env.HOME || process.env.USERPROFILE || '.';
  return `${home}/${sub}`;
}

module.exports = { SettingsManager };
