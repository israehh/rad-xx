/**
 * RAD X - Real Audio & yt-dlp Core Utility
 * Manages yt-dlp binary resolution, real media search (YouTube & SoundCloud),
 * real audio downloading with live stdout progress parsing, and audio inspection.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Cached path once resolved
let cachedYtDlpPath = null;
let cachedFfprobePath = null;

/**
 * Robust resolution of yt-dlp executable:
 * 1. process.env.YTDLP_PATH
 * 2. User configured path
 * 3. Windows standard C:\ia\yt-dlp.exe (user requested)
 * 4. App local ./bin/yt-dlp or ./bin/yt-dlp.exe
 * 5. System PATH yt-dlp
 */
function resolveYtDlpPath(customPath = null) {
  const isWindows = process.platform === 'win32';

  if (isWindows && fs.existsSync('C:\\ia\\yt-dlp.exe')) {
    cachedYtDlpPath = 'C:\\ia\\yt-dlp.exe';
    return 'C:\\ia\\yt-dlp.exe';
  }

  if (customPath && fs.existsSync(customPath)) {
    cachedYtDlpPath = customPath;
    return customPath;
  }

  if (process.env.YTDLP_PATH && fs.existsSync(process.env.YTDLP_PATH)) {
    cachedYtDlpPath = process.env.YTDLP_PATH;
    return process.env.YTDLP_PATH;
  }

  if (cachedYtDlpPath && fs.existsSync(cachedYtDlpPath)) {
    return cachedYtDlpPath;
  }

  const candidates = [
    'C:\\ia\\yt-dlp.exe',
    'C:\\ia\\yt-dlp\\yt-dlp.exe',
    path.join(process.cwd(), 'bin', isWindows ? 'yt-dlp.exe' : 'yt-dlp'),
    path.join(__dirname, '..', '..', 'bin', isWindows ? 'yt-dlp.exe' : 'yt-dlp'),
    '/app/bin/yt-dlp',
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp'
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        cachedYtDlpPath = candidate;
        return candidate;
      }
    } catch {
      // Ignore FS errors
    }
  }

  // Fallback to command name in PATH
  cachedYtDlpPath = isWindows ? 'C:\\ia\\yt-dlp.exe' : 'yt-dlp';
  return cachedYtDlpPath;
}

/**
 * Resolve ffprobe executable for real audio metadata inspection
 */
function resolveFfprobePath() {
  const isWindows = process.platform === 'win32';

  if (isWindows && fs.existsSync('C:\\ia\\ffprobe.exe')) {
    cachedFfprobePath = 'C:\\ia\\ffprobe.exe';
    return 'C:\\ia\\ffprobe.exe';
  }

  if (cachedFfprobePath) return cachedFfprobePath;

  const candidates = [
    'C:\\ia\\ffprobe.exe',
    path.join(process.cwd(), 'bin', isWindows ? 'ffprobe.exe' : 'ffprobe'),
    '/usr/bin/ffprobe',
    '/usr/local/bin/ffprobe'
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        cachedFfprobePath = candidate;
        return candidate;
      }
    } catch {
      // Ignore
    }
  }

  cachedFfprobePath = isWindows ? 'C:\\ia\\ffprobe.exe' : 'ffprobe';
  return cachedFfprobePath;
}

/**
 * Inspect a real audio file on disk using ffprobe and fs.stat
 * Extracts: duration, bitrate, channels, format, codec, fileSize
 * Never fabricates values; returns null for unprobed properties.
 */
