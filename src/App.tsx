/**
 * RAD X - Underground Audio Intelligence & Discovery Workstation
 * Main Application Shell & Master HUD Controller
 */

import React from 'react';
import { useRadxStore } from './store/useRadxStore';
import { HeaderNav } from './components/HeaderNav';
import { HunterView } from './components/HunterView';
import { ScoutView } from './components/ScoutView';
import { DownloadsView } from './components/DownloadsView';
import { LibraryView } from './components/LibraryView';
import { SettingsView } from './components/SettingsView';
import { AuditReportView } from './components/AuditReportView';
import { AudioPlayer } from './components/AudioPlayer';
import { NeuralScoutModal } from './components/NeuralScoutModal';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

export default function App() {
  const store = useRadxStore();

  const activeDownloadsCount = store.downloadJobs.filter(
    j => j.status === 'Downloading' || j.status === 'Queued'
  ).length;

  return (
    <div className="min-h-screen bg-[#07090e] text-zinc-200 font-sans selection:bg-amber-500 selection:text-black flex flex-col pb-28">
      {/* HUD Top Navigation */}
      <HeaderNav
        activeTab={store.activeTab}
        setActiveTab={store.setActiveTab}
        activeDownloadsCount={activeDownloadsCount}
        libraryCount={store.libraryTracks.length}
        onQuickNeuralClick={() => store.openNeuralScout({ title: 'Análisis Sónico Global', genre: 'Industrial Techno' })}
        onScanLibraryClick={store.handleScanLibrary}
      />

      {/* Main Workspace View Container */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto p-4 sm:p-6">
        {store.activeTab === 'hunter' && (
          <HunterView
            selectedGenre={store.selectedGenre}
            onSelectGenre={store.setSelectedGenre}
            searchQuery={store.searchQuery}
            onSearchChange={store.setSearchQuery}
            tracks={store.hunterTracks}
            isLoading={store.isHunterLoading}
            activeTrackId={store.activeTrack?.id}
            onPlay={store.playTrack}
            onAddToQueue={store.handleAddToQueue}
            onDownload={store.handleStartDownload}
            onNeuralScout={store.openNeuralScout}
          />
        )}

        {store.activeTab === 'scout' && (
          <ScoutView
            scoutResults={store.scoutResults}
            isScanning={store.isScoutScanning}
            onTriggerScan={store.handleTriggerScoutRadar}
            onPlayTrack={store.playTrack}
            onAddToQueue={store.handleAddToQueue}
            onDownload={store.handleStartDownload}
            onOpenNeuralScout={store.openNeuralScout}
          />
        )}

        {store.activeTab === 'downloads' && (
          <DownloadsView
            downloadJobs={store.downloadJobs}
            queueItems={store.queueItems}
            onPause={store.handlePauseDownload}
            onResume={store.handleResumeDownload}
            onCancel={store.handleCancelDownload}
            onRetry={store.handleRetryDownload}
            onClearFinished={store.handleClearFinished}
            onRemoveFromQueue={store.handleRemoveFromQueue}
          />
        )}

        {store.activeTab === 'library' && (
          <LibraryView
            tracks={store.libraryTracks}
            isScanning={store.isLibraryScanning}
            filterFormat={store.libraryFilterFormat}
            onFilterFormatChange={store.setLibraryFilterFormat}
            onScanDirectories={store.handleScanLibrary}
            onPlayTrack={store.playTrack}
            onDeleteTrack={store.handleDeleteLibraryTrack}
            onOpenNeuralScout={store.openNeuralScout}
            activeTrackId={store.activeTrack?.id}
          />
        )}

        {store.activeTab === 'settings' && (
          <SettingsView
            settings={store.settings}
            onUpdateSettings={store.setSettings}
            onAddToast={store.addToast}
          />
        )}

        {store.activeTab === 'audit' && <AuditReportView />}
      </main>

      {/* Fixed Cyberpunk Audio Player Bar */}
      <AudioPlayer
        activeTrack={store.activeTrack}
        isPlaying={store.isPlaying}
        volume={store.volume}
        crossfade={store.crossfade}
        crossfadeEnabled={store.crossfadeEnabled}
        playlist={store.playlist}
        onTogglePlayPause={store.togglePlayPause}
        onStop={store.stopTrack}
        onVolumeChange={store.changeVolume}
        onCrossfadeChange={store.changeCrossfade}
        onToggleCrossfade={() => store.setCrossfadeEnabled(!store.crossfadeEnabled)}
        onOpenNeuralScout={store.openNeuralScout}
        onSelectPlaylistItem={store.playTrack}
      />

      {/* Neural Scout Gemini Thinking Mode Modal */}
      <NeuralScoutModal
        isOpen={store.neuralModalOpen}
        onClose={() => store.setNeuralModalOpen(false)}
        targetTrack={store.neuralTargetTrack}
      />

      {/* Cyberpunk Toast Notifications */}
      <div className="fixed top-14 right-4 z-50 flex flex-col space-y-2 pointer-events-none font-mono text-xs max-w-sm w-full">
        {store.toasts.map(toast => {
          return (
            <div
              key={toast.id}
              className={`p-3 rounded-xl border shadow-2xl backdrop-blur-md flex items-start space-x-2.5 pointer-events-auto transition-all transform animate-in slide-in-from-top-2 ${
                toast.type === 'success'
                  ? 'bg-[#0a1612]/95 border-emerald-500/40 text-emerald-300'
                  : toast.type === 'warning'
                  ? 'bg-[#181409]/95 border-amber-500/40 text-amber-300'
                  : toast.type === 'error'
                  ? 'bg-[#1a0b0e]/95 border-rose-500/40 text-rose-300'
                  : 'bg-[#0d121c]/95 border-cyan-500/40 text-cyan-300'
              }`}
            >
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />}
              {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />}
              {toast.type === 'info' && <Info className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />}
              <div className="flex-1 leading-snug">{toast.text}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
