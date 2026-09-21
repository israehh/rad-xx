/**
 * RAD X - Underground Audio Intelligence & Discovery Workstation
 * Shared TypeScript Contracts & Domain Models
 */

export type Genre =
  | 'Industrial Techno'
  | 'Hard Techno'
  | 'Dark Techno'
  | 'Peak Time Techno'
  | 'Minimal Techno'
  | 'EBM'
  | 'Synthwave'
  | 'Custom';

export type DownloadFormat = 'MP3' | 'WEBM' | 'FLAC' | 'WAV' | 'M4A';

export type DownloadStatus = 'Queued' | 'Downloading' | 'Finished' | 'Failed' | 'Paused';

export interface DownloadProgress {
  percentage: number;
  speed: string | null; // e.g., "3.4 MB/s" or null
  speedBytesPerSec: number;
  eta: string | null; // e.g., "00:45" or null
  downloadedBytes: number;
  totalBytes: number | null;
  sizeFormatted: string | null; // e.g., "48.2 MB" or null
}

export interface DownloadJob {
  id: string;
  trackId: string;
  title: string;
  artist: string | null;
  channel: string | null;
  thumbnail: string | null;
  genre: Genre | string | null;
  format: DownloadFormat;
  quality: '320kbps' | 'Lossless' | 'Standard';
  targetPath: string;
  status: DownloadStatus;
  progress: DownloadProgress;
  queuedAt: number;
  startedAt?: number;
  finishedAt?: number;
  error?: string;
  sourceUrl: string;
  executedCommand?: string;
  exitCode?: number;
  fullStderr?: string;
  actualDuration?: string | null;
  actualDurationSec?: number | null;
  actualBitrate?: string | null;
  actualChannels?: number | null;
  actualFormat?: string | null;
  actualCodec?: string | null;
}

export interface QueueItem {
  id: string;
  trackId: string;
  title: string;
  artist: string | null;
  channel: string | null;
  duration: string | null;
  genre: Genre | string | null;
  thumbnail: string | null;
  format: DownloadFormat;
  addedAt: number;
  priority: number;
}

export interface Track {
  id: string;
  title: string;
  artist?: string | null;
  channel?: string | null;
  duration?: string | null;
  durationSec?: number | null;
  genre?: Genre | string | null;
  thumbnail?: string | null;
  sourceUrl: string;
  bpm?: number | null;
  key?: string | null;
  publishedDate?: string | null;
  views?: string | null;
  audioPreviewUrl?: string | null;
  isDownloaded?: boolean;
  isQueued?: boolean;
  synopsis?: string | null;
  tags?: string[];
}

export interface ScoutResult {
  id: string;
  title: string;
  artist?: string | null;
  channel?: string | null;
  duration?: string | null;
  genre?: Genre | string | null;
  thumbnail?: string | null;
  sourceUrl: string;
  bpm?: number | null;
  key?: string | null;
  trendScore?: number | null; // Real metric or null
  detectionDate: string;
  classificationNotes?: string | null;
  isDuplicate: boolean;
  status: 'new' | 'reviewed' | 'queued' | 'archived';
}

export interface LibraryEntry {
  id: string;
  filePath: string;
  fileName: string;
  title: string;
  artist?: string | null;
  album?: string | null;
  genre?: Genre | string | null;
  thumbnail?: string | null;
  bpm?: number | null;
  key?: string | null;
  duration?: string | null;
  durationSec?: number | null;
  format?: DownloadFormat | string | null;
  channels?: number | null;
  codec?: string | null;
  fileSize: number;
  fileSizeFormatted: string;
  bitrate?: string | null;
  dateAdded: number;
  lastScanned: number;
  folderCategory: 'Main' | 'Scout' | 'Custom';
  playCount: number;
  rating?: number;
}

export interface SettingsConfig {
  musicDirectory: string; // e.g., "C:\\Music"
  scoutDirectory: string; // e.g., "C:\\Music\\Scout"
  autoScanOnStartup: boolean;
  maxConcurrentDownloads: number;
  preferredFormat: DownloadFormat;
  audioBitrate: '320kbps' | '256kbps' | '192kbps';
  enableDailyScout: boolean;
  scoutIntervalHours: number;
  crossfadeDurationSec: number;
  highThinkingEnabled: boolean;
  themeMode: 'cyberpunk-dark' | 'industrial-monochrome' | 'neon-terminal';
  autoScout: boolean;
  scoutIntervalMinutes: number;
  autoDownload: boolean;
  avoidDuplicates: boolean;
  maxDownloadsPerCycle: number;
  minTrackDuration: number;
  maxTrackDuration: number;
  enabledGenres: string[];
}

export interface ScoutSchedulerLog {
  tag: 'SCOUT' | 'QUEUE' | 'DOWNLOAD' | 'LIBRARY' | string;
  message: string;
  time: string;
  line?: string;
}

export interface ScoutSchedulerStatus {
  active: boolean;
  isRunningCycle: boolean;
  cycleCount: number;
  lastRunTimestamp: number;
  nextRunTimestamp: number;
  totalFoundLifetime: number;
  totalQueuedLifetime: number;
  totalDownloadedLifetime: number;
  scoutIntervalMinutes: number;
  autoDownload: boolean;
  avoidDuplicates: boolean;
  queries: string[];
  recentLogs: string[];
}

export interface HunterFilterParams {
  genre: Genre;
  searchQuery?: string;
  minBpm?: number;
  maxBpm?: number;
  sortBy?: 'trending' | 'recent' | 'duration' | 'bpm';
}

export interface NeuralAnalysisResult {
  thinkingTrace?: string;
  sonicArchetype: string;
  energyLevel: 'Low' | 'Mid' | 'High' | 'Peak Acid';
  synthesizerProfile: string;
  drumPatternStyle: string;
  transitionRecommendations: string[];
  subgenreCuration: string[];
  curatorInsight: string;
}
