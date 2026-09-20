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
  speed: string; // e.g., "3.4 MB/s"
  speedBytesPerSec: number;
  eta: string; // e.g., "00:45"
  downloadedBytes: number;
  totalBytes: number;
  sizeFormatted: string; // e.g., "48.2 MB"
}

export interface DownloadJob {
  id: string;
  trackId: string;
  title: string;
  artist: string;
  channel: string;
  thumbnail: string;
  genre: Genre;
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
}

export interface QueueItem {
  id: string;
  trackId: string;
  title: string;
  artist: string;
  channel: string;
  duration: string;
  genre: Genre;
  thumbnail: string;
  format: DownloadFormat;
  addedAt: number;
  priority: number;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  channel: string;
  duration: string;
  durationSec: number;
  genre: Genre;
  thumbnail: string;
  sourceUrl: string;
  bpm?: number;
  key?: string;
  publishedDate?: string;
  views?: string;
  audioPreviewUrl?: string;
  isDownloaded?: boolean;
  isQueued?: boolean;
  synopsis?: string;
  tags?: string[];
}

export interface ScoutResult {
  id: string;
  title: string;
  artist: string;
  channel: string;
  duration: string;
  genre: Genre;
  thumbnail: string;
  sourceUrl: string;
  bpm?: number;
  key?: string;
  trendScore: number; // 1 to 100
  detectionDate: string;
  classificationNotes: string;
  isDuplicate: boolean;
  status: 'new' | 'reviewed' | 'queued' | 'archived';
}

export interface LibraryEntry {
  id: string;
  filePath: string;
  fileName: string;
  title: string;
  artist: string;
  album?: string;
  genre: Genre | string;
  thumbnail?: string;
  bpm?: number;
  key?: string;
  duration: string;
  durationSec: number;
  format: DownloadFormat;
  fileSize: number;
  fileSizeFormatted: string;
  bitrate?: string;
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