function inspectAudioFile(filePath) {
  return new Promise((resolve) => {
    try {
      if (!fs.existsSync(filePath)) {
        return resolve({
          exists: false,
          duration: null,
          durationSec: null,
          fileSize: 0,
          bitrate: null,
          channels: null,
          format: null,
          codec: null
        });
      }

      const stat = fs.statSync(filePath);
      const ffprobe = resolveFfprobePath();

      const proc = spawn(ffprobe, [
        '-v', 'error',
        '-show_entries', 'format=duration,bit_rate,format_name:stream=channels,codec_name',
        '-of', 'json',
        filePath
      ]);

      let stdout = '';
      proc.stdout.on('data', d => stdout += d);

      proc.on('close', (code) => {
        let durationSec = null;
        let bitrateStr = null;
        let channels = null;
        let formatName = null;
        let codecName = null;

        if (code === 0 && stdout) {
          try {
            const data = JSON.parse(stdout);
            if (data?.format?.duration) {
              const parsedDur = parseFloat(data.format.duration);
              if (!isNaN(parsedDur) && parsedDur > 0) {
                durationSec = Math.round(parsedDur);
              }
            }
            if (data?.format?.bit_rate) {
              const rawBitrate = parseInt(data.format.bit_rate, 10);
              if (!isNaN(rawBitrate) && rawBitrate > 0) {
                const kbps = Math.round(rawBitrate / 1000);
                bitrateStr = `${kbps} kbps`;
              }
            }
            if (data?.format?.format_name) {
              formatName = data.format.format_name.split(',')[0].trim();
            }
            if (Array.isArray(data?.streams) && data.streams.length > 0) {
              const audioStream = data.streams.find(s => s.channels) || data.streams[0];
              if (audioStream?.channels) {
                channels = parseInt(audioStream.channels, 10);
              }
              if (audioStream?.codec_name) {
                codecName = audioStream.codec_name;
              }
            }
          } catch {
            // ffprobe stdout parse failure
          }
        }

        const durationFormatted = durationSec !== null ? formatDuration(durationSec) : null;

        resolve({
          exists: true,
          filePath,
          fileSize: stat.size,
          fileSizeFormatted: `${(stat.size / (1024 * 1024)).toFixed(1)} MB`,
          duration: durationFormatted,
          durationSec,
          bitrate: bitrateStr,
          channels,
          format: formatName,
          codec: codecName
        });
      });

      proc.on('error', () => {
        resolve({
          exists: true,
          filePath,
          fileSize: stat.size,
          fileSizeFormatted: `${(stat.size / (1024 * 1024)).toFixed(1)} MB`,
          duration: null,
          durationSec: null,
          bitrate: null,
          channels: null,
          format: null,
          codec: null
        });
      });
    } catch (err) {
      resolve({
        exists: false,
        duration: null,
        durationSec: null,
        fileSize: 0,
        bitrate: null,
        channels: null,
        format: null,
        codec: null
      });
    }
  });
}

/**
 * Format raw seconds to MM:SS
 * Returns null if duration cannot be determined; never returns fake durations.
 */
