/**
 * RAD X Central State Store
 * High-performance state coordinator connecting UI, Audio Engine, and Electron Bridge
 */

import { useState, useEffect, useCallback } from 'react';
import { Genre, Track, DownloadJob, QueueItem, LibraryEntry, ScoutResult, SettingsConfig } from '../types';
import { electronBridge } from '../services/electronBridge';
import { audioEngine } from '../services/audioEngine';

export type ActiveTab = 'hunter' | 'scout' | 'downloads' | 'library' | 'settings' | 'audit';

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  text: string;
}

export function useRadxStore() {
  // Navigation
  const [activeTab, setActiveTab] = useState<ActiveTab>('hunter');

  // Hunter State
  const [selectedGenre, setSelectedGenre] = useState<Genre>('Industrial Techno');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hunterTracks, setHunterTracks] = useState<Track[]>([]);
  const [isHunterLoading, setIsHunterLoading] = useState<boolean>(false);

  // Scout State
  const [scoutResults, setScoutResults] = useState<ScoutResult[]>([]);
  const [isScoutScanning, setIsScoutScanning] = useState<boolean>(false);

  // Downloads & Queue State
  const [downloadJobs, setDownloadJobs] = useState<DownloadJob[]>([]);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);

  // Library State
  const [libraryTracks, setLibraryTracks] = useState<LibraryEntry[]>([]);
  const [isLibraryScanning, setIsLibraryScanning] = useState<boolean>(false);
  const [libraryFilterFormat, setLibraryFilterFormat] = useState<string>('ALL');

  // Settings State
  const [settings, setSettings] = useState<SettingsConfig>({
    musicDirectory: 'C:\\Music',
    scoutDirectory: 'C:\\Music\\Scout',
    autoScanOnStartup: true,
    maxConcurrentDownloads: 3,
    preferredFormat: 'MP3',
    audioBitrate: '320kbps',
    enableDailyScout: true,
    scoutIntervalHours: 24,
    crossfadeDurationSec: 4,
    highThinkingEnabled: true,
    themeMode: 'cyberpunk-dark'
  });

  // Audio Player State
  const [activeTrack, setActiveTrack] = useState<Track | LibraryEntry | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.8);
  const [crossfade, setCrossfade] = useState<number>(0.5);
  const [crossfadeEnabled, setCrossfadeEnabled] = useState<boolean>(true);
  const [playlist, setPlaylist] = useState<(Track | LibraryEntry)[]>([]);

  // Deep AI Neural Scout Modal
  const [neuralModalOpen, setNeuralModalOpen] = useState<boolean>(false);
  const [neuralTargetTrack, setNeuralTargetTrack] = useState<Partial<Track | LibraryEntry> | null>(null);

  // System Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((text: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  // Initial Load
  const reloadAll = useCallback(async () => {
    try {
      const [q, d, l, s, set] = await Promise.all([
        electronBridge.getQueue(),
        electronBridge.getDownloads(),
        electronBridge.getLibrary(),
        electronBridge.getScoutResults(),
        electronBridge.getSettings()
      ]);
      setQueueItems(q);
      setDownloadJobs(d);
      setLibraryTracks(l);
      setScoutResults(s);
      setSettings(set);
    } catch (err) {
      console.warn('[useRadxStore] Error syncing store:', err);
    }
  }, []);

  useEffect(() => {
    reloadAll();

    const unsubProgress = electronBridge.onDownloadProgress(updatedJob => {
      setDownloadJobs(prev => {
        const idx = prev.findIndex(j => j.id === updatedJob.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updatedJob;
          return next;
        }
        return [updatedJob, ...prev];
      });
    });

    const unsubLibrary = electronBridge.onLibraryUpdated(async () => {
      try {
        const updated = await electronBridge.getLibrary();
        setLibraryTracks(updated);
      } catch (err) {
        console.warn('Error refreshing library on update event', err);
      }
    });

    return () => {
      unsubProgress();
      unsubLibrary();
    };
  }, [reloadAll]);

  // Web polling fallback when active downloads exist
  useEffect(() => {
    const hasActiveDownloads = downloadJobs.some(
      j => j.status === 'Downloading' || j.status === 'Queued'
    );
    if (!hasActiveDownloads) return;

    console.log('[DOWNLOAD] [STORE] Active downloads detected, starting polling monitor');

    const interval = setInterval(async () => {
      try {
        const freshJobs = await electronBridge.getDownloads();
        setDownloadJobs(freshJobs);

        const anyFinished = freshJobs.some(fj => fj.status === 'Finished');
        if (anyFinished) {
          const updatedLib = await electronBridge.getLibrary();
          setLibraryTracks(updatedLib);
        }
      } catch (err) {
        console.warn('[DOWNLOAD] [STORE] Polling warning:', err);
      }
    }, 800);

    return () => clearInterval(interval);
  }, [downloadJobs.map(j => `${j.id}:${j.status}`).join(',')]);

  // Load Hunter tracks whenever genre or search query changes
  const refreshHunter = useCallback(async () => {
    setIsHunterLoading(true);
    console.log('[HUNTER] [STORE] Initiating search for genre:', selectedGenre, 'query:', searchQuery);
    try {
      const results = await electronBridge.searchHunter({
        genre: selectedGenre,
        searchQuery
      });

      console.log(`[HUNTER] [STORE] Received ${results?.length || 0} valid tracks for render`);

      // Augment with queued/downloaded badges
      const augmented = (results || []).map(t => {
        const isQueued = queueItems.some(q => q.trackId === t.id) || downloadJobs.some(j => j.trackId === t.id);
        const isDownloaded = downloadJobs.some(j => j.trackId === t.id && j.status === 'Finished') ||
          libraryTracks.some(l => l.title.toLowerCase() === t.title.toLowerCase());
        return {
          ...t,
          isQueued,
          isDownloaded
        };
      });

      setHunterTracks(augmented);
    } catch (err) {
      console.error('[HUNTER] [STORE] Hunter fetch error:', err);
    } finally {
      setIsHunterLoading(false);
    }
  }, [selectedGenre, searchQuery, queueItems, downloadJobs, libraryTracks]);

  useEffect(() => {
    refreshHunter();
  }, [refreshHunter]);

  // Audio Playback Controls
  const playTrack = useCallback((track: Track | LibraryEntry) => {
    setActiveTrack(track);
    setIsPlaying(true);
    const bpm = track.bpm || 145;
    const genre = track.genre || 'Industrial Techno';
    audioEngine.playTrack(bpm, genre);
    addToast(`Reproduciendo: ${track.title}`, 'info');

    // Add to active playlist queue if not already there
    setPlaylist(prev => {
      if (prev.some(t => t.id === track.id)) return prev;
      return [...prev, track];
    });
  }, [addToast]);

  const togglePlayPause = useCallback(() => {
    if (!activeTrack) return;
    if (isPlaying) {
      audioEngine.pausePlayback();
      setIsPlaying(false);
    } else {
      const bpm = activeTrack.bpm || 145;
      const genre = activeTrack.genre || 'Industrial Techno';
      audioEngine.playTrack(bpm, genre);
      setIsPlaying(true);
    }
  }, [activeTrack, isPlaying]);

  const stopTrack = useCallback(() => {
    audioEngine.stopPlayback();
    setIsPlaying(false);
  }, []);

  const changeVolume = useCallback((val: number) => {
    setVolume(val);
    audioEngine.setVolume(val);
  }, []);

  const changeCrossfade = useCallback((val: number) => {
    setCrossfade(val);
    audioEngine.setCrossfade(val);
  }, []);

  // Queue actions
  const handleAddToQueue = useCallback(async (track: Track, format = 'MP3') => {
    const res = await electronBridge.addToQueue(track, format);
    if (res.success && res.item) {
      setQueueItems(prev => [...prev, res.item!]);
      addToast(`En cola: ${track.title} (${format})`, 'success');
      refreshHunter();
    } else {
      addToast(res.reason || 'Ya está en la cola', 'warning');
    }
  }, [addToast, refreshHunter]);

  const handleRemoveFromQueue = useCallback(async (id: string) => {
    await electronBridge.removeFromQueue(id);
    setQueueItems(prev => prev.filter(q => q.id !== id));
    addToast('Eliminado de la cola', 'info');
    refreshHunter();
  }, [addToast, refreshHunter]);

  // Download actions
  const handleStartDownload = useCallback(async (track: Track, format = 'MP3') => {
    const res = await electronBridge.addDownload(track, format);
    if (res.success && res.job) {
      setDownloadJobs(prev => [res.job!, ...prev]);
      addToast(`Descarga iniciada: ${track.title} [${format}]`, 'success');
      refreshHunter();
    } else {
      addToast(res.reason || 'Error al iniciar la descarga', 'warning');
    }
  }, [addToast, refreshHunter]);

  const handlePauseDownload = useCallback(async (id: string) => {
    await electronBridge.pauseDownload(id);
    setDownloadJobs(prev => prev.map(j => (j.id === id ? { ...j, status: 'Paused' } : j)));
    addToast('Descarga pausada', 'info');
  }, [addToast]);

  const handleResumeDownload = useCallback(async (id: string) => {
    await electronBridge.resumeDownload(id);
    setDownloadJobs(prev => prev.map(j => (j.id === id ? { ...j, status: 'Downloading' } : j)));
    addToast('Descarga reanudada', 'info');
  }, [addToast]);

  const handleCancelDownload = useCallback(async (id: string) => {
    await electronBridge.cancelDownload(id);
    setDownloadJobs(prev => prev.filter(j => j.id !== id));
    addToast('Descarga cancelada', 'info');
    refreshHunter();
  }, [addToast, refreshHunter]);

  const handleRetryDownload = useCallback(async (id: string) => {
    const res = await electronBridge.retryDownload(id);
    if (res.success && res.job) {
      setDownloadJobs(prev => prev.map(j => (j.id === id ? res.job! : j)));
      addToast('Descarga reiniciada', 'success');
    } else {
      const fresh = await electronBridge.getDownloads();
      setDownloadJobs(fresh);
      addToast(res.reason || 'Descarga reiniciada', 'info');
    }
    refreshHunter();
  }, [addToast, refreshHunter]);

  const handleClearFinished = useCallback(async () => {
    await electronBridge.clearFinishedDownloads();
    setDownloadJobs(prev => prev.filter(j => j.status !== 'Finished'));
    addToast('Descargas completadas eliminadas', 'info');
  }, [addToast]);

  // Scout actions
  const handleTriggerScoutRadar = useCallback(async () => {
    setIsScoutScanning(true);
    addToast('Escaneo de radar autónomo activado en frecuencias underground...', 'info');
    try {
      const res = await electronBridge.scanScoutRadar();
      const updated = await electronBridge.getScoutResults();
      setScoutResults(updated);
      addToast(`Escaneo de radar completado: +${res.newDiscoveriesCount || 0} pistas identificadas`, 'success');
    } catch (err) {
      addToast('El escaneo de radar encontró interferencias de red', 'error');
    } finally {
      setIsScoutScanning(false);
    }
  }, [addToast]);

  // Library actions
  const handleScanLibrary = useCallback(async () => {
    setIsLibraryScanning(true);
    addToast('Escaneando directorios locales C:\\Music y C:\\Music\\Scout...', 'info');
    try {
      const res = await electronBridge.scanLibrary();
      const updated = await electronBridge.getLibrary();
      setLibraryTracks(updated);
      addToast(`Biblioteca sincronizada: +${res.newTracksCount || 0} pistas indexadas`, 'success');
    } catch (err) {
      addToast('Fallo al escanear los directorios', 'error');
    } finally {
      setIsLibraryScanning(false);
    }
  }, [addToast]);

  const handleDeleteLibraryTrack = useCallback(async (id: string) => {
    await electronBridge.deleteFromLibrary(id);
    setLibraryTracks(prev => prev.filter(t => t.id !== id));
    addToast('Pista eliminada de la biblioteca', 'info');
  }, [addToast]);

  // Neural Scout trigger
  const openNeuralScout = useCallback((track: Partial<Track | LibraryEntry>) => {
    setNeuralTargetTrack(track);
    setNeuralModalOpen(true);
  }, []);

  return {
    activeTab,
    setActiveTab,
    // Hunter
    selectedGenre,
    setSelectedGenre,
    searchQuery,
    setSearchQuery,
    hunterTracks,
    isHunterLoading,
    refreshHunter,
    // Scout
    scoutResults,
    isScoutScanning,
    handleTriggerScoutRadar,
    // Downloads & Queue
    downloadJobs,
    queueItems,
    handleAddToQueue,
    handleRemoveFromQueue,
    handleStartDownload,
    handlePauseDownload,
    handleResumeDownload,
    handleCancelDownload,
    handleRetryDownload,
    handleClearFinished,
    // Library
    libraryTracks,
    isLibraryScanning,
    libraryFilterFormat,
    setLibraryFilterFormat,
    handleScanLibrary,
    handleDeleteLibraryTrack,
    // Settings
    settings,
    setSettings,
    // Player
    activeTrack,
    isPlaying,
    volume,
    crossfade,
    crossfadeEnabled,
    playlist,
    playTrack,
    togglePlayPause,
    stopTrack,
    changeVolume,
    changeCrossfade,
    setCrossfadeEnabled,
    // AI Neural Scout
    neuralModalOpen,
    setNeuralModalOpen,
    neuralTargetTrack,
    openNeuralScout,
    // Toasts
    toasts,
    addToast
  };
}
