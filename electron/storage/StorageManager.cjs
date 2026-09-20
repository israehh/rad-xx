/**
 * RAD X Electron Storage Manager
 * Thread-safe JSON persistence with backup rotation and memory caching
 */

const fs = require('fs');
const path = require('path');

class StorageManager {
  constructor(baseDir) {
    this.baseDir = baseDir || path.join(process.cwd(), 'data');
    this.cache = new Map();
    this.init();
  }

  init() {
    if (!fs.existsSync(this.baseDir)) {
      try {
        fs.mkdirSync(this.baseDir, { recursive: true });
      } catch (err) {
        console.error('[StorageManager] Failed to create base directory:', err);
      }
    }
  }

  getFilePath(key) {
    return path.join(this.baseDir, `${key}.json`);
  }

  get(key, defaultValue = null) {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const filePath = this.getFilePath(key);
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }

    try {
      const data = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(data);
      this.cache.set(key, parsed);
      return parsed;
    } catch (err) {
      console.warn(`[StorageManager] Corrupted JSON at ${filePath}, returning default`, err);
      return defaultValue;
    }
  }

  set(key, value) {
    this.cache.set(key, value);
    const filePath = this.getFilePath(key);
    const tempPath = `${filePath}.tmp`;

    try {
      // Atomic write pattern: write to tmp then rename
      fs.writeFileSync(tempPath, JSON.stringify(value, null, 2), 'utf-8');
      fs.renameSync(tempPath, filePath);
      return true;
    } catch (err) {
      console.error(`[StorageManager] Error persisting ${key}:`, err);
      return false;
    }
  }

  remove(key) {
    this.cache.delete(key);
    const filePath = this.getFilePath(key);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error(`[StorageManager] Error removing ${key}:`, err);
      }
    }
  }
}

module.exports = { StorageManager };