function formatDuration(sec) {
  if (sec === null || sec === undefined || isNaN(sec) || sec <= 0) return null;
  const total = Math.round(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Parse artist and title from full track title string
 */
function parseArtistAndTitle(rawTitle, uploader = '') {
  const clean = (rawTitle || '').replace(/\s+/g, ' ').trim();
  const delimiters = [' - ', ' – ', ' — ', ' // ', ': '];

  for (const delim of delimiters) {
    if (clean.includes(delim)) {
      const parts = clean.split(delim);
      const artist = parts[0].trim();
      const title = parts.slice(1).join(delim).trim();
      if (artist && title) {
        return { artist, title };
      }
    }
  }

  return {
    artist: uploader || 'Underground Artist',
    title: clean || 'Unknown Track'
  };
}

/**
 * Format view count (e.g. 1500000 -> 1.5M)
 */
function formatViews(views) {
  if (!views || isNaN(views)) return undefined;
  const num = Number(views);
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${Math.round(num / 1000)}K`;
  return String(num);
}

/**
 * Real media search via yt-dlp
 * Queries YouTube (ytsearch) and SoundCloud (scsearch)
 */
async function searchMedia(params = {}) {
  const {
    query = '',
    genre = 'Industrial Techno',
    limit = 12,
    customYtDlpPath = null
  } = params;

  const ytdlp = resolveYtDlpPath(customYtDlpPath);
  console.log(`[YT-DLP] Executing real audio search with binary: "${ytdlp}"`);

  const trimmedQuery = (query || '').trim();
  const isDirectUrl = /^https?:\/\//i.test(trimmedQuery);

  if (isDirectUrl) {
    // Direct URL extraction
    return extractSingleUrl(trimmedQuery, genre, ytdlp);
  }

  // Construct search query
  const targetQuery = trimmedQuery || `${genre} underground techno`;
  const results = [];
  const seenIds = new Set();

  // Search providers in parallel: YouTube and SoundCloud
  const searches = [
    runSingleYtDlpSearch(`ytsearch${limit}:${targetQuery}`, 'youtube', genre, ytdlp),
    runSingleYtDlpSearch(`scsearch${limit}:${targetQuery}`, 'soundcloud', genre, ytdlp)
  ];

  const searchOutcomes = await Promise.allSettled(searches);

  for (const outcome of searchOutcomes) {
    if (outcome.status === 'fulfilled' && Array.isArray(outcome.value)) {
      for (const track of outcome.value) {
        if (!seenIds.has(track.id) && !seenIds.has(track.sourceUrl)) {
          seenIds.add(track.id);
          seenIds.add(track.sourceUrl);
          results.push(track);
        }
      }
    }
  }

  console.log(`[YT-DLP] Search completed: found ${results.length} real audio tracks for "${targetQuery}"`);
  return results;
}

/**
 * Extract single URL (YouTube, SoundCloud, Bandcamp)
 */
function extractSingleUrl(url, genre, ytdlp) {
  return new Promise((resolve) => {
    const proc = spawn(ytdlp, [
      '--dump-single-json',
      '--no-warnings',
      '--no-check-certificates',
      url
    ]);

    let stdout = '';
    proc.stdout.on('data', d => stdout += d);

    proc.on('close', (code) => {
      if (code !== 0 || !stdout) {
        return resolve([]);
      }
      try {
        const item = JSON.parse(stdout);
        const { artist, title } = parseArtistAndTitle(item.title, item.uploader || item.channel);
        const source = url.includes('soundcloud.com')
          ? 'soundcloud'
          : (url.includes('bandcamp.com') ? 'bandcamp' : 'youtube');

        const rawDurationSec = item.duration && !isNaN(item.duration) && item.duration > 0 ? Math.round(item.duration) : null;
        let realThumbnail = item.thumbnail || (Array.isArray(item.thumbnails) && item.thumbnails.length > 0 ? item.thumbnails[item.thumbnails.length - 1]?.url : null) || null;
        if (!realThumbnail && source === 'youtube' && item.id) {
          realThumbnail = `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`;
        }

        const track = {
          id: `${source}_${item.id || Date.now()}`,
          title,
          artist,
          channel: item.uploader || item.channel || null,
          duration: rawDurationSec !== null ? formatDuration(rawDurationSec) : null,
          durationSec: rawDurationSec,
          genre: genre || null,
          source,
          sourceUrl: item.webpage_url || url,
          thumbnail: realThumbnail,
          bpm: null,
          key: null,
          views: formatViews(item.view_count) || null,
          publishedDate: item.upload_date || null
        };

        resolve([track]);
      } catch {
        resolve([]);
      }
    });

    proc.on('error', () => resolve([]));
  });
}

/**
 * Execute single yt-dlp search query
 */
function runSingleYtDlpSearch(searchArg, source, genre, ytdlp) {
  return new Promise((resolve) => {
    const proc = spawn(ytdlp, [
      '--dump-single-json',
      '--flat-playlist',
      '--no-warnings',
      '--no-check-certificates',
      searchArg
    ]);

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', d => stdout += d);
    proc.stderr.on('data', d => stderr += d);

    proc.on('close', (code) => {
      if (code !== 0 || !stdout) {
        console.warn(`[YT-DLP] Search for ${searchArg} exited with code ${code}. Stderr: ${stderr.slice(0, 150)}`);
        return resolve([]);
      }

      try {
        const data = JSON.parse(stdout);
        const entries = Array.isArray(data.entries) ? data.entries : (data.id ? [data] : []);
        const tracks = [];

        for (const e of entries) {
          if (!e || !e.title) continue;

          const { artist, title } = parseArtistAndTitle(e.title, e.uploader || e.channel);
          const rawDuration = e.duration && !isNaN(e.duration) && e.duration > 0 ? Math.round(e.duration) : null;

          // Determine real track URL
          let sourceUrl = e.webpage_url || e.url;
          if (!sourceUrl && source === 'youtube' && e.id) {
            sourceUrl = `https://www.youtube.com/watch?v=${e.id}`;
          }

          let thumbnail = e.thumbnail || null;
          if (!thumbnail && Array.isArray(e.thumbnails) && e.thumbnails.length > 0) {
            thumbnail = e.thumbnails[e.thumbnails.length - 1]?.url || e.thumbnails[0]?.url || null;
          }
          if (!thumbnail && source === 'youtube' && e.id) {
            thumbnail = `https://i.ytimg.com/vi/${e.id}/hqdefault.jpg`;
          }

          tracks.push({
            id: `${source}_${e.id}`,
            title,
            artist,
            channel: e.uploader || e.channel || (source === 'soundcloud' ? 'SoundCloud' : 'YouTube'),
            duration: rawDuration !== null ? formatDuration(rawDuration) : null,
            durationSec: rawDuration,
            genre: genre || null,
            source,
            sourceUrl,
            thumbnail: thumbnail || null,
            bpm: null,
            key: null,
            views: formatViews(e.view_count) || null,
            publishedDate: e.upload_date || null
          });
        }

        resolve(tracks);
      } catch (parseErr) {
        console.error(`[YT-DLP] JSON parse error for ${searchArg}:`, parseErr.message);
        resolve([]);
      }
    });

    proc.on('error', (err) => {
      console.warn(`[YT-DLP] Failed to spawn process for ${searchArg}:`, err.message);
      resolve([]);
    });
  });
}

