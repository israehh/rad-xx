import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  Sliders,
  ListMusic,
  Activity,
  Sparkles,
  Radio,
  Disc3
} from 'lucide-react';
import { Track, LibraryEntry } from '../types';
import { audioEngine } from '../services/audioEngine';

interface AudioPlayerProps {
  activeTrack: Track | LibraryEntry | null;
  isPlaying: boolean;
  volume: number;
  crossfade: number;
  crossfadeEnabled: boolean;
  playlist: (Track | LibraryEntry)[];
  onTogglePlayPause: () => void;
  onStop: () => void;
  onVolumeChange: (val: number) => void;
  onCrossfadeChange: (val: number) => void;
  onToggleCrossfade: () => void;
  onOpenNeuralScout: (track: Track | LibraryEntry) => void;
  onSelectPlaylistItem: (track: Track | LibraryEntry) => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  activeTrack,
  isPlaying,
  volume,
  crossfade,
  crossfadeEnabled,
  playlist,
  onTogglePlayPause,
  onStop,
  onVolumeChange,
  onCrossfadeChange,
  onToggleCrossfade,
  onOpenNeuralScout,
  onSelectPlaylistItem
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showPlaylistDrawer, setShowPlaylistDrawer] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  // Frequency Spectrum Animation loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dataArray = new Uint8Array(64);

    const render = () => {
      animId = requestAnimationFrame(render);
      audioEngine.getFrequencyData(dataArray);

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Cyberpunk background grid line
      ctx.strokeStyle = '#181e2b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      const barWidth = (width / 32) - 1.5;
      let x = 0;

      for (let i = 0; i < 32; i++) {
        const val = isPlaying ? dataArray[i * 2] : 2 + Math.sin(Date.now() / 400 + i) * 2;
        const barHeight = Math.max(2, (val / 255) * height);

        // Cyberpunk amber / cyan gradient
        const grad = ctx.createLinearGradient(0, height, 0, 0);
        grad.addColorStop(0, '#f59e0b');
        grad.addColorStop(0.7, '#06b6d4');
        grad.addColorStop(1, '#a855f7');

        ctx.fillStyle = isPlaying ? grad : '#222838';
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);

        x += barWidth + 2;
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isPlaying]);

  // Track timer increment
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setElapsedSec(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying]);

  // Reset timer on track switch
  useEffect(() => {
    setElapsedSec(0);
  }, [activeTrack?.id]);

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 bg-[#08090f]/95 border-t border-[#1d2333] backdrop-blur-xl px-4 py-2.5 shadow-[0_-8px_24px_rgba(0,0,0,0.6)]">
      <div className="max-w-[1720px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Track Metadata and Visual Thumbnail */}
        <div className="flex items-center space-x-3 w-full md:w-1/4 min-w-0">
          <div className="relative w-12 h-12 rounded bg-[#121622] border border-[#263044] overflow-hidden flex-shrink-0 flex items-center justify-center group">
            {activeTrack?.thumbnail ? (
              <img
                src={activeTrack.thumbnail}
                alt={activeTrack.title}
                className={`w-full h-full object-cover transition-transform ${isPlaying ? 'scale-105' : 'opacity-70'}`}
              />
            ) : (
              <Disc3 className={`w-6 h-6 text-zinc-600 ${isPlaying ? 'animate-spin text-amber-400' : ''}`} />
            )}
            <div className="absolute inset-0 bg-black/20" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold font-mono text-zinc-100 truncate">
                {activeTrack ? activeTrack.title : 'NINGUNA PISTA CARGADA'}
              </span>
              {activeTrack?.bpm && (
                <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  {activeTrack.bpm} BPM
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2 text-[11px] font-mono text-zinc-400 truncate">
              <span>{activeTrack ? activeTrack.artist : 'Selecciona una pista para reproducir'}</span>
              {activeTrack?.genre && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span className="text-zinc-500">{activeTrack.genre}</span>
                </>
              )}
            </div>
          </div>

          {activeTrack && (
            <button
              onClick={() => onOpenNeuralScout(activeTrack)}
              className="p-1.5 rounded hover:bg-[#1a2233] text-zinc-400 hover:text-amber-400 transition-colors cursor-pointer"
              title="Análisis sónico con IA (Modo Neural)"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
            </button>
          )}
        </div>

        {/* Master Controls & Waveform Telemetry */}
        <div className="flex flex-col items-center w-full md:w-2/4 max-w-xl space-y-1.5">
          <div className="flex items-center space-x-4">
            <button
              onClick={onStop}
              disabled={!activeTrack}
              className="p-2 rounded bg-[#121622] hover:bg-[#1a2130] text-zinc-400 hover:text-rose-400 border border-[#232c3f] transition-all disabled:opacity-40 cursor-pointer"
              title="Detener reproducción"
            >
              <Square className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onTogglePlayPause}
              disabled={!activeTrack}
              className="p-3 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-[0_0_16px_rgba(245,158,11,0.35)] transition-all transform active:scale-95 disabled:opacity-40 cursor-pointer"
              title={isPlaying ? 'Pausar' : 'Reproducir'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            {/* Realtime DSP Spectrum Visualizer */}
            <div className="w-44 h-8 bg-[#0b0e16] rounded border border-[#1e2536] overflow-hidden px-1 py-0.5 flex items-center">
              <canvas ref={canvasRef} width={160} height={28} className="w-full h-full" />
            </div>
          </div>

          {/* Time & Progress Scrub Rail with Interactive Seek */}
          <div className="w-full flex items-center space-x-3 text-[10px] font-mono text-zinc-400">
            <span className="w-10 text-right">{formatSec(elapsedSec)}</span>
            <div
              onClick={(e) => {
                if (!activeTrack) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                const totalSec = (activeTrack as any)?.durationSec || 360;
                setElapsedSec(Math.round(ratio * totalSec));
              }}
              className="flex-1 relative h-2 bg-[#171c28] rounded-full overflow-hidden cursor-pointer hover:h-2.5 transition-all group"
              title="Avanzar / Retroceder posición (Seek)"
            >
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-cyan-400 to-amber-400 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (elapsedSec / ((activeTrack as any)?.durationSec || 360)) * 100)}%`
                }}
              />
            </div>
            <span className="w-10 text-left">{activeTrack ? activeTrack.duration : '00:00'}</span>
          </div>
        </div>

        {/* Volume, Crossfade & Playlist Deck */}
        <div className="flex items-center justify-end space-x-4 w-full md:w-1/4">
          {/* Crossfade Deck */}
          <div className="hidden xl:flex items-center space-x-2 px-2.5 py-1 rounded bg-[#0f131d] border border-[#1f2638]">
            <button
              onClick={onToggleCrossfade}
              className={`text-[10px] font-mono uppercase tracking-wider cursor-pointer ${
                crossfadeEnabled ? 'text-amber-400 font-bold' : 'text-zinc-600'
              }`}
            >
              FUNDIDO
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={crossfade}
              disabled={!crossfadeEnabled}
              onChange={e => onCrossfadeChange(parseFloat(e.target.value))}
              className="w-16 accent-amber-500 h-1 bg-[#222b3d] rounded-lg cursor-pointer disabled:opacity-30"
            />
          </div>

          {/* Volume Slider */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onVolumeChange(volume > 0 ? 0 : 0.8)}
              className="text-zinc-400 hover:text-zinc-200 cursor-pointer"
            >
              {volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={e => onVolumeChange(parseFloat(e.target.value))}
              className="w-20 accent-amber-500 h-1 bg-[#222b3d] rounded-lg cursor-pointer"
            />
            <span className="text-[10px] font-mono text-zinc-500 w-8">{Math.round(volume * 100)}%</span>
          </div>

          {/* Playlist Drawer Button */}
          <button
            onClick={() => setShowPlaylistDrawer(!showPlaylistDrawer)}
            className={`p-2 rounded border transition-colors relative cursor-pointer ${
              showPlaylistDrawer
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                : 'bg-[#121622] border-[#222c3e] text-zinc-400 hover:text-zinc-200'
            }`}
            title="Lista de reproducción"
          >
            <ListMusic className="w-4 h-4" />
            {playlist.length > 0 && (
              <span className="absolute -top-1 -right-1 px-1 py-0.2 rounded-full bg-amber-500 text-black text-[9px] font-bold">
                {playlist.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Slide-out Playlist Deck */}
      {showPlaylistDrawer && (
        <div className="absolute bottom-full right-4 mb-2 w-80 max-h-72 bg-[#0c0f17] border border-[#263147] rounded-lg p-3 shadow-2xl overflow-y-auto font-mono text-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1c2333]">
            <span className="font-bold text-amber-400 flex items-center space-x-1.5">
              <ListMusic className="w-3.5 h-3.5" />
              <span>LISTA DE REPRODUCCIÓN ({playlist.length})</span>
            </span>
            <span className="text-[10px] text-zinc-500">FUNDIDO AUTOMÁTICO</span>
          </div>

          {playlist.length === 0 ? (
            <div className="py-6 text-center text-zinc-600 text-[11px]">
              Lista vacía. Pulsa reproducir en cualquier pista.
            </div>
          ) : (
            <div className="space-y-1">
              {playlist.map((item, idx) => (
                <div
                  key={`${item.id}-${idx}`}
                  onClick={() => onSelectPlaylistItem(item)}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                    activeTrack?.id === item.id
                      ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                      : 'hover:bg-[#151b27] text-zinc-300'
                  }`}
                >
                  <div className="truncate mr-2">
                    <div className="font-medium truncate">{item.title}</div>
                    <div className="text-[10px] text-zinc-500">{item.artist}</div>
                  </div>
                  <span className="text-[10px] text-zinc-500">{item.duration}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </footer>
  );
};
