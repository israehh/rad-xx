/**
 * RAD X Library Manager
 * Handles filesystem monitoring, directory scanning, format detection, and tracks.json synchronization
 */

const fs = require('fs');
const path = require('path');

const SUPPORTED_EXTENSIONS = ['.mp3', '.flac', '.wav', '.m4a', '.webm'];

class LibraryManager {
  constructor(storageManager, settingsManager) {
    this.storage = storageManager;
    this.settings = settingsManager;
    this.STORAGE_KEY = 'tracks';
    this.FOLDERS_KEY = 'musicFolders';
    this.tracks = this.storage.get(this.STORAGE_KEY, []);
    this.musicFolders = this.storage.get(this.FOLDERS_KEY, [
      { id: 'fld-main', path: this.settings.getSettings().musicDirectory || 'C:\\Music', category: 'Main', enabled: true },
      { id: 'fld-scout', path: this.settings.getSettings().scoutDirectory || 'C:\\Music\\Scout', category: 'Scout', enabled: true }
    ]);
    this.isScanning = false;

    // Seed realistic initial demo library if empty
    if (this.tracks.length === 0) {
      this.seedInitialLibrary();
    }
  }

  seedInitialLibrary() {
    this.tracks = [
      {
        id: 'lib-01',
        filePath: 'C:\\Music\\Klangkuenstler - Die Hölle Tanzt.mp3',
        fileName: 'Klangkuenstler - Die Hölle Tanzt.mp3',
        title: 'Die Hölle Tanzt (Raw Industrial Master)',
        artist: 'Klangkuenstler',
        album: 'Outworld Recordings',
        genre: 'Industrial Techno',
        bpm: 156,
        key: 'Fm',
        duration: '06:12',
        durationSec: 372,
        format: 'MP3',
        fileSize: 14850000,
        fileSizeFormatted: '14.2 MB',
        bitrate: '320 kbps',
        dateAdded: Date.now() - 86400000 * 5,
        lastScanned: Date.now(),
        folderCategory: 'Main',
        playCount: 14
      },
      {
        id: 'lib-02',
        filePath: 'C:\\Music\\Scout\\I Hate Models - Daydream.flac',
        fileName: 'I Hate Models - Daydream.flac',
        title: 'Daydream (Warehouse Acid Edit)',
        artist: 'I Hate Models',
        album: 'Arts Collective',
        genre: 'Dark Techno',
        bpm: 148,
        key: 'Am',
        duration: '07:44',
        durationSec: 464,
        format: 'FLAC',
        fileSize: 52400000,
        fileSizeFormatted: '49.9 MB',
        bitrate: 'Lossless 24-bit',
        dateAdded: Date.now() - 86400000 * 2,
        lastScanned: Date.now(),
        folderCategory: 'Scout',
        playCount: 28
      },
      {
        id: 'lib-03',
        filePath: 'C:\\Music\\Kobosil - Full Throttle.wav',
        fileName: 'Kobosil - Full Throttle.wav',
        title: 'Full Throttle (Neukölln Stomp)',
        artist: 'Kobosil',
        album: 'R-Label Group',
        genre: 'Hard Techno',
        bpm: 158,
        key: 'Dm',
        duration: '05:48',
        durationSec: 348,
        format: 'WAV',
        fileSize: 62900000,
        fileSizeFormatted: '60.0 MB',
        bitrate: '1411 kbps',
        dateAdded: Date.now() - 86400000 * 9,
        lastScanned: Date.now(),
        folderCategory: 'Main',
        playCount: 41
      },
      {
        id: 'lib-04',
        filePath: 'C:\\Music\\Boy Harsher - Pain.mp3',
        fileName: 'Boy Harsher - Pain.mp3',
        title: 'Pain (Industrial Darkwave Mix)',
        artist: 'Boy Harsher',
        album: 'Lesser Man EP',
        genre: 'EBM',
        bpm: 122,
        key: 'Gm',
        duration: '07:08',
        durationSec: 428,
        format: 'MP3',
        fileSize: 17100000,
        fileSizeFormatted: '16.3 MB',
        bitrate: '320 kbps',
        dateAdded: Date.now() - 86400000 * 12,
        lastScanned: Date.now(),
        folderCategory: 'Main',
        playCount: 33
      },
      {
        id: 'lib-05',
        filePath: 'C:\\Music\\Scout\\Carpenter Brut - Turbo Killer.webm',
        fileName: 'Carpenter Brut - Turbo Killer.webm',
        title: 'Turbo Killer (Overdrive Master)',
        artist: 'Carpenter Brut',
        album: 'Trilogy',
        genre: 'Synthwave',
        bpm: 130,
        key: 'Em',
        duration: '04:15',
        durationSec: 255,
        format: 'WEBM',
        fileSize: 11200000,
        fileSizeFormatted: '10.7 MB',
        bitrate: '160 kbps Opus',
        dateAdded: Date.now() - 86400000 * 1,
        lastScanned: Date.now(),
        folderCategory: 'Scout',
        playCount: 19
      }
    ];
    this.save();
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
          // If running locally without created folder, continue gracefully
          continue;
        }

        const entries = fs.readdirSync(dirObj.path, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isFile()) continue;

          const ext = path.extname(entry.name).toLowerCase();
          if (!SUPPORTED_EXTENSIONS.includes(ext)) continue;

          const fullPath = path.join(dirObj.path, entry.name);
          if (!existingFilePaths.has(fullPath)) {
            const stats = fs.statSync(fullPath);
            const rawName = path.basename(entry.name, ext);
            const parts = rawName.split(' - ');
            const artist = parts.length > 1 ? parts[0].trim() : 'Unknown Artist';
            const title = parts.length > 1 ? parts.slice(1).join(' - ').trim() : rawName;

            const format = ext.replace('.', '').toUpperCase();

            const newTrack = {
              id: `track-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
              filePath: fullPath,
              fileName: entry.name,
              title,
              artist,
              album: 'Local Import',
              genre: 'Industrial Techno',
              bpm: 145,
              key: 'Am',
              duration: '05:30',
              durationSec: 330,
              format,
              fileSize: stats.size,
              fileSizeFormatted: `${(stats.size / (1024 * 1024)).toFixed(1)} MB`,
              bitrate: '320 kbps',
              dateAdded: Date.now(),
              lastScanned: Date.now(),
              folderCategory: dirObj.category,
              playCount: 0
            };

            this.tracks.unshift(newTrack);
            existingFilePaths.add(fullPath);
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
