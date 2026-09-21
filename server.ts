/**
 * RAD X High-Performance Full-Stack & Desktop Bridge Server
 * Provides REST endpoints, Web Audio stream bridges, and Gemini AI Sonic Intelligence
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { createRequire } from 'module';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const require = createRequire(import.meta.url);
const {
  resolveYtDlpPath,
  searchMedia,
  inspectAudioFile,
  parseProgressLine,
  formatBytes
} = require('./electron/utils/ytdlp.cjs');

const projectRoot = process.cwd();
const dataDir = path.join(projectRoot, 'data');
const downloadsDir = path.join(dataDir, 'downloads');

if (!fs.existsSync(dataDir)) {
  try { fs.mkdirSync(dataDir, { recursive: true }); } catch (e) {}
}
if (!fs.existsSync(downloadsDir)) {
  try { fs.mkdirSync(downloadsDir, { recursive: true }); } catch (e) {}
}

function loadJson<T>(filename: string, fallback: T): T {
  const filePath = path.join(dataDir, filename);
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
      console.warn(`[Server] Corrupted ${filename}, using fallback:`, e);
    }
  }
  saveJson(filename, fallback);
  return fallback;
}

function saveJson(filename: string, data: any): void {
  try {
    const filePath = path.join(dataDir, filename);
    const tmp = `${filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmp, filePath);
  } catch (e) {
    console.error(`[Server] Error saving ${filename}:`, e);
  }
}

const app = express();
const PORT = 3000;

app.use(express.json());

// Persistent data stores with real data/ JSON integration (no fake mocks)
const defaultTracks: any[] = [];
const defaultScout: any[] = [];

const defaultSettings = {
  musicDirectory: downloadsDir,
  scoutDirectory: path.join(downloadsDir, 'Scout'),
  autoScanOnStartup: true,
  maxConcurrentDownloads: 3,
  preferredFormat: 'MP3',
  audioBitrate: '320kbps',
  enableDailyScout: true,
  scoutIntervalHours: 24,
  crossfadeDurationSec: 4,
  highThinkingEnabled: true,
  themeMode: 'cyberpunk-dark',
  autoScout: true,
  scoutIntervalMinutes: 30,
  autoDownload: true,
  avoidDuplicates: true,
  maxDownloadsPerCycle: 20,
  minTrackDuration: 120,
  maxTrackDuration: 1200,
  enabledGenres: [
    'Hard Techno',
    'Industrial Techno',
    'Dark Techno',
    'Peak Time Techno',
    'EBM',
    'Synthwave'
  ]
};

let queueStore: any[] = loadJson('queue.json', []);
let downloadStore: any[] = loadJson('downloads.json', []);
let libraryStore: any[] = loadJson('tracks.json', defaultTracks);
let scoutStore: any[] = loadJson('scout.json', defaultScout);
let musicFoldersStore: any[] = loadJson('musicFolders.json', [
  { id: 'fld-main', path: downloadsDir, category: 'Main', enabled: true },
  { id: 'fld-scout', path: path.join(downloadsDir, 'Scout'), category: 'Scout', enabled: true }
]);
let settingsStore = { ...defaultSettings, ...loadJson('settings.json', defaultSettings) };

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'RAD X Engine', timestamp: Date.now() });
});

app.get('/api/library', (req, res) => {
  res.json(libraryStore);
});

app.post('/api/library/scan', async (req, res) => {
  let newFound = 0;
  const existingPaths = new Set(libraryStore.map(t => (t.filePath || '').toLowerCase()));

  for (const fld of musicFoldersStore) {
    if (!fld.enabled || !fs.existsSync(fld.path)) continue;
    try {
      const files = fs.readdirSync(fld.path);
      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (!['.mp3', '.flac', '.wav', '.webm', '.m4a', '.opus'].includes(ext)) continue;

        const fullPath = path.join(fld.path, file);
        if (!existingPaths.has(fullPath.toLowerCase())) {
          const stats = fs.statSync(fullPath);
          const rawName = path.basename(file, ext);
          const parts = rawName.split(' - ');
          const artist = parts.length > 1 ? parts[0].trim() : 'Underground Artist';
          const title = parts.length > 1 ? parts.slice(1).join(' - ').trim() : rawName;
          const audioMeta = await inspectAudioFile(fullPath);

          libraryStore.unshift({
            id: `lib-scan-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            filePath: fullPath,
            fileName: file,
            title,
            artist,
            album: fld.category === 'Scout' ? 'RAD X Scout' : 'Local Library',
            genre: null,
            bpm: null,
            key: null,
            duration: audioMeta.duration || null,
            durationSec: audioMeta.durationSec || null,
            format: audioMeta.format || ext.replace('.', '').toUpperCase(),
            channels: audioMeta.channels || null,
            codec: audioMeta.codec || null,
            fileSize: stats.size,
            fileSizeFormatted: formatBytes(stats.size),
            bitrate: audioMeta.bitrate || null,
            dateAdded: Date.now(),
            lastScanned: Date.now(),
            folderCategory: fld.category || 'Main',
            playCount: 0
          });
          existingPaths.add(fullPath.toLowerCase());
          newFound++;
        }
      }
    } catch (e) {
      console.warn(`[Library Scan] Warning reading ${fld.path}:`, e);
    }
  }

  saveJson('tracks.json', libraryStore);
  res.json({ success: true, newTracksCount: newFound, totalCount: libraryStore.length });
});

app.delete('/api/library/:id', (req, res) => {
  const { id } = req.params;
  libraryStore = libraryStore.filter(t => t.id !== id);
  saveJson('tracks.json', libraryStore);
  res.json({ success: true });
});

app.get('/api/queue', (req, res) => {
  res.json(queueStore);
});

app.post('/api/queue', (req, res) => {
  const { track, format = 'MP3' } = req.body;
  if (!track) return res.status(400).json({ error: 'Track required' });

  const existing = queueStore.find(q => q.trackId === track.id);
  if (existing) return res.json({ success: false, reason: 'Already in queue' });

  const item = {
    id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    trackId: track.id,
    title: track.title,
    artist: track.artist,
    channel: track.channel,
    duration: track.duration,
    genre: track.genre,
    thumbnail: track.thumbnail,
    format,
    addedAt: Date.now(),
    priority: queueStore.length + 1
  };
  queueStore.push(item);
  saveJson('queue.json', queueStore);
  res.json({ success: true, item });
});

app.delete('/api/queue/:id', (req, res) => {
  queueStore = queueStore.filter(q => q.id !== req.params.id && q.trackId !== req.params.id);
  saveJson('queue.json', queueStore);
  res.json({ success: true });
});

// --- HUNTER API (Real yt-dlp discovery) ---
app.get('/api/hunter', async (req, res) => {
  const q = String(req.query.q || req.query.searchQuery || '').trim();
  const genre = String(req.query.genre || 'Industrial Techno');

  console.log(`[HUNTER] [SERVER] Real search request: genre="${genre}", q="${q}"`);

  try {
    const rawResults = await searchMedia({
      query: q,
      genre,
      limit: 15
    });

    const results = rawResults.map((track: any) => {
      const isDownloaded = downloadStore.some(j => j.trackId === track.id && j.status === 'Finished') ||
                           libraryStore.some(t => t.title && t.title.toLowerCase() === track.title.toLowerCase());
      const isQueued = queueStore.some(item => item.trackId === track.id) ||
                       downloadStore.some(j => j.trackId === track.id && (j.status === 'Downloading' || j.status === 'Queued'));

      return {
        ...track,
        isDownloaded,
        isQueued
      };
    });

    console.log(`[HUNTER] [SERVER] Returning ${results.length} real audio tracks`);
    res.json({ success: true, results });
  } catch (err: any) {
    console.error('[HUNTER] [SERVER] Search error:', err);
    res.json({ success: true, results: [] });
  }
});

// --- AUTONOMOUS SCOUT LOGS & SCHEDULER INFRASTRUCTURE ---
const serverScoutLogs: { tag: string; message: string; time: string; line: string }[] = [];

function logAutonomous(tag: string, message: string) {
  const time = new Date().toISOString().substring(11, 19);
  const line = `[${time}] [${tag}] ${message}`;
  serverScoutLogs.unshift({ tag, message, time, line });
  if (serverScoutLogs.length > 200) serverScoutLogs.pop();
  console.log(`[${tag}] ${message}`);
}

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

// --- REAL DOWNLOAD WORKER & CONTROLLER (Powered by yt-dlp) ---
const activeDownloadProcesses = new Map<string, any>();

function startDownloadWorker(jobId: string) {
  if (activeDownloadProcesses.has(jobId)) {
    try { activeDownloadProcesses.get(jobId).kill('SIGTERM'); } catch {}
    activeDownloadProcesses.delete(jobId);
  }

  const job = downloadStore.find(j => j.id === jobId);
  if (!job || job.status !== 'Downloading') return;

  logAutonomous('DOWNLOAD', `Started real audio download: ${job.artist} - ${job.title}`);

  const ytdlpBin = resolveYtDlpPath((settingsStore as any).ytdlpPath);
  console.log(`[YT-DLP] [SERVER] Spawning real download: ${job.sourceUrl || job.title} using ${ytdlpBin}`);

  const targetDir = path.dirname(job.targetPath);
  if (!fs.existsSync(targetDir)) {
    try { fs.mkdirSync(targetDir, { recursive: true }); } catch {}
  }

  const fmt = (job.format || 'MP3').toUpperCase();
  const audioFormat = fmt === 'WEBM' ? 'opus' : (fmt === 'FLAC' ? 'flac' : (fmt === 'WAV' ? 'wav' : 'mp3'));
  const baseOutputPattern = job.targetPath.replace(/\.[^/.]+$/, '') + '.%(ext)s';

  const args = [
    '-x',
    '--audio-format', audioFormat,
    '--audio-quality', '0',
    '--newline',
    '--no-playlist',
    '--no-check-certificates',
    '-o', baseOutputPattern,
    job.sourceUrl
  ];

  const executedCommand = `${ytdlpBin} ${args.join(' ')}`;
  job.executedCommand = executedCommand;

  let child: any;
  try {
    child = spawn(ytdlpBin, args);
  } catch (spawnErr: any) {
    job.status = 'Failed';
    job.exitCode = -1;
    job.fullStderr = spawnErr.stack || spawnErr.message;
    job.error = `Failed to spawn yt-dlp: ${spawnErr.message}`;
    saveJson('downloads.json', downloadStore);
    return;
  }

  activeDownloadProcesses.set(jobId, child);
  let stderrBuffer = '';

  child.stdout.on('data', (chunk: any) => {
    const lines = chunk.toString().split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      if (line.includes('[download]') && line.includes('%')) {
        const parsed = parseProgressLine(line);
        if (parsed && parsed.percentage !== null) {
          job.progress.percentage = parsed.percentage;
          if (parsed.speed) job.progress.speed = parsed.speed;
          if (parsed.eta) job.progress.eta = parsed.eta;
          if (parsed.sizeFormatted) job.progress.sizeFormatted = parsed.sizeFormatted;
          saveJson('downloads.json', downloadStore);
        }
      } else if (line.includes('[ExtractAudio]') || line.includes('[Fixup')) {
        job.progress.speed = 'Extracting audio...';
        job.progress.eta = 'Converting';
        saveJson('downloads.json', downloadStore);
      } else if (line.includes('Destination:')) {
        const match = line.match(/Destination:\s*(.+)$/i);
        if (match && match[1]) {
          const detectedPath = match[1].trim();
          if (fs.existsSync(detectedPath)) {
            job.targetPath = detectedPath;
          }
        }
      }
    }
  });

  child.stderr.on('data', (chunk: any) => {
    stderrBuffer += chunk.toString();
    if (stderrBuffer.length > 5000) stderrBuffer = stderrBuffer.slice(-5000);
  });

  child.on('close', async (code: number) => {
    activeDownloadProcesses.delete(jobId);
    job.exitCode = code;
    job.fullStderr = stderrBuffer.trim();

    if (code === 0) {
      let finalPath = job.targetPath;
      if (!fs.existsSync(finalPath)) {
        const dir = path.dirname(job.targetPath);
        const baseName = path.basename(job.targetPath, path.extname(job.targetPath));
        for (const ext of [audioFormat, 'mp3', 'opus', 'm4a', 'flac', 'wav']) {
          const cand = path.join(dir, `${baseName}.${ext}`);
          if (fs.existsSync(cand)) {
            finalPath = cand;
            job.targetPath = cand;
            break;
          }
        }
      }

      if (fs.existsSync(finalPath)) {
        const stats = fs.statSync(finalPath);
        job.status = 'Finished';
        job.finishedAt = Date.now();
        job.progress.percentage = 100;
        job.progress.totalBytes = stats.size;
        job.progress.downloadedBytes = stats.size;
        job.progress.sizeFormatted = formatBytes(stats.size);
        job.progress.speed = '0.0 MB/s';
        job.progress.eta = '00:00';
        job.targetPath = finalPath;

        logAutonomous('DOWNLOAD', `Completed download: ${job.artist} - ${job.title} (${formatBytes(stats.size)})`);

        const audioMeta = await inspectAudioFile(finalPath);
        job.actualDuration = audioMeta?.duration || null;
        job.actualDurationSec = audioMeta?.durationSec || null;
        job.actualBitrate = audioMeta?.bitrate || null;
        job.actualChannels = audioMeta?.channels || null;
        job.actualFormat = audioMeta?.format || null;
        job.actualCodec = audioMeta?.codec || null;

        const isAlreadyInLib = libraryStore.some(
          t => t.filePath && t.filePath.toLowerCase() === finalPath.toLowerCase()
        );
        if (!isAlreadyInLib) {
          libraryStore.unshift({
            id: `lib-${job.trackId || Date.now()}`,
            filePath: finalPath,
            fileName: path.basename(finalPath),
            title: job.title,
            artist: job.artist || null,
            album: finalPath.toLowerCase().includes('scout') ? 'RAD X Scout' : 'Local Library',
            genre: job.genre || null,
            bpm: null,
            key: null,
            duration: audioMeta?.duration || job.duration || null,
            durationSec: audioMeta?.durationSec || job.durationSec || null,
            format: audioMeta?.format || job.format || null,
            channels: audioMeta?.channels || null,
            codec: audioMeta?.codec || null,
            fileSize: stats.size,
            fileSizeFormatted: formatBytes(stats.size),
            bitrate: audioMeta?.bitrate || null,
            dateAdded: Date.now(),
            lastScanned: Date.now(),
            folderCategory: finalPath.toLowerCase().includes('scout') ? 'Scout' : 'Main',
            playCount: 0
          });
          saveJson('tracks.json', libraryStore);
          logAutonomous('LIBRARY', `Indexed real audio track into library: ${job.artist} - ${job.title}`);
          totalScoutDownloaded++;
        }
        saveJson('downloads.json', downloadStore);
      } else {
        job.status = 'Failed';
        job.error = `Download process finished with code 0, but no audio file found at: ${job.targetPath}`;
        saveJson('downloads.json', downloadStore);
      }
    } else {
      job.status = 'Failed';
      let cleanErr = stderrBuffer.trim().split('\n').pop() || `Process exited with code ${code}`;
      if (cleanErr.includes('Sign in to confirm')) {
        cleanErr = 'YouTube requires sign-in verification for this IP. Try another track.';
      }
      job.error = `[Exit Code ${code}] ${cleanErr}`;
      job.progress.speed = '0.0 MB/s';
      console.error(`[YT-DLP ERROR] Download failed for job ${job.id}:`);
      console.error(`  Command: ${executedCommand}`);
      console.error(`  Exit code: ${code}`);
      console.error(`  Stderr: ${stderrBuffer.trim()}`);
      saveJson('downloads.json', downloadStore);
      logAutonomous('DOWNLOAD', `Download failed: ${job.title} (${job.error})`);
    }
  });
}

// Duplicate normalization & check
function normalizeString(text: string) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[\(\)\[\]\{\}\-_,.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isDuplicateTrack(candidate: any) {
  if (settingsStore.avoidDuplicates === false) return false;

  const candTitleNorm = normalizeString(candidate.title);
  const candArtistNorm = normalizeString(candidate.artist);
  const candFileName = `${candidate.title.replace(/[\\/:*?"<>|]/g, '_')}.${(settingsStore.preferredFormat || 'MP3').toLowerCase()}`.toLowerCase();

  // 1. Compare title, artist, duration, fileName in library (tracks.json)
  for (const lib of libraryStore) {
    const libTitleNorm = normalizeString(lib.title);
    const libArtistNorm = normalizeString(lib.artist);
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

  // 2. Compare in downloads.json
  for (const job of downloadStore) {
    const jobTitleNorm = normalizeString(job.title);
    if (candTitleNorm === jobTitleNorm) return true;
    if (job.targetPath && path.basename(job.targetPath).toLowerCase() === candFileName) return true;
  }

  // 3. Compare in queue.json
  for (const q of queueStore) {
    if (normalizeString(q.title) === candTitleNorm) return true;
    if (q.trackId === candidate.id) return true;
  }

  return false;
}

// Autonomous scheduler runtime variables
let isScoutCycleRunning = false;
let scoutCycleCount = 0;
let lastScoutRun = 0;
let nextScoutRun = 0;
let totalScoutFound = 0;
let totalScoutQueued = 0;
let totalScoutDownloaded = 0;
let scoutIntervalTimer: NodeJS.Timeout | null = null;

async function runAutonomousScoutCycle() {
  if (isScoutCycleRunning) return;
  if (settingsStore.autoScout === false) {
    logAutonomous('SCOUT', 'AutoScout is currently disabled in settings.');
    return;
  }

  isScoutCycleRunning = true;
  scoutCycleCount++;
  lastScoutRun = Date.now();
  const intervalMinutes = Math.max(1, settingsStore.scoutIntervalMinutes || 30);
  nextScoutRun = Date.now() + intervalMinutes * 60 * 1000;

  logAutonomous('SCOUT', `Starting autonomous discovery cycle #${scoutCycleCount}`);

  try {
    const genres = settingsStore.enabledGenres && settingsStore.enabledGenres.length > 0
      ? settingsStore.enabledGenres
      : ['Industrial Techno', 'Hard Techno', 'Dark Techno', 'Raw Techno'];

    const targetGenre = genres[(scoutCycleCount - 1) % genres.length];
    logAutonomous('SCOUT', `Crawling network for underground theme: "${targetGenre}"`);

    const liveTracks = await searchMedia({
      query: `${targetGenre} underground club set`,
      genre: targetGenre,
      limit: 15
    });

    const minSec = settingsStore.minTrackDuration || 120;
    const maxSec = settingsStore.maxTrackDuration || 1200;
    const candidatePool = [];

    for (const track of liveTracks) {
      if (track.durationSec < minSec || track.durationSec > maxSec) continue;
      if (isDuplicateTrack(track)) continue;
      candidatePool.push(track);
    }

    const foundCount = candidatePool.length;
    totalScoutFound += foundCount;
    logAutonomous('SCOUT', `Discovered ${foundCount} new un-downloaded tracks`);

    if (foundCount === 0) {
      logAutonomous('SCOUT', 'No new eligible tracks found in this cycle. Standing by.');
      return;
    }

    const maxCycle = settingsStore.maxDownloadsPerCycle || 20;
    const toProcess = candidatePool.slice(0, maxCycle);
    let addedCount = 0;

    for (const track of toProcess) {
      // 1. Add to queue.json
      const queueItem = {
        id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        trackId: track.id,
        title: track.title,
        artist: track.artist,
        channel: track.channel,
        duration: track.duration,
        genre: track.genre,
        thumbnail: track.thumbnail,
        format: settingsStore.preferredFormat || 'MP3',
        addedAt: Date.now(),
        priority: queueStore.length + 1
      };
      queueStore.push(queueItem);
      addedCount++;
      totalScoutQueued++;
      logAutonomous('QUEUE', `Queued discovery: ${track.artist} - ${track.title}`);

      // 2. Automatically launch real download if autoDownload
      if (settingsStore.autoDownload !== false) {
        const ext = (settingsStore.preferredFormat || 'MP3').toLowerCase() === 'webm' ? 'webm' : 'mp3';
        const cleanTitle = (track.title || 'track').replace(/[\\/:*?"<>|]/g, '_');
        const cleanArtist = (track.artist || 'artist').replace(/[\\/:*?"<>|]/g, '_');
        const safeFileName = `${cleanArtist} - ${cleanTitle}.${ext}`;
        const scoutDir = path.join(downloadsDir, 'Scout');
        const targetPath = path.join(scoutDir, safeFileName);

        const newJob = {
          id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          trackId: track.id,
          title: track.title,
          artist: track.artist || null,
          channel: track.channel || null,
          thumbnail: track.thumbnail || null,
          genre: track.genre || null,
          format: settingsStore.preferredFormat || 'MP3',
          quality: (settingsStore.preferredFormat === 'FLAC' || settingsStore.preferredFormat === 'WAV') ? 'Lossless' : 'Standard',
          targetPath,
          status: 'Downloading',
          progress: {
            percentage: 0,
            speed: null,
            speedBytesPerSec: 0,
            eta: null,
            downloadedBytes: 0,
            totalBytes: null,
            sizeFormatted: null
          },
          queuedAt: Date.now(),
          sourceUrl: track.sourceUrl
        };

        downloadStore.unshift(newJob);
        saveJson('downloads.json', downloadStore);
        startDownloadWorker(newJob.id);
      }
    }

    saveJson('queue.json', queueStore);
    logAutonomous('QUEUE', `Added ${addedCount} tracks`);

  } catch (err: any) {
    console.error('[ScoutScheduler] Error in autonomous cycle:', err);
    logAutonomous('SCOUT', `Cycle error: ${err?.message || err}`);
  } finally {
    isScoutCycleRunning = false;
  }
}

// Boot recovery and scheduler setup
function initAutonomousScheduler() {
  logAutonomous('SCOUT', 'Scanning for interrupted downloads and pending queues to restore...');

  // 1. Restore pending queue
  if (queueStore.length > 0) {
    logAutonomous('QUEUE', `Restored ${queueStore.length} pending items in queue.`);
  }

  // 2. Restore incomplete downloads
  let resumed = 0;
  downloadStore.forEach(job => {
    if (job.status === 'Downloading') {
      resumed++;
      startDownloadWorker(job.id);
    }
  });
  if (resumed > 0) {
    logAutonomous('DOWNLOAD', `Restored and resumed ${resumed} incomplete downloads.`);
  }

  // 3. Start periodic timer
  const intervalMinutes = Math.max(1, settingsStore.scoutIntervalMinutes || 30);
  logAutonomous('SCOUT', `Autonomous 24/7 Discovery Engine activated. Next cycle scheduled in ${intervalMinutes} minutes.`);

  if (scoutIntervalTimer) clearInterval(scoutIntervalTimer);

  nextScoutRun = Date.now() + 3000;
  setTimeout(() => {
    runAutonomousScoutCycle();
  }, 3000);

  scoutIntervalTimer = setInterval(() => {
    runAutonomousScoutCycle();
  }, intervalMinutes * 60 * 1000);
}

setTimeout(() => {
  initAutonomousScheduler();
}, 800);

app.get('/api/downloads', (req, res) => {
  res.json(downloadStore);
});

app.post('/api/downloads', (req, res) => {
  const { track, format = 'MP3' } = req.body;
  if (!track) return res.status(400).json({ error: 'Track required' });

  const ext = format.toLowerCase() === 'webm' ? 'webm' : (format.toLowerCase() === 'flac' ? 'flac' : 'mp3');
  const cleanTitle = (track.title || 'track').replace(/[\\/:*?"<>|]/g, '_');
  const cleanArtist = (track.artist || 'artist').replace(/[\\/:*?"<>|]/g, '_');
  const safeFileName = `${cleanArtist} - ${cleanTitle}.${ext}`;
  const targetPath = path.join(downloadsDir, safeFileName);

  const newJob = {
    id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    trackId: track.id,
    title: track.title || 'Unknown Track',
    artist: track.artist || track.channel || null,
    channel: track.channel || null,
    thumbnail: track.thumbnail || null,
    genre: track.genre || null,
    bpm: track.bpm || null,
    key: track.key || null,
    duration: track.duration || null,
    durationSec: track.durationSec || null,
    format,
    quality: (format === 'FLAC' || format === 'WAV') ? 'Lossless' : 'Standard',
    targetPath,
    status: 'Downloading',
    progress: {
      percentage: 0,
      speed: null,
      speedBytesPerSec: 0,
      eta: null,
      downloadedBytes: 0,
      totalBytes: null,
      sizeFormatted: null
    },
    queuedAt: Date.now(),
    sourceUrl: track.sourceUrl || ''
  };

  downloadStore.unshift(newJob);
  saveJson('downloads.json', downloadStore);

  console.log(`[DOWNLOAD] [SERVER] Created new real download job: ${newJob.id} for "${newJob.title}"`);
  startDownloadWorker(newJob.id);

  res.json({ success: true, job: newJob });
});

app.post('/api/downloads/:id/pause', (req, res) => {
  const jobId = req.params.id;
  const job = downloadStore.find(j => j.id === jobId);
  if (job) {
    if (activeDownloadProcesses.has(jobId)) {
      try { activeDownloadProcesses.get(jobId).kill('SIGTERM'); } catch {}
      activeDownloadProcesses.delete(jobId);
    }
    job.status = 'Paused';
    job.progress.speed = '0.0 MB/s';
    saveJson('downloads.json', downloadStore);
    console.log(`[DOWNLOAD] [SERVER] Job paused: ${jobId}`);
  }
  res.json({ success: true, job });
});

app.post('/api/downloads/:id/resume', (req, res) => {
  const jobId = req.params.id;
  const job = downloadStore.find(j => j.id === jobId);
  if (job) {
    job.status = 'Downloading';
    job.progress.speed = 'Connecting...';
    saveJson('downloads.json', downloadStore);
    console.log(`[DOWNLOAD] [SERVER] Job resumed: ${jobId}`);
    startDownloadWorker(jobId);
  }
  res.json({ success: true, job });
});

app.post('/api/downloads/:id/retry', (req, res) => {
  const jobId = req.params.id;
  const job = downloadStore.find(j => j.id === jobId);
  if (job) {
    job.status = 'Downloading';
    job.progress.percentage = 0;
    job.progress.downloadedBytes = 0;
    job.progress.speed = 'Connecting...';
    job.progress.eta = '--:--';
    job.error = undefined;
    saveJson('downloads.json', downloadStore);
    console.log(`[DOWNLOAD] [SERVER] Job retry requested: ${jobId}`);
    startDownloadWorker(jobId);
    return res.json({ success: true, job });
  }
  res.status(404).json({ success: false, reason: 'Job no encontrado' });
});

app.delete('/api/downloads/:id', (req, res) => {
  const jobId = req.params.id;
  if (activeDownloadProcesses.has(jobId)) {
    try { activeDownloadProcesses.get(jobId).kill('SIGTERM'); } catch {}
    activeDownloadProcesses.delete(jobId);
  }
  downloadStore = downloadStore.filter(j => j.id !== jobId);
  saveJson('downloads.json', downloadStore);
  console.log(`[DOWNLOAD] [SERVER] Job deleted: ${jobId}`);
  res.json({ success: true });
});

app.post('/api/downloads/clear-finished', (req, res) => {
  downloadStore = downloadStore.filter(j => j.status !== 'Finished');
  saveJson('downloads.json', downloadStore);
  res.json({ success: true });
});

app.get('/api/scout', (req, res) => {
  res.json(scoutStore);
});

app.post('/api/scout/scan', async (req, res) => {
  try {
    const genre = settingsStore.enabledGenres?.[0] || 'Industrial Techno';
    const liveTracks = await searchMedia({ query: `${genre} underground club mix`, genre, limit: 5 });
    const newRadarTracks = liveTracks.map((t: any) => ({
      id: `sct-radar-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: t.title,
      artist: t.artist || null,
      channel: t.channel || null,
      duration: t.duration || null,
      durationSec: t.durationSec || null,
      genre: t.genre || null,
      thumbnail: t.thumbnail || null,
      sourceUrl: t.sourceUrl,
      bpm: null,
      key: null,
      trendScore: null,
      detectionDate: new Date().toISOString().split('T')[0],
      classificationNotes: t.source ? `Discovered via ${t.source} live crawler.` : null,
      isDuplicate: isDuplicateTrack(t),
      status: 'new'
    }));

    scoutStore = [...newRadarTracks, ...scoutStore];
    saveJson('scout.json', scoutStore);
    res.json({ success: true, newDiscoveriesCount: newRadarTracks.length, total: scoutStore.length });
  } catch (err: any) {
    res.json({ success: false, error: err.message });
  }
});

// Stream real audio file directly from disk
app.get('/api/audio/stream/:id', (req, res) => {
  const trackId = req.params.id;
  const track = libraryStore.find(t => t.id === trackId) ||
                downloadStore.find(d => (d.id === trackId || d.trackId === trackId) && d.status === 'Finished');
  const filePath = (track as any)?.filePath || (track as any)?.targetPath;
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Audio file not found on disk' });
  }
  res.sendFile(path.resolve(filePath));
});

// --- SCOUT SCHEDULER REST ENDPOINTS ---
app.get('/api/scout/scheduler/status', (req, res) => {
  res.json({
    active: !!scoutIntervalTimer && settingsStore.autoScout !== false,
    isRunningCycle: isScoutCycleRunning,
    cycleCount: scoutCycleCount,
    lastRunTimestamp: lastScoutRun,
    nextRunTimestamp: nextScoutRun,
    totalFoundLifetime: totalScoutFound,
    totalQueuedLifetime: totalScoutQueued,
    totalDownloadedLifetime: totalScoutDownloaded,
    scoutIntervalMinutes: settingsStore.scoutIntervalMinutes || 30,
    autoDownload: settingsStore.autoDownload !== false,
    avoidDuplicates: settingsStore.avoidDuplicates !== false,
    queries: SCOUT_QUERIES,
    recentLogs: serverScoutLogs.map(l => l.line).slice(0, 50)
  });
});

app.post('/api/scout/scheduler/trigger', async (req, res) => {
  logAutonomous('SCOUT', 'Manual trigger request received for autonomous discovery cycle.');
  await runAutonomousScoutCycle();
  res.json({
    success: true,
    status: {
      active: !!scoutIntervalTimer && settingsStore.autoScout !== false,
      isRunningCycle: isScoutCycleRunning,
      cycleCount: scoutCycleCount,
      lastRunTimestamp: lastScoutRun,
      nextRunTimestamp: nextScoutRun,
      totalFoundLifetime: totalScoutFound,
      totalQueuedLifetime: totalScoutQueued,
      totalDownloadedLifetime: totalScoutDownloaded,
      scoutIntervalMinutes: settingsStore.scoutIntervalMinutes || 30,
      autoDownload: settingsStore.autoDownload !== false,
      avoidDuplicates: settingsStore.avoidDuplicates !== false,
      queries: SCOUT_QUERIES,
      recentLogs: serverScoutLogs.map(l => l.line).slice(0, 50)
    }
  });
});

app.post('/api/scout/scheduler/toggle', (req, res) => {
  const { enabled } = req.body;
  settingsStore.autoScout = !!enabled;
  saveJson('settings.json', settingsStore);

  if (settingsStore.autoScout) {
    const intervalMinutes = Math.max(1, settingsStore.scoutIntervalMinutes || 30);
    if (scoutIntervalTimer) clearInterval(scoutIntervalTimer);
    scoutIntervalTimer = setInterval(() => {
      runAutonomousScoutCycle();
    }, intervalMinutes * 60 * 1000);
    logAutonomous('SCOUT', `Autonomous Scout Scheduler enabled. Interval: ${intervalMinutes} min.`);
  } else {
    if (scoutIntervalTimer) {
      clearInterval(scoutIntervalTimer);
      scoutIntervalTimer = null;
    }
    logAutonomous('SCOUT', 'Autonomous Scout Scheduler paused.');
  }

  res.json({ success: true, active: !!scoutIntervalTimer && settingsStore.autoScout });
});

app.get('/api/scout/scheduler/logs', (req, res) => {
  res.json({ logs: serverScoutLogs.slice(0, 100) });
});

app.get('/api/settings', (req, res) => {
  res.json(settingsStore);
});

app.post('/api/settings', (req, res) => {
  const prevInterval = settingsStore.scoutIntervalMinutes;
  const prevAutoScout = settingsStore.autoScout;

  settingsStore = { ...settingsStore, ...req.body };
  saveJson('settings.json', settingsStore);

  // If scheduler interval or active state changed, restart timer
  if (
    settingsStore.scoutIntervalMinutes !== prevInterval ||
    settingsStore.autoScout !== prevAutoScout
  ) {
    if (scoutIntervalTimer) {
      clearInterval(scoutIntervalTimer);
      scoutIntervalTimer = null;
    }
    if (settingsStore.autoScout !== false) {
      const intervalMinutes = Math.max(1, settingsStore.scoutIntervalMinutes || 30);
      scoutIntervalTimer = setInterval(() => {
        runAutonomousScoutCycle();
      }, intervalMinutes * 60 * 1000);
      logAutonomous('SCOUT', `Autonomous Scout Scheduler restarted with interval: ${intervalMinutes} min.`);
    }
  }

  res.json(settingsStore);
});

// Deep Neural Sonic Intelligence Powered by Gemini with Thinking Mode HIGH
app.post('/api/ai/neural-scout', async (req, res) => {
  try {
    const { track, query, mode = 'analysis' } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured in server environment.',
        fallback: true
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const systemPrompt = `You are RAD X Deep Neural Sound Architect & Resident Musicologist at the world's most elite underground industrial/techno institutions (Tresor, Berghain, Khidi, Bassiani).
Analyze tracks with clinical acoustic precision:
- Acoustic Archetype & Spectral Profile (Sub-kick harmonics, 303 distortion curves, 909 rimshot velocity, tape saturation)
- Energy rating (1-10) and peak rave compatibility
- Exact harmonic key transition targets (Camelot wheel compatible)
- Recommended blend points (Intro 32 bars, breakdown drop, outro transition)
- Underground micro-genre tagging and sonic lineage.

Provide your reasoning and detailed sonic breakdown in clear, authoritative technical language.`;

    const promptText = `Track: "${track?.title || 'Unknown'}" by ${track?.artist || 'Unknown'} (Genre: ${track?.genre || 'Techno'}, BPM: ${track?.bpm || 'Unknown'}, Key: ${track?.key || 'Unknown'}).
User Inquiry: ${query || 'Provide comprehensive underground sonic analysis, energy trajectory, and setlist mixing recommendations.'}`;

    // Mandated: use gemini-3.1-pro-preview with thinkingLevel set to ThinkingLevel.HIGH without maxOutputTokens
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: promptText,
      config: {
        systemInstruction: systemPrompt,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.HIGH
        }
      }
    });

    const outputText = response.text || 'No response generated.';

    res.json({
      success: true,
      model: 'gemini-3.1-pro-preview',
      thinkingMode: 'HIGH',
      analysis: outputText
    });
  } catch (err: any) {
    console.error('[RAD X Neural Scout Error]:', err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Neural analysis failed'
    });
  }
});

// Vite Development or Production Static Serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[RAD X] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
