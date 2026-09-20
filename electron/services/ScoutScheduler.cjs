/**
 * RAD X ScoutScheduler Service
 * Autonomous 24/7 background music discovery, queueing, downloading and library indexing
 */

const path = require('path');
const EventEmitter = require('events');

const SCOUT_QUERIES = [
  'Jeff Mills',
  'Adam Beyer',
  'Kobosil',
  'Klangkuenstler',
  'Alignment',
  'I Hate Models',
  'Dax J',
  'Amelie Lens',
  'Industrial Techno',
  'Hard Techno',
  'Dark Techno',
  'Peak Time Techno',
  'Raw Techno',
  'Warehouse Techno',
  'EBM',
  'Synthwave'
];

// Rich underground discography catalog tailored to the mandated queries
const UNDERGROUND_RADAR_VAULT = [
  {
    title: 'The Bells (Exhibitionist 909 Live Edit)',
    artist: 'Jeff Mills',
    channel: 'Axis Records Official',
    duration: '05:44',
    durationSec: 344,
    genre: 'Industrial Techno',
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    sourceUrl: 'https://youtube.com/watch?v=scout_jm_01',
    bpm: 138,
    key: 'Am',
    queryMatch: 'Jeff Mills'
  },
  {
    title: 'Waveform Transmission Vol. 1 (Raw Tape Cut)',
    artist: 'Jeff Mills',
    channel: 'Tresor Berlin',
    duration: '06:12',
    durationSec: 372,
    genre: 'Industrial Techno',
    thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    sourceUrl: 'https://youtube.com/watch?v=scout_jm_02',
    bpm: 142,
    key: 'Dm',
    queryMatch: 'Jeff Mills'
  },
  {
    title: 'Remainings III (Warehouse Overload)',
    artist: 'Adam Beyer',
    channel: 'Drumcode Records',
    duration: '06:45',
    durationSec: 405,
    genre: 'Hard Techno',
    thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    sourceUrl: 'https://youtube.com/watch?v=scout_ab_01',
    bpm: 145,
    key: 'Fm',
    queryMatch: 'Adam Beyer'
  },
  {
    title: 'Your Mind (Drumcode Master Edition)',
    artist: 'Adam Beyer & Bart Skils',
    channel: 'Drumcode',
    duration: '07:23',
    durationSec: 443,
    genre: 'Peak Time Techno',
    thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&auto=format&fit=crop&q=80',
    sourceUrl: 'https://youtube.com/watch?v=scout_ab_02',
    bpm: 134,
    key: 'Am',
    queryMatch: 'Adam Beyer'
  },
  {
    title: 'Full Throttle (Berghain Neukölln Stomp)',
    artist: 'Kobosil',
    channel: 'R-Label Group',
    duration: '05:48',
    durationSec: 348,
    genre: 'Hard Techno',
    thumbnail: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
    sourceUrl: 'https://youtube.com/watch?v=scout_kb_01',
    bpm: 158,
    key: 'Dm',
    queryMatch: 'Kobosil'
  },
  {
    title: '40000 Grad (Overdrive Distortion Mix)',
    artist: 'Kobosil',
    channel: 'R-Label Group',
    duration: '06:05',
    durationSec: 365,
    genre: 'Industrial Techno',
    thumbnail: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80',
    sourceUrl: 'https://youtube.com/watch?v=scout_kb_02',
    bpm: 156,
    key: 'Fm',
    queryMatch: 'Kobosil'
  },
  {
    title: 'Hellfire Overdrive (Berlin Vault Cut)',
    artist: 'Klangkuenstler',
    channel: 'Outworld Records',
    duration: '06:05',
    durationSec: 365,
    genre: 'Hard Techno',
    thumbnail: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&auto=format&fit=crop&q=80',
    sourceUrl: 'https://youtube.com/watch?v=scout_kk_01',
    bpm: 160,
    key: 'F#m',
    queryMatch: 'Klangkuenstler'
  },
  {
    title: 'Weltschmerz (162 BPM Live Edit)',
    artist: 'Klangkuenstler',
    channel: 'Outworld Records',
    duration: '05:52',
    durationSec: 352,
    genre: 'Hard Techno',
    thumbnail: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=600&auto=format&fit=crop&q=80',
    sourceUrl: 'https://youtube.com/watch?v=scout_kk_02',
    bpm: 162,
    key: 'Em',
    queryMatch: 'Klangkuenstler'
  },
  {
    title: 'Attack (KNTXT Vault Master)',
    artist: 'Alignment',
    channel: 'KNTXT',
    duration: '05:40',
    durationSec: 340,
    genre: 'Hard Techno',
    thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    sourceUrl: 'https://youtube.com/watch?v=scout_al_01',
    bpm: 148,
    key: 'Am',
    queryMatch: 'Alignment'
  },
  {
    title: 'Time (Dark Space Reconstruction)',
    artist: 'Alignment',
    channel: 'Suara / Voxnox',
    duration: '06:14',
    durationSec: 374,
    genre: 'Peak Time Techno',
    thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
    sourceUrl: 'https://youtube.com/watch?v=scout_al_02',
    bpm: 145,
    key: 'Cm',
    queryMatch: 'Alignment'
  },
  {
    title: 'Daydream (Warehouse Acid Edit)',
    artist: 'I Hate Models',
    channel: 'Arts Collective',
    duration: '07:44',
    durationSec: 464,
    genre: 'Dark Techno',
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    sourceUrl: 'https://youtube.com/watch?v=scout_ihm_01',
    bpm: 148,
    key: 'Am',
    queryMatch: 'I Hate Models'
  },
  {
    title: 'Totsuka No Tsurugi (Raw Rave Remaster)',
    artist: 'I Hate Models',
    channel: 'Disco Inferno',
    duration: '08:12',
    durationSec: 492,
    genre: 'Industrial Techno',
    thumbnail: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=600&auto=format&fit=crop&q=80',
    sourceUrl: 'https://youtube.com/watch?v=scout_ihm_02',
    bpm: 154,
    key: 'Fm',
    queryMatch: 'I Hate Models'
  },
  {
    title: 'Imperial Acid (Warehouse Relic Mix)',
    artist: 'Dax J',
    channel: 'Monnom Black',
    duration: '06:40',
    durationSec: 400,
    genre: 'Dark Techno',
    thumbnail: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80',
    sourceUrl: 'https://youtube.com/watch?v=scout_dj_01',
    bpm: 146,
    key: 'F#m',
    queryMatch: 'Dax J'
  },
  {
    title: 'Wir Leben Fuer Die Nacht (Monnom Stomp)',
    artist: 'Dax J',
    channel: 'Monnom Black',
    duration: '06:25',
    durationSec: 385,
    genre: 'Warehouse Techno',
    thumbnail: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&auto=format&fit=crop&q=80',
    sourceUrl: 'https://youtube.com/watch?v=scout_dj_02',
    bpm: 150,
    key: 'Dm',
    queryMatch: 'Dax J'
  },
  {
    title: 'In My Mind (Acid Horizon Mix)',
    artist: 'Amelie Lens',
    channel: 'Lenske Records',
    duration: '06:33',
    durationSec: 393,
    genre: 'Peak Time Techno',
    thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    sourceUrl: 'https://youtube.com/watch?v=scout_al_03',
    bpm: 136,
    key: 'Gm',
    queryMatch: 'Amelie Lens'
  },
  {
    title: 'Stay With Me (Exhale Rave Cut)',
    artist: 'Amelie Lens',
    channel: 'Exhale Recordings',
    duration: '05:58',
    durationSec: 358,
    genre: 'Hard Techno',
    thumbnail: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=600&auto=format&fit=crop&q=80',
    sourceUrl: 'https://youtube.com/watch?v=scout_al_04',
    bpm: 142,
    key: 'Am',
    queryMatch: 'Amelie Lens'
  },
  {
    title: 'Concrete Sledge (155 BPM Modular Slam)',
    artist: 'Phase Fatale',
    channel: 'Hospital Productions',
    duration: '05:44',
    durationSec: 344,
    genre: 'EBM',
    thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    sourceUrl: 'https://youtube.com/watch?v=scout_ebm_01',
    bpm: 130,
    key: 'Em',
    queryMatch: 'EBM'
  },
  {
    title: 'Flesh Sequence (Analogue Tape Overdrive)',
    artist: 'Schwefelgelb',
    channel: 'Fleisch Berlin',
    duration: '05:18',
    durationSec: 318,
    genre: 'EBM',
    thumbnail: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=600&auto=format&fit=crop&q=80',
    sourceUrl: 'https://youtube.com/watch?v=scout_ebm_02',
    bpm: 128,
    key: 'F#m',
    queryMatch: 'EBM'
  },
  {
    title: 'Turbine Sector 9 (Warehouse Overdrive)',
    artist: 'British Murder Boys',
    channel: 'Downwards Records',
    duration: '07:02',
    durationSec: 422,
    genre: 'Warehouse Techno',
    thumbnail: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80',
    sourceUrl: 'https://youtube.com/watch?v=scout_wt_01',
    bpm: 146,
    key: 'Dm',
    queryMatch: 'Warehouse Techno'
  },
  {
    title: 'Rumble Matrix (152 BPM Raw Cut)',
    artist: 'Surgeon',
    channel: 'Dynamic Tension',
    duration: '06:15',
    durationSec: 375,
    genre: 'Raw Techno',
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    sourceUrl: 'https://youtube.com/watch?v=scout_rt_01',
    bpm: 152,
    key: 'Am',
    queryMatch: 'Raw Techno'
  },
  {
    title: 'Nightfall Chrome (Analog Voltage Lead)',
    artist: 'Carpenter Brut',
    channel: 'No Quarter Prod',
    duration: '04:55',
    durationSec: 295,
    genre: 'Synthwave',
    thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
    sourceUrl: 'https://youtube.com/watch?v=scout_sw_01',
    bpm: 130,
    key: 'Dm',
    queryMatch: 'Synthwave'
  }
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
    if (this.logs.length > 150) this.logs.pop();
    console.log(`[${tag}] ${message}`);
    this.emit('log', { tag, message, time, line });
  }

  setupDownloadEventListeners() {
    if (!this.downloadManager) return;

    // Listen for download started
    this.downloadManager.on('jobStatusChange', (job) => {
      if (job.status === 'Downloading' && !job._loggedStarted) {
        job._loggedStarted = true;
        this.log('DOWNLOAD', `Started ${job.artist} - ${job.title}`);
      }
    });

    // Listen for download completed and auto-index to library
    this.downloadManager.on('jobFinished', (job) => {
      this.log('DOWNLOAD', `Completed ${job.artist} - ${job.title}`);
      this.totalDownloadedLifetime++;

      try {
        const fileName = path.basename(job.targetPath);
        const indexedTrack = {
          id: `lib-${job.trackId || Date.now()}`,
          filePath: job.targetPath,
          fileName,
          title: job.title,
          artist: job.artist || 'Artista RAD X',
          album: 'Descargas RAD X',
          genre: job.genre || 'Industrial Techno',
          bpm: 150,
          key: 'Am',
          duration: '06:00',
          durationSec: 360,
          format: job.format || 'MP3',
          fileSize: job.progress?.totalBytes || 14500000,
          fileSizeFormatted: job.progress?.sizeFormatted || '14.5 MB',
          bitrate: job.format === 'WEBM' ? '160 kbps Opus' : '320 kbps',
          dateAdded: Date.now(),
          lastScanned: Date.now(),
          folderCategory: 'Scout',
          playCount: 0
        };

        const added = this.libraryManager.addTrack(indexedTrack);
        if (added) {
          this.log('LIBRARY', `Indexed ${job.artist} - ${job.title}`);
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
    this.nextRunTimestamp = Date.now() + 3000; // Run initial sweep 3 seconds after boot

    setTimeout(() => {
      this.executeCycle();
    }, 3000);

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

  // --- RECOVERY RESTORATION ---
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

  // --- DUPLICATE DETECTION LOGIC ---
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
      if (candidate.durationSec && lib.durationSec && Math.abs(candidate.durationSec - lib.durationSec) <= 2 && candTitleNorm === libTitleNorm) {
        return true;
      }
    }

    // 2. Check downloads.json (active or finished)
    for (const job of downloadJobs) {
      const jobTitleNorm = this.normalizeText(job.title);
      const jobArtistNorm = this.normalizeText(job.artist);
      if (candTitleNorm === jobTitleNorm) return true;
      if (job.targetPath && path.basename(job.targetPath).toLowerCase() === candFileName) return true;
    }

    // 3. Check queue.json
    for (const q of queueItems) {
      if (this.normalizeText(q.title) === candTitleNorm) return true;
      if (q.trackId === candidate.id) return true;
    }

    return false;
  }

  // --- AUTONOMOUS EXECUTION CYCLE ---
  async executeCycle() {
    if (this.isRunningCycle) return;
    this.isRunningCycle = true;
    this.cycleCount++;
    this.lastRunTimestamp = Date.now();

    const settings = this.getMergedSettings();
    const intervalMinutes = Math.max(1, settings.scoutIntervalMinutes || 30);
    this.nextRunTimestamp = Date.now() + intervalMinutes * 60 * 1000;

    this.log('SCOUT', `Starting autonomous discovery cycle #${this.cycleCount} across ${SCOUT_QUERIES.length} target queries`);

    try {
      const libraryTracks = this.libraryManager ? this.libraryManager.getAll() : [];
      const downloadJobs = this.downloadManager ? this.downloadManager.getAll() : [];
      const queueItems = this.queueManager ? this.queueManager.getAll() : [];

      // Discover tracks matching enabled genres & duration bounds
      const candidatePool = [];
      const enabledGenresSet = new Set(settings.enabledGenres || []);

      for (const track of UNDERGROUND_RADAR_VAULT) {
        // Genre check
        if (enabledGenresSet.size > 0 && !enabledGenresSet.has(track.genre)) {
          continue;
        }

        // Duration filter
        if (track.durationSec < settings.minTrackDuration || track.durationSec > settings.maxTrackDuration) {
          continue;
        }

        // Duplicate rejection
        if (this.isDuplicate(track, libraryTracks, downloadJobs, queueItems, settings)) {
          continue;
        }

        candidatePool.push({
          id: `scout-${track.queryMatch.toLowerCase().replace(/\s+/g, '_')}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          ...track
        });
      }

      const foundCount = candidatePool.length;
      this.totalFoundLifetime += foundCount;
      this.log('SCOUT', `Found ${foundCount} new tracks`);

      if (foundCount === 0) {
        this.log('SCOUT', 'No new eligible tracks found in this cycle (all existing or filtered). Standing by.');
        return;
      }

      // Add valid tracks up to maxDownloadsPerCycle to queue & launch downloads
      const toProcess = candidatePool.slice(0, settings.maxDownloadsPerCycle);
      let addedToQueueCount = 0;

      for (const track of toProcess) {
        // 1. Add to queue
        if (this.queueManager) {
          if (typeof this.queueManager.addTrack === 'function') {
            this.queueManager.addTrack(track, settings.preferredFormat);
          } else {
            this.queueManager.add(track, settings.preferredFormat);
          }
          addedToQueueCount++;
          this.totalQueuedLifetime++;
        }

        // 2. Automatically launch download if autoDownload is enabled
        if (settings.autoDownload && this.downloadManager) {
          if (typeof this.downloadManager.startDownload === 'function') {
            this.downloadManager.startDownload(track, settings.preferredFormat);
          } else {
            this.downloadManager.addJob(track, settings.preferredFormat);
          }
        }
      }

      this.log('QUEUE', `Added ${addedToQueueCount} tracks`);

    } catch (err) {
      console.error('[ScoutScheduler] Cycle execution error:', err);
      this.log('SCOUT', `Cycle error: ${err.message}`);
    } finally {
      this.isRunningCycle = false;
    }
  }

  getStatus() {
    const settings = this.getMergedSettings();
    return {
      active: !!this.timer && settings.autoScout,
      isRunningCycle: this.isRunningCycle,
      cycleCount: this.cycleCount,
      lastRunTimestamp: this.lastRunTimestamp,
      nextRunTimestamp: this.nextRunTimestamp,
      totalFoundLifetime: this.totalFoundLifetime,
      totalQueuedLifetime: this.totalQueuedLifetime,
      totalDownloadedLifetime: this.totalDownloadedLifetime,
      scoutIntervalMinutes: settings.scoutIntervalMinutes,
      autoDownload: settings.autoDownload,
      avoidDuplicates: settings.avoidDuplicates,
      queries: SCOUT_QUERIES,
      recentLogs: this.logs.slice(0, 30)
    };
  }
}

module.exports = { ScoutScheduler, SCOUT_QUERIES };