/**
 * Parse yt-dlp progress line from stdout
 * Example lines:
 * [download]  45.2% of ~  12.34MiB at    3.45MiB/s ETA 00:03 (frag 4/10)
 * [download] 100% of   12.34MiB in 00:00:04 at 3.01MiB/s
 */
function parseProgressLine(line) {
  if (!line || !line.includes('[download]')) return null;

  const pctMatch = line.match(/(\d+(?:\.\d+)?)%/);
  const percentage = pctMatch ? Math.min(100, Math.max(0, parseFloat(pctMatch[1]))) : null;

  const sizeMatch = line.match(/of\s+~?\s*([\d\.]+\s*[KMGT]?i?B)/i);
  const sizeFormatted = sizeMatch ? sizeMatch[1].trim() : null;

  const speedMatch = line.match(/at\s+([\d\.]+\s*[KMGT]?i?B\/s)/i);
  const speed = speedMatch ? speedMatch[1].trim() : null;

  const etaMatch = line.match(/ETA\s+([\d:]+)/i);
  const eta = etaMatch ? etaMatch[1].trim() : (line.includes('100%') ? '00:00' : null);

  return {
    percentage,
    sizeFormatted,
    speed,
    eta
  };
}

module.exports = {
  resolveYtDlpPath,
  resolveFfprobePath,
  inspectAudioFile,
  searchMedia,
  parseProgressLine,
  formatDuration,
  formatBytes: (b) => `${(b / (1024 * 1024)).toFixed(1)} MB`
};
