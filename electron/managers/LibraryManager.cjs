/**
 * RAD X Library Manager - Real Audio Filesystem Indexer
 * Handles filesystem monitoring, directory scanning, authentic ffprobe metadata extraction,
 * and tracks.json synchronization without fake demo tracks.
 */

const fs = require('fs');
const path = require('path');
const { inspectAudioFile, formatBytes } = require('../utils/ytdlp.cjs');

const SUPPORTED_EXTENSIONS = ['.mp3', '.flac', '.wav', '.m4a', '.webm', '.ogg', '.opus'];

class LibraryManager {
  constructor(storageManager, settingsManager) {
    this.storage = storageManager;
    this.settings = settingsManager;
    this.STORAGE_KEY = 'tracks';
    this.FOLDERS_KEY = 'musicFolders';
    this.tracks = this.storage.get(this.STORAGE_KEY, []);

    const userSettings = this.settings.getSettings();
    const defaultMusicDir = userSettings.musicDirectory || (process.platform === 'win32' ? 'C:\\Music' : path.join(process.cwd(), 'downloads'));
    const defaultScoutDir = userSettings.scoutDirectory || (process.platform === 'win32' ? 'C:\\Music\\Scout' : path.join(process.cwd(), 'downloads', 'Scout'));

    this.musicFolders = this.storage.get(this.FOLDERS_KEY, [
      { id: 'fld-main', path: defaultMusicDir, category: 'Main', enabled: true },
      { id: 'fld-scout', path: defaultScoutDir, category: 'Scout', enabled: true }
    ]);
    this.isScanning = false;
  }

  save() {
    this.storage.set(this.STORAGE_KEY, this.tracks);
  }

  getAll() {
    return [...this.tracks];
  }

  async scanDirectories() {
    if (this.isScanning) {
      return { success: false, message: 'Scan already in progress' };
    }

    this.isScanning = true;
    const directories = this.musicFolders
      .filter(f => f.enabled !== false)
      .map(f => ({ path: f.path, category: f.category || 'Main' }));

    let newFound = 0;
    const existingFilePaths = new Set(this.tracks.map(t => (t.filePath || '').toLowerCase()));

    try {
      for (const dirObj of directories) {
        if (!fs.existsSync(dirObj.path)) {
          continue;
        }

        const entries = fs.readdirSync(dirObj.path, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isFile()) continue;

          const ext = path.extname(entry.name).toLowerCase();
          if (!SUPPORTED_EXTENSIONS.includes(ext)) continue;

          const fullPath = path.join(dirObj.path, entry.name);
          if (!existingFilePaths.has(fullPath.toLowerCase())) {
            const rawName = path.basename(entry.name, ext);
            const parts = rawName.split(' - ');
            const artist = parts.length > 1 ? parts[0].trim() : 'Underground Artist';
            const title = parts.length > 1 ? parts.slice(1).join(' - ').trim() : rawName;
            const format = ext.replace('.', '').toUpperCase();

            // Extract genuine audio duration, bitrate, and size
            const audioMeta = await inspectAudioFile(fullPath);

            const newTrack = {
              id: `track-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
              filePath: fullPath,
              fileName: entry.name,
              title,
              artist,
              album: dirObj.category === 'Scout' ? 'RAD X Scout' : 'Local Library',
              genre: null,
              bpm: null,
              key: null,
              duration: audioMeta.duration || null,
              durationSec: audioMeta.durationSec || null,
              format: audioMeta.format || format || null,
              channels: audioMeta.channels || null,
              codec: audioMeta.codec || null,
              fileSize: audioMeta.fileSize,
              fileSizeFormatted: audioMeta.fileSizeFormatted,
              bitrate: audioMeta.bitrate || null,
              dateAdded: Date.now(),
              lastScanned: Date.now(),
              folderCategory: dirObj.category,
              playCount: 0
            };

            this.tracks.unshift(newTrack);
            existingFilePaths.add(fullPath.toLowerCase());
            newFound++;
          }
        }
      }

      this.save();
      return { success: true, newTracksCount: newFound, totalCount: this.tracks.length };
    } catch (err) {
      console.error('[LibraryManager] Error scanning directories:', err);
      return { success: false, error: err.message };
    } finally {
      this.isScanning = false;
    }
  }

  addTrack(trackData) {
    const isDuplicate = this.tracks.some(
      t => (t.filePath && trackData.filePath && t.filePath.toLowerCase() === trackData.filePath.toLowerCase()) ||
           (t.title && trackData.title && t.title.toLowerCase().trim() === trackData.title.toLowerCase().trim() &&
            t.artist && trackData.artist && t.artist.toLowerCase().trim() === trackData.artist.toLowerCase().trim())
    );
    if (isDuplicate) {
      return null;
    }
    this.tracks.unshift(trackData);
    this.save();
    return trackData;
  }

  getMusicFolders() {
    return [...this.musicFolders];
  }

  saveFolders() {
    this.storage.set(this.FOLDERS_KEY, this.musicFolders);
  }

  addMusicFolder(folder) {
    if (!this.musicFolders.some(f => f.path.toLowerCase() === folder.path.toLowerCase())) {
      this.musicFolders.push({
        id: `fld-${Date.now()}`,
        path: folder.path,
        category: folder.category || 'User',
        enabled: true
      });
      this.saveFolders();
    }
    return this.musicFolders;
  }

  deleteTrack(id) {
    const prevLen = this.tracks.length;
    this.tracks = this.tracks.filter(t => t.id !== id);
    if (this.tracks.length !== prevLen) {
      this.save();
      return true;
    }
    return false;
  }

  incrementPlayCount(id) {
    const track = this.tracks.find(t => t.id === id);
    if (track) {
      track.playCount = (track.playCount || 0) + 1;
      this.save();
      return track.playCount;
    }
    return 0;
  }
}

module.exports = { LibraryManager };
