import React from 'react';
import {
  Search,
  Play,
  PlusCircle,
  Download,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  Radio,
  SlidersHorizontal,
  Flame
} from 'lucide-react';
import { Genre, Track, LibraryEntry } from '../types';

interface HunterViewProps {
  selectedGenre: Genre;
  onSelectGenre: (genre: Genre) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  tracks: Track[];
  isLoading: boolean;
  activeTrackId?: string;
  onPlay: (track: Track) => void;
  onAddToQueue: (track: Track, format: string) => void;
  onDownload: (track: Track, format: string) => void;
  onNeuralScout: (track: Track) => void;
}

const GENRES: Genre[] = [
  'Industrial Techno',
  'Hard Techno',
  'Dark Techno',
  'Peak Time Techno',
  'Minimal Techno',
  'EBM',
  'Synthwave',
  'Custom'
];

export const HunterView: React.FC<HunterViewProps> = ({
  selectedGenre,
  onSelectGenre,
  searchQuery,
  onSearchChange,
  tracks,
  isLoading,
  activeTrackId,
  onPlay,
  onAddToQueue,
  onDownload,
  onNeuralScout
}) => {
  return (
    <div className="space-y-4">
      {/* Top Banner & Search Matrix */}
      <div className="bg-[#0e111a] border border-[#1f2638] rounded-xl p-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-['Chakra_Petch'] text-lg font-bold tracking-wider text-zinc-100 uppercase">
                BUSCADOR <span className="text-amber-500">// EXTRACCIÓN Y EXPLORACIÓN</span>
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                ÍNDICE ACTIVO
              </span>
            </div>
            <p className="text-xs font-mono text-zinc-400 mt-0.5">
              Búsqueda selectiva en archivos underground a través de 8 disciplinas sónicas.
            </p>
          </div>

          {/* Quick Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="Buscar por artista, pista, sello..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#090b10] border border-[#232b3d] focus:border-amber-500/60 rounded-lg text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
            />
          </div>
        </div>

        {/* FASE 4 Mandated Genre Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-[#181e2b] pt-3 scrollbar-none">
          {GENRES.map(genre => {
            const isSelected = selectedGenre === genre;
            return (
              <button
                key={genre}
                onClick={() => onSelectGenre(genre)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono tracking-wider whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-amber-500 text-black font-bold shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                    : 'bg-[#121622] hover:bg-[#181e2e] text-zinc-400 hover:text-zinc-200 border border-[#202738]'
                }`}
              >
                <span>{genre}</span>
                {genre === 'Industrial Techno' && <Flame className="w-3 h-3" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between px-1 text-xs font-mono text-zinc-400">
        <div className="flex items-center space-x-2">
          <Layers className="w-3.5 h-3.5 text-amber-500" />
          <span>
            MOSTRANDO <strong className="text-zinc-200">{tracks.length}</strong> PISTAS DE{' '}
            <strong className="text-amber-400">{selectedGenre.toUpperCase()}</strong>
          </span>
        </div>
        <span className="text-[11px] text-zinc-500 hidden sm:inline">
          TASA DE BITS: 320 KBPS MP3 / OPUS WEBM / FLAC
        </span>
      </div>

      {/* Tracks Grid */}
      {isLoading ? (
        <div className="py-20 text-center font-mono text-xs text-zinc-500 space-y-2">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p>ESCANEANDO FRECUENCIAS UNDERGROUND...</p>
        </div>
      ) : tracks.length === 0 ? (
        <div className="bg-[#0d1017] border border-[#1e2434] rounded-xl p-12 text-center font-mono text-xs text-zinc-500">
          No se encontraron pistas con los parámetros indicados en el archivo de {selectedGenre}.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {tracks.map(track => {
            const isPlayingThis = activeTrackId === track.id;

            return (
              <div
                key={track.id}
                className={`group relative bg-[#0b0e16] border rounded-xl p-3.5 transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.5)] ${
                  isPlayingThis
                    ? 'border-amber-500/60 bg-[#121622] shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                    : 'border-[#1b2233] hover:border-[#2b354d]'
                }`}
              >
                {/* Visual Thumbnail & Duration */}
                <div className="relative aspect-video rounded-lg bg-[#07090e] overflow-hidden mb-3 border border-[#1e2436] flex items-center justify-center">
                  {track.thumbnail ? (
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <Radio className="w-10 h-10 text-zinc-700" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Play Overlay Button */}
                  <button
                    onClick={() => onPlay(track)}
                    className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-black/60 hover:bg-amber-500 hover:text-black border border-amber-500/40 text-amber-400 flex items-center justify-center transition-all opacity-90 group-hover:opacity-100 group-hover:scale-110 shadow-lg cursor-pointer"
                    title="Previsualizar audio"
                  >
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </button>

                  {/* Top Badges: Queued / Downloaded */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 flex-wrap">
                    {track.isDownloaded && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/90 text-black flex items-center space-x-1 shadow-md">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>YA DESCARGADO</span>
                      </span>
                    )}

                    {track.isQueued && !track.isDownloaded && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/90 text-black flex items-center space-x-1 shadow-md">
                        <Clock className="w-3 h-3" />
                        <span>YA EN COLA</span>
                      </span>
                    )}
                  </div>

                  {/* Duration & Views Bottom Badges */}
                  {track.duration && (
                    <div className="absolute bottom-2 right-2 flex items-center space-x-2 text-[10px] font-mono bg-black/80 px-2 py-0.5 rounded border border-white/10 text-zinc-300">
                      <span>{track.duration}</span>
                    </div>
                  )}

                  {track.bpm && (
                    <div className="absolute bottom-2 left-2 text-[10px] font-mono bg-black/80 px-2 py-0.5 rounded border border-amber-500/30 text-amber-400">
                      {track.bpm} BPM{track.key ? ` // ${track.key}` : ''}
                    </div>
                  )}
                </div>

                {/* Track Title & Artist Metadata */}
                <div className="space-y-1 mb-3">
                  <h3 className="text-sm font-semibold font-mono text-zinc-100 line-clamp-1 group-hover:text-amber-400 transition-colors">
                    {track.title}
                  </h3>
                  <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                    <span className="truncate">{track.artist || 'Desconocido'}</span>
                    <span className="text-[10px] text-zinc-500 flex-shrink-0">{track.channel || ''}</span>
                  </div>
                </div>

                {/* Mandated Action Buttons: Add to Queue, Download MP3, Download WEBM */}
                <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-[#181e2b]">
                  <button
                    onClick={() => onAddToQueue(track, 'MP3')}
                    className="flex items-center justify-center space-x-1 px-2 py-1.5 rounded bg-[#131722] hover:bg-[#1b2233] border border-[#232c3f] hover:border-amber-500/40 text-[10px] font-mono text-zinc-300 hover:text-amber-400 transition-all cursor-pointer"
                    title="Añadir a la cola"
                  >
                    <PlusCircle className="w-3 h-3" />
                    <span>COLA</span>
                  </button>

                  <button
                    onClick={() => onDownload(track, 'MP3')}
                    className="flex items-center justify-center space-x-1 px-2 py-1.5 rounded bg-[#131722] hover:bg-[#1b2233] border border-[#232c3f] hover:border-emerald-500/40 text-[10px] font-mono text-zinc-300 hover:text-emerald-400 transition-all cursor-pointer"
                    title="Descargar MP3 a 320 kbps"
                  >
                    <Download className="w-3 h-3" />
                    <span>MP3</span>
                  </button>

                  <button
                    onClick={() => onDownload(track, 'WEBM')}
                    className="flex items-center justify-center space-x-1 px-2 py-1.5 rounded bg-[#131722] hover:bg-[#1b2233] border border-[#232c3f] hover:border-cyan-500/40 text-[10px] font-mono text-zinc-300 hover:text-cyan-400 transition-all cursor-pointer"
                    title="Descargar WEBM en alta resolución"
                  >
                    <Download className="w-3 h-3" />
                    <span>WEBM</span>
                  </button>
                </div>

                {/* AI Deep Sonic Analysis Trigger */}
                <button
                  onClick={() => onNeuralScout(track)}
                  className="mt-2 w-full flex items-center justify-center space-x-1.5 py-1 rounded bg-[#0f131d] hover:bg-amber-500/10 border border-[#1b2130] hover:border-amber-500/30 text-[10px] font-mono text-zinc-400 hover:text-amber-300 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>ANÁLISIS NEURONAL (MODO RAZONAMIENTO)</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
