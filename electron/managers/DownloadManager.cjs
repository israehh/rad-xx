/**
 * RAD X Download Manager - Real Audio Engine
 * Coordinates real audio downloads via yt-dlp, tracks live stdout progression,
 * extracts 320kbps MP3/Opus/FLAC audio streams, handles process lifecycle,
 * and maintains JSON persistence without simulated timers or fake payload buffers.
 */

const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { resolveYtDlpPath, parseProgressLine, inspectAudioFile, formatBytes } = require('../utils/ytdlp.cjs');

class DownloadManager extends EventEmitter {
  constructor(storageManager, settingsManager) {
    super();
    this.storage = storageManager;
    this.settings = settingsManager;
    this.STORAGE_KEY = 'downloads';
    this.jobs = new Map();
    this.activeProcesses = new Map();

    this.loadFromStorage();
    // Auto-resume queued or interrupted downloads after boot
    setTimeout(() => this.processQueue(), 500);
  }

  loadFromStorage() {
    const rawJobs = this.storage.get(this.STORAGE_KEY, []);
    rawJobs.forEach(job => {
      // If was downloading when app shut down or crashed, mark as Queued so it resumes
      if (job.status === 'Downloading') {
        job.status = 'Queued';
        job.progress.speed = '0.0 MB/s';
      }
      this.jobs.set(job.id, job);
    });
  }

  save() {
    const arr = Array.from(this.jobs.values());
    this.storage.set(this.STORAGE_KEY, arr);
  }

  getAll() {
    return Array.from(this.jobs.values()).sort((a, b) => b.queuedAt - a.queuedAt);
  }

  getJob(id) {
    return this.jobs.get(id);
  }

  isDownloaded(trackId) {
    for (const job of this.jobs.values()) {
      if (job.trackId === trackId && job.status === 'Finished') {
        return true;
      }
    }
    return false;
  }

  isDownloadingOrQueued(trackId) {
    for (const job of this.jobs.values()) {
      if (job.trackId === trackId && (job.status === 'Downloading' || job.status === 'Queued')) {
        return true;
      }
    }
    return false;
  }

