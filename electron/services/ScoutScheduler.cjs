/**
 * RAD X ScoutScheduler Service - Real Autonomous Audio Pipeline
 * Autonomous 24/7 background music discovery, duplicate filtering, queueing,
 * real audio downloading via yt-dlp, and physical library indexing.
 */

const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');
const { searchMedia, inspectAudioFile, formatBytes } = require('../utils/ytdlp.cjs');

const SCOUT_DISCOVERY_TARGETS = [
  'Industrial Techno',
  'Hard Techno',
  'Dark Techno',
  'Peak Time Techno',
  'EBM',
  'Synthwave',
  'Jeff Mills',
  'Adam Beyer',
  'Kobosil',
  'Klangkuenstler',
  'Alignment',
  'I Hate Models',
  'Dax J',
  'Amelie Lens'
];

class ScoutScheduler extends EventEmitter {
  constructor(scoutEngine, queueManager, downloadManager, libraryManager, settingsManager) {
    super();
    this.scoutEngine = scoutEngine;
    this.queueManager = queueManager;
    this.downloadManager = downloadManager;
    this.libraryManager = libraryManager;
    this.settingsManager = settingsManager;

    this.timer = null;
    this.isRunningCycle = false;
    this.cycleCount = 0;
    this.lastRunTimestamp = 0;
    this.nextRunTimestamp = 0;
    this.totalFoundLifetime = 0;
    this.totalQueuedLifetime = 0;
    this.totalDownloadedLifetime = 0;
    this.logs = [];

    this.setupDownloadEventListeners();
  }

  log(tag, message) {
    const time = new Date().toISOString().substring(11, 19);
    const line = `[${time}] [${tag}] ${message}`;
    this.logs.unshift(line);
    if (this.logs.length > 200) this.logs.pop();
    console.log(`[${tag}] ${message}`);
    this.emit('log', { tag, message, time, line });
  }

  setupDownloadEventListeners() {
    if (!this.downloadManager) return;

    // Listen for real download progress/status
    this.downloadManager.on('jobStatusChange', (job) => {
      if (job.status === 'Downloading' && !job._loggedStarted) {
        job._loggedStarted = true;
        this.log('DOWNLOAD', `Started ${job.artist} - ${job.title}`);
      }
    });

    // Listen for real download completion and auto-index to library with real audio metadata
    this.downloadManager.on('jobFinished', async (job) => {
      this.log('DOWNLOAD', `Completed ${job.artist} - ${job.title}`);
      this.totalDownloadedLifetime++;

      try {
        const filePath = job.targetPath;
        const fileName = path.basename(filePath);

        // Inspect the physical file to extract authentic metadata
        let audioMeta = null;
        if (fs.existsSync(filePath)) {
          audioMeta = await inspectAudioFile(filePath);
        }

        const stats = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
        const fileSize = stats ? stats.size : (job.progress?.totalBytes || 0);

        const indexedTrack = {
          id: `lib-${job.trackId || Date.now()}`,
          filePath,
          fileName,
          title: job.title || 'Unknown Title',
          artist: job.artist || null,
          album: 'RAD X Offline Library',
          genre: job.genre || null,
          bpm: job.bpm || null,
          key: job.key || null,
          duration: audioMeta?.duration || job.actualDuration || job.duration || null,
          durationSec: audioMeta?.durationSec || job.actualDurationSec || job.durationSec || null,
          format: audioMeta?.format || job.actualFormat || job.format || null,
          channels: audioMeta?.channels || job.actualChannels || null,
          codec: audioMeta?.codec || job.actualCodec || null,
          fileSize,
          fileSizeFormatted: formatBytes(fileSize),
          bitrate: audioMeta?.bitrate || job.actualBitrate || null,
          dateAdded: Date.now(),
          lastScanned: Date.now(),
          folderCategory: 'Scout',
          playCount: 0
        };

        const added = this.libraryManager.addTrack(indexedTrack);
        if (added) {
          this.log('LIBRARY', `Indexed ${job.artist} - ${job.title} (${indexedTrack.fileSizeFormatted}, ${indexedTrack.duration})`);
        }
      } catch (err) {
        console.error('[ScoutScheduler] Library indexing error:', err);
      }
    });
  }

