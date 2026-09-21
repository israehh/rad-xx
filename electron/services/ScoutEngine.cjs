/**
 * RAD X Scout Engine - Real Radar Discovery Engine
 * Autonomous radar discovery engine, trend analyzer, and duplicate rejection filter.
 * Scans real networks using yt-dlp to identify underground audio releases.
 */

const { searchMedia } = require('../utils/ytdlp.cjs');

class ScoutEngine {
  constructor(storageManager, libraryManager, downloadManager, queueManager = null) {
    this.storage = storageManager;
    this.libraryManager = libraryManager;
    this.downloadManager = downloadManager;
    this.queueManager = queueManager;
    this.STORAGE_KEY = 'scout_results';
    this.results = this.storage.get(this.STORAGE_KEY, []);
    this.isScanning = false;
  }

  save() {
    this.storage.set(this.STORAGE_KEY, this.results);
  }

  getAll() {
    return [...this.results];
  }

  /**
   * Run real radar scan against live sources
   */
  async runDailyRadarScan(genres = ['Industrial Techno', 'Hard Techno'], autoQueue = true) {
    if (this.isScanning) {
      return { success: false, message: 'Radar scan currently active' };
    }

    this.isScanning = true;
    console.log('[SCOUT] [REAL] Initiating live network radar scan across genres:', genres);

    try {
      const libraryTracks = this.libraryManager ? this.libraryManager.getAll() : [];
      const queueTracks = this.queueManager ? this.queueManager.getAll() : [];
      const downloadJobs = this.downloadManager ? this.downloadManager.getAll() : [];

      const existingTitles = new Set([
        ...libraryTracks.map(t => (t.title || '').toLowerCase().trim()),
        ...queueTracks.map(q => (q.title || '').toLowerCase().trim()),
        ...downloadJobs.map(d => (d.title || '').toLowerCase().trim())
      ]);
      const scoutTitles = new Set(this.results.map(r => (r.title || '').toLowerCase().trim()));

      let addedCount = 0;
      let queuedCount = 0;

      for (const genre of genres.slice(0, 3)) {
        const query = `${genre} underground club master`;
        const liveTracks = await searchMedia({ query, genre, limit: 6 });

        for (const track of liveTracks) {
          const normTitle = (track.title || '').toLowerCase().trim();
          const isDup = existingTitles.has(normTitle) || scoutTitles.has(normTitle);

          const newItem = {
            id: `scout-${track.id || Date.now()}`,
            ...track,
            trendScore: null,
            detectionDate: new Date().toISOString().split('T')[0],
            classificationNotes: track.source ? `Discovered via ${track.source} audio network.` : null,
            isDuplicate: isDup,
            status: isDup ? 'archived' : 'new'
          };

          this.results.unshift(newItem);
          scoutTitles.add(normTitle);
          addedCount++;

          // Send valid non-duplicate discoveries to queue
          if (!isDup && autoQueue && this.queueManager) {
            this.queueManager.add(track, 'MP3');
            existingTitles.add(normTitle);
            queuedCount++;
          }
        }
      }

      // Limit results history to 200 entries
      if (this.results.length > 200) {
        this.results = this.results.slice(0, 200);
      }

      this.save();
      return {
        success: true,
        newDiscoveriesCount: addedCount,
        queuedCount,
        totalScoutCount: this.results.length
      };
    } catch (err) {
      console.error('[SCOUT] Radar scan error:', err);
      return { success: false, error: err.message };
    } finally {
      this.isScanning = false;
    }
  }

  updateItemStatus(id, newStatus) {
    const item = this.results.find(r => r.id === id);
    if (item) {
      item.status = newStatus;
      this.save();
      return true;
    }
    return false;
  }
}

module.exports = { ScoutEngine };