  addJob(track, format = 'MP3') {
    if (!track) return { success: false, reason: 'Invalid track data' };

    // Check if already in downloads
    for (const job of this.jobs.values()) {
      if (job.trackId === track.id && (job.status === 'Downloading' || job.status === 'Queued')) {
        return { success: false, reason: 'Job already exists in queue', job };
      }
    }

    const settings = this.settings.getSettings();
    const targetDir = settings.musicDirectory || (process.platform === 'win32' ? 'C:\\Music' : path.join(process.cwd(), 'downloads'));

    const cleanTitle = sanitizeFileName(track.title || 'Unknown Track');
    const cleanArtist = sanitizeFileName(track.artist || track.channel || 'Underground Artist');
    const targetExtension = format.toLowerCase() === 'webm' ? 'webm' : (format.toLowerCase() === 'flac' ? 'flac' : (format.toLowerCase() === 'wav' ? 'wav' : 'mp3'));
    const safeFileName = `${cleanArtist} - ${cleanTitle}.${targetExtension}`;
    const targetPath = path.join(targetDir, safeFileName);

    const id = `job-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    const newJob = {
      id,
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
      status: 'Queued',
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

    this.jobs.set(id, newJob);
    this.save();
    this.emit('jobAdded', newJob);

    console.log(`[DOWNLOAD] [ELECTRON] Queued real download job ${newJob.id}: "${newJob.title}" -> ${targetPath}`);
    this.processQueue();
    return { success: true, job: newJob };
  }

  startDownload(track, format = 'MP3') {
    return this.addJob(track, format);
  }

  processQueue() {
    const settings = this.settings.getSettings();
    const maxConcurrent = settings.maxConcurrentDownloads || 3;
    const activeCount = this.activeProcesses.size;

    if (activeCount >= maxConcurrent) {
      return;
    }

    for (const job of this.jobs.values()) {
      if (job.status === 'Queued') {
        this.startJob(job.id);
        if (this.activeProcesses.size >= maxConcurrent) {
          break;
        }
      }
    }
  }

  startJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job || job.status === 'Downloading') return;

    const settings = this.settings.getSettings();
    const customYtdlp = settings.ytdlpPath || null;
    const ytdlpBin = resolveYtDlpPath(customYtdlp);

    console.log(`[DOWNLOAD] [ELECTRON] Starting REAL download job: "${job.title}" (${job.id})`);
    console.log(`[YT-DLP] Using binary: "${ytdlpBin}" for source: ${job.sourceUrl || job.title}`);

    job.status = 'Downloading';
    job.startedAt = Date.now();
    job.error = undefined;
    this.save();
    this.emit('jobStatusChange', job);

    const targetDir = path.dirname(job.targetPath);
    if (!fs.existsSync(targetDir)) {
      try {
        fs.mkdirSync(targetDir, { recursive: true });
      } catch (err) {
        console.warn(`[DOWNLOAD] Could not create target directory ${targetDir}:`, err.message);
      }
    }

    // Determine audio format flags
    const fmt = (job.format || 'MP3').toUpperCase();
    const audioFormat = fmt === 'WEBM' ? 'opus' : (fmt === 'FLAC' ? 'flac' : (fmt === 'WAV' ? 'wav' : 'mp3'));

    // Output template: write directly to output file base
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

    let child;
    try {
      child = spawn(ytdlpBin, args);
    } catch (spawnErr) {
      console.error(`[YT-DLP] Failed to spawn yt-dlp executable:`, spawnErr);
      job.status = 'Failed';
      job.exitCode = -1;
      job.fullStderr = spawnErr.stack || spawnErr.message;
      job.error = `Failed to launch yt-dlp (${ytdlpBin}): ${spawnErr.message}`;
      this.save();
      this.emit('jobStatusChange', job);
      this.processQueue();
      return;
    }

    this.activeProcesses.set(jobId, child);

    let stderrBuffer = '';
    let lastReportedPercentage = 0;

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      const lines = text.split('\n');

      for (const line of lines) {
        if (!line.trim()) continue;

        if (line.includes('[download]') && line.includes('%')) {
          const parsed = parseProgressLine(line);
          if (parsed && parsed.percentage !== null) {
            lastReportedPercentage = parsed.percentage;
            job.progress.percentage = parsed.percentage;

            if (parsed.speed) job.progress.speed = parsed.speed;
            if (parsed.eta) job.progress.eta = parsed.eta;
            if (parsed.sizeFormatted) job.progress.sizeFormatted = parsed.sizeFormatted;

            // Emit live progress updates
            this.emit('jobProgress', job);
          }
        } else if (line.includes('[ExtractAudio]') || line.includes('[Fixup')) {
          job.progress.speed = 'Extracting audio...';
          job.progress.eta = 'Converting';
          this.emit('jobProgress', job);
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

    child.stderr.on('data', (chunk) => {
      const errLine = chunk.toString();
      stderrBuffer += errLine;
      if (stderrBuffer.length > 5000) {
        stderrBuffer = stderrBuffer.slice(-5000);
      }
    });

    child.on('close', async (code) => {
      this.activeProcesses.delete(jobId);
      job.exitCode = code;
      job.fullStderr = stderrBuffer.trim();

      if (code === 0) {
        console.log(`[YT-DLP] Real download finished successfully for job ${job.id}`);

        // Verify physical file on disk
        let finalPath = job.targetPath;
        if (!fs.existsSync(finalPath)) {
          // Check for variations in extension
          const dir = path.dirname(job.targetPath);
          const baseName = path.basename(job.targetPath, path.extname(job.targetPath));
          const candidates = [
            path.join(dir, `${baseName}.${audioFormat}`),
            path.join(dir, `${baseName}.mp3`),
            path.join(dir, `${baseName}.m4a`),
            path.join(dir, `${baseName}.opus`)
          ];
          for (const cand of candidates) {
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

          // Inspect genuine audio duration, bitrate, channels, format, and codec via ffprobe
          try {
            const audioMeta = await inspectAudioFile(finalPath);
            job.actualDuration = audioMeta?.duration || null;
            job.actualDurationSec = audioMeta?.durationSec || null;
            job.actualBitrate = audioMeta?.bitrate || null;
            job.actualChannels = audioMeta?.channels || null;
            job.actualFormat = audioMeta?.format || null;
            job.actualCodec = audioMeta?.codec || null;
          } catch {
            // Non-critical
          }

          this.save();
          this.emit('jobStatusChange', job);
          this.emit('jobFinished', job);
        } else {
          job.status = 'Failed';
          job.error = `Download process finished with code 0, but no audio file found at: ${job.targetPath}`;
          this.save();
          this.emit('jobStatusChange', job);
        }
      } else {
        // Only mark failed if not explicitly paused or canceled
        if (job.status === 'Downloading') {
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
          this.save();
          this.emit('jobStatusChange', job);
        }
      }

      // Next job in queue
      this.processQueue();
    });

    child.on('error', (err) => {
      this.activeProcesses.delete(jobId);
      job.status = 'Failed';
      job.exitCode = -1;
      job.fullStderr = err.stack || err.message;
      job.error = `Process spawn error: ${err.message}`;
      this.save();
      this.emit('jobStatusChange', job);
      this.processQueue();
    });
  }

  pauseJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    if (this.activeProcesses.has(jobId)) {
      const child = this.activeProcesses.get(jobId);
      try {
        child.kill('SIGTERM');
      } catch {}
      this.activeProcesses.delete(jobId);
    }

    job.status = 'Paused';
    job.progress.speed = '0.0 MB/s';
    this.save();
    this.emit('jobStatusChange', job);
    this.processQueue();
    return true;
  }

  resumeJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'Paused') return false;

    job.status = 'Queued';
    job.error = undefined;
    this.save();
    this.emit('jobStatusChange', job);
    this.processQueue();
    return true;
  }

  cancelJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    if (this.activeProcesses.has(jobId)) {
      const child = this.activeProcesses.get(jobId);
      try {
        child.kill('SIGKILL');
      } catch {}
      this.activeProcesses.delete(jobId);
    }

    // Clean up partial files
    if (job.targetPath) {
      try {
        const partFile = `${job.targetPath}.part`;
        if (fs.existsSync(partFile)) fs.unlinkSync(partFile);
        const ytdlFile = `${job.targetPath}.ytdl`;
        if (fs.existsSync(ytdlFile)) fs.unlinkSync(ytdlFile);
      } catch {}
    }

    this.jobs.delete(jobId);
    this.save();
    this.emit('jobRemoved', jobId);
    this.processQueue();
    return true;
  }

  retryJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    if (this.activeProcesses.has(jobId)) {
      try {
        this.activeProcesses.get(jobId).kill('SIGTERM');
      } catch {}
      this.activeProcesses.delete(jobId);
    }

    job.status = 'Queued';
    job.progress.percentage = 0;
    job.progress.downloadedBytes = 0;
    job.progress.speed = '0.0 MB/s';
    job.progress.eta = '--:--';
    job.error = undefined;
    this.save();
    this.emit('jobStatusChange', job);
    this.processQueue();
    return true;
  }

  clearFinished() {
    let changed = false;
    for (const [id, job] of this.jobs.entries()) {
      if (job.status === 'Finished') {
        this.jobs.delete(id);
        changed = true;
      }
    }
    if (changed) {
      this.save();
      this.emit('clearedFinished');
    }
    return true;
  }
}

function sanitizeFileName(name) {
  return (name || 'track')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = { DownloadManager };