  start() {
    this.restorePendingRecovery();

    const settings = this.getMergedSettings();
    if (!settings.autoScout) {
      this.log('SCOUT', 'Autonomous Scout Scheduler is disabled in settings. Ready on standby.');
      return;
    }

    const intervalMinutes = Math.max(1, settings.scoutIntervalMinutes || 30);
    const intervalMs = intervalMinutes * 60 * 1000;

    this.log('SCOUT', `Autonomous 24/7 Discovery Engine activated. Next cycle scheduled in ${intervalMinutes} minutes.`);

    if (this.timer) clearInterval(this.timer);
    this.nextRunTimestamp = Date.now() + 4000;

    // Run initial discovery cycle shortly after startup
    setTimeout(() => {
      this.executeCycle();
    }, 4000);

    // Schedule regular cycle
    this.timer = setInterval(() => {
      this.executeCycle();
    }, intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.log('SCOUT', 'Autonomous Scout Scheduler stopped.');
  }

  getMergedSettings() {
    const s = this.settingsManager ? this.settingsManager.getSettings() : {};
    return {
      autoScout: s.autoScout !== false,
      scoutIntervalMinutes: s.scoutIntervalMinutes || 30,
      autoDownload: s.autoDownload !== false,
      avoidDuplicates: s.avoidDuplicates !== false,
      maxDownloadsPerCycle: s.maxDownloadsPerCycle || 20,
      minTrackDuration: s.minTrackDuration || 120,
      maxTrackDuration: s.maxTrackDuration || 1200,
      preferredFormat: s.preferredFormat || 'MP3',
      enabledGenres: s.enabledGenres || [
        'Hard Techno',
        'Industrial Techno',
        'Dark Techno',
        'Peak Time Techno',
        'EBM',
        'Synthwave'
      ]
    };
  }

  restorePendingRecovery() {
    this.log('SCOUT', 'Scanning for interrupted downloads and pending queues to restore...');
    try {
      const queue = this.queueManager ? this.queueManager.getAll() : [];
      if (queue.length > 0) {
        this.log('QUEUE', `Restored ${queue.length} pending items in queue.`);
      }

      if (this.downloadManager) {
        let resumed = 0;
        const jobs = this.downloadManager.getAll ? this.downloadManager.getAll() : [];
        jobs.forEach(job => {
          if (job.status === 'Downloading' || job.status === 'Queued') {
            resumed++;
            this.downloadManager.startJob(job.id);
          }
        });
        if (resumed > 0) {
          this.log('DOWNLOAD', `Restored and resumed ${resumed} incomplete downloads.`);
        }
      }
    } catch (err) {
      console.warn('[ScoutScheduler] Notice during recovery restoration:', err.message);
    }
  }

  normalizeText(text) {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/[\(\)\[\]\{\}\-_,.]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  isDuplicate(candidate, libraryTracks, downloadJobs, queueItems, settings) {
    if (!settings.avoidDuplicates) return false;

    const candTitleNorm = this.normalizeText(candidate.title);
    const candArtistNorm = this.normalizeText(candidate.artist);
    const candFileName = `${candidate.title.replace(/[\\/:*?"<>|]/g, '_')}.${(settings.preferredFormat || 'MP3').toLowerCase()}`.toLowerCase();

    // 1. Check existing entries in tracks.json (Library)
    for (const lib of libraryTracks) {
      const libTitleNorm = this.normalizeText(lib.title);
      const libArtistNorm = this.normalizeText(lib.artist);
      const libFileName = (lib.fileName || path.basename(lib.filePath || '')).toLowerCase();

      if (libFileName === candFileName) return true;
      if (candTitleNorm === libTitleNorm) return true;
      if (candArtistNorm && libArtistNorm && candArtistNorm === libArtistNorm && candTitleNorm.includes(libTitleNorm)) {
        return true;
      }
      if (candidate.durationSec && lib.durationSec && Math.abs(candidate.durationSec - lib.durationSec) <= 3 && candTitleNorm === libTitleNorm) {
        return true;
      }
    }

    // 2. Check downloads.json (active or finished)
    for (const job of downloadJobs) {
      const jobTitleNorm = this.normalizeText(job.title);
      if (candTitleNorm === jobTitleNorm) return true;
      if (job.targetPath && path.basename(job.targetPath).toLowerCase() === candFileName) return true;
      if (job.sourceUrl && candidate.sourceUrl && job.sourceUrl === candidate.sourceUrl) return true;
    }

    // 3. Check queue.json
    for (const q of queueItems) {
      if (this.normalizeText(q.title) === candTitleNorm) return true;
      if (q.trackId === candidate.id) return true;
    }

    return false;
  }

  async executeCycle() {
    if (this.isRunningCycle) return;
    this.isRunningCycle = true;
    this.cycleCount++;
    this.lastRunTimestamp = Date.now();

    const settings = this.getMergedSettings();
    const intervalMinutes = Math.max(1, settings.scoutIntervalMinutes || 30);
    this.nextRunTimestamp = Date.now() + intervalMinutes * 60 * 1000;

    this.log('SCOUT', `Starting autonomous discovery cycle #${this.cycleCount} with live network extraction`);

    try {
      const libraryTracks = this.libraryManager ? this.libraryManager.getAll() : [];
      const downloadJobs = this.downloadManager ? this.downloadManager.getAll() : [];
      const queueItems = this.queueManager ? this.queueManager.getAll() : [];

      // Determine query pool: combine user's enabled genres and artist radar
      const queryPool = [...(settings.enabledGenres || []), ...SCOUT_DISCOVERY_TARGETS];
      // Pick 2-3 targets per cycle to avoid network flooding
      const targetQueryIndex = (this.cycleCount - 1) % queryPool.length;
      const primaryTarget = queryPool[targetQueryIndex];
      const secondaryTarget = queryPool[(targetQueryIndex + 1) % queryPool.length];

      this.log('SCOUT', `Scanning live sources for target themes: "${primaryTarget}" & "${secondaryTarget}"`);

      // Search real tracks via yt-dlp
      const rawDiscovered = await Promise.all([
        searchMedia({ query: `${primaryTarget} underground set`, genre: primaryTarget, limit: 10 }),
        searchMedia({ query: `${secondaryTarget} warehouse edit`, genre: secondaryTarget, limit: 10 })
      ]);

      const candidatePool = [];
      const allFound = [...rawDiscovered[0], ...rawDiscovered[1]];

      for (const track of allFound) {
        // Duration filter using real audio length
        if (track.durationSec < settings.minTrackDuration || track.durationSec > settings.maxTrackDuration) {
          continue;
        }

        // Duplicate rejection
        if (this.isDuplicate(track, libraryTracks, downloadJobs, queueItems, settings)) {
          continue;
        }

        candidatePool.push(track);
      }

      const foundCount = candidatePool.length;
      this.totalFoundLifetime += foundCount;
      this.log('SCOUT', `Discovered ${foundCount} new valid underground tracks`);

      if (foundCount === 0) {
        this.log('SCOUT', 'No new eligible tracks found in this cycle (all existing or filtered). Standing by.');
        return;
      }

      // Limit according to maxDownloadsPerCycle
      const limit = Math.min(candidatePool.length, settings.maxDownloadsPerCycle || 20);
      const selectedTracks = candidatePool.slice(0, limit);

      // Add to Queue
      for (const track of selectedTracks) {
        if (this.queueManager) {
          this.queueManager.add(track, settings.preferredFormat || 'MP3');
          this.log('QUEUE', `Added ${track.artist} - ${track.title} (${track.duration})`);
          this.totalQueuedLifetime++;
        }

        // Trigger real download if autoDownload is enabled
        if (settings.autoDownload && this.downloadManager) {
          this.downloadManager.addJob(track, settings.preferredFormat || 'MP3');
        }
      }

      this.log('SCOUT', `Cycle #${this.cycleCount} successfully dispatched ${selectedTracks.length} tracks to queue & download engine.`);
    } catch (err) {
      console.error('[ScoutScheduler] Discovery cycle error:', err);
      this.log('SCOUT', `Notice in cycle #${this.cycleCount}: ${err.message}`);
    } finally {
      this.isRunningCycle = false;
    }
  }

  getStatus() {
    return {
      autoScout: this.getMergedSettings().autoScout,
      isRunningCycle: this.isRunningCycle,
      cycleCount: this.cycleCount,
      lastRunTimestamp: this.lastRunTimestamp,
      nextRunTimestamp: this.nextRunTimestamp,
      totalFoundLifetime: this.totalFoundLifetime,
      totalQueuedLifetime: this.totalQueuedLifetime,
      totalDownloadedLifetime: this.totalDownloadedLifetime,
      logs: [...this.logs]
    };
  }
}

module.exports = { ScoutScheduler };
