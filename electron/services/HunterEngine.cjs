/**
 * RAD X Hunter Engine - Real Search Architecture
 * Real multi-provider underground audio crawler powered by yt-dlp (YouTube, SoundCloud, Bandcamp/Direct)
 * Never synthesizes fake tracks or relies on static mock catalogs.
 */

const { searchMedia } = require('../utils/ytdlp.cjs');

class HunterEngine {
  constructor(downloadManager, queueManager, libraryManager) {
    this.downloadManager = downloadManager;
    this.queueManager = queueManager;
    this.libraryManager = libraryManager;
  }

  async search(params = {}) {
    const {
      genre = 'Industrial Techno',
      searchQuery = '',
      limit = 15,
      provider = 'all'
    } = params;

    console.log(`[HUNTER] [REAL] Search query="${searchQuery}", genre="${genre}", provider="${provider}"`);

    try {
      // Execute live extraction via yt-dlp across real providers
      const rawResults = await searchMedia({
        query: searchQuery,
        genre,
        limit,
        provider
      });

      console.log(`[HUNTER] [REAL] Extracted ${rawResults.length} real audio tracks from network`);

      // Augment each genuine track with client status flags (isDownloaded, isQueued)
      const tracks = rawResults.map(track => {
        const isDownloaded = this.downloadManager ? this.downloadManager.isDownloaded(track.id) : false;
        const isQueued = (this.queueManager && this.queueManager.isQueued(track.id)) ||
                         (this.downloadManager && this.downloadManager.isDownloadingOrQueued(track.id));

        return {
          ...track,
          isDownloaded: !!isDownloaded,
          isQueued: !!isQueued
        };
      });

      return tracks;
    } catch (err) {
      console.error('[HUNTER] [REAL] Search exception:', err);
      // Return empty array on failure - NEVER fabricate fake tracks
      return [];
    }
  }

  getGenres() {
    return [
      'Industrial Techno',
      'Hard Techno',
      'Dark Techno',
      'Peak Time Techno',
      'Minimal Techno',
      'EBM',
      'Synthwave',
      'Custom'
    ];
  }
}

module.exports = { HunterEngine };
