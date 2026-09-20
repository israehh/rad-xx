import React, { useState } from 'react';
import {
  Disc3,
  Search,
  FolderSync,
  Play,
  Trash2,
  Sparkles,
  HardDrive,
  FileAudio,
  FolderTree,
  SlidersHorizontal
} from 'lucide-react';
import { LibraryEntry } from '../types';

interface LibraryViewProps {
  tracks: LibraryEntry[];
  isScanning: boolean;
  filterFormat: string;
  onFilterFormatChange: (fmt: string) => void;
  onScanDirectories: () => void;
  onPlayTrack: (track: LibraryEntry) => void;
  onDeleteTrack: (id: string) => void;
  onOpenNeuralScout: (track: LibraryEntry) => void;
  activeTrackId?: string;
}

const FORMATS = ['TODOS', 'MP3', 'FLAC', 'WAV', 'M4A', 'WEBM'];

export const LibraryView: React.FC<LibraryViewProps> = ({
  tracks,
  isScanning,
  filterFormat,
  onFilterFormatChange,
  onScanDirectories,
  onPlayTrack,
  onDeleteTrack,
  onOpenNeuralScout,
  activeTrackId
}) => {
  const [searchFilter, setSearchFilter] = useState('');

  const currentFmt = filterFormat === 'ALL' ? 'TODOS' : filterFormat;

  const filtered = tracks.filter(t => {
    const matchesFormat =
      currentFmt === 'TODOS' ||
      currentFmt === 'ALL' ||
      t.format.toUpperCase() === currentFmt;
    const q = searchFilter.toLowerCase().trim();
    const matchesSearch =
      !q ||
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      t.genre.toLowerCase().includes(q);
    return matchesFormat && matchesSearch;
  });

  const totalSizeMb = (
    tracks.reduce((acc, curr) => acc + (curr.fileSize || 0), 0) /
    (1024 * 1024)
  ).toFixed(1);

  return (
    <div className="space-y-4">
      {/* Control Header & Stats */}
      <div className="bg-[#0b0e16] border border-[#1d2332] rounded-xl p-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-['Chakra_Petch'] text-lg font-bold tracking-wider text-zinc-100 uppercase">
                BIBLIOTECA <span className="text-purple-400">// CATÁLOGO EN DISCO</span>
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-purple-500/10 text-purple-400 border border-purple-500/30">
                SINCRONIZADO
              </span>
            </div>
            <p className="text-xs font-mono text-zinc-400 mt-0.5">
              Monitorizando los directorios <code className="text-purple-300">C:\Music</code> y{' '}
              <code className="text-purple-300">C:\Music\Scout</code> para archivos de audio.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-3 px-3 py-1.5 rounded-lg bg-[#0f131f] border border-[#1f2638] text-xs font-mono">
              <div>
                <span className="text-zinc-500 text-[10px]">DISCO TOTAL: </span>
                <span className="text-amber-400 font-bold">{totalSizeMb} MB</span>
              </div>
              <div className="h-4 w-px bg-zinc-800" />
              <div>
                <span className="text-zinc-500 text-[10px]">PISTAS: </span>
                <span className="text-zinc-200 font-bold">{tracks.length}</span>
              </div>
            </div>

            <button
              onClick={onScanDirectories}
              disabled={isScanning}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-mono font-bold text-xs shadow-[0_0_16px_rgba(168,85,247,0.3)] transition-all disabled:opacity-50 cursor-pointer"
            >
              <FolderSync className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'INDEXANDO DISCO...' : 'SINCRONIZAR DIRECTORIOS'}</span>
            </button>
          </div>
        </div>

        {/* Search & Format Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#191f2c]">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              placeholder="Buscar en la biblioteca..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#080a0f] border border-[#212a3d] focus:border-purple-500/60 rounded-lg text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <span className="text-[10px] font-mono text-zinc-500 mr-1 flex items-center space-x-1">
              <SlidersHorizontal className="w-3 h-3" />
              <span>FORMATO:</span>
            </span>
            {FORMATS.map(fmt => (
              <button
                key={fmt}
                onClick={() => onFilterFormatChange(fmt === 'TODOS' ? 'ALL' : fmt)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all cursor-pointer ${
                  (currentFmt === fmt || (fmt === 'TODOS' && currentFmt === 'ALL'))
                    ? 'bg-purple-500 text-black font-bold'
                    : 'bg-[#121622] text-zinc-400 hover:text-zinc-200 border border-[#202738]'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Library Table Listing */}
      <div className="bg-[#0b0e16] border border-[#1d2332] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs text-zinc-300">
            <thead className="bg-[#0f131f] text-zinc-500 uppercase text-[10px] tracking-wider border-b border-[#1c2333]">
              <tr>
                <th className="py-2.5 px-4">#</th>
                <th className="py-2.5 px-4">TÍTULO DE LA PISTA</th>
                <th className="py-2.5 px-4">ARTISTA / ÁLBUM</th>
                <th className="py-2.5 px-4">GÉNERO</th>
                <th className="py-2.5 px-4">BPM / TONO</th>
                <th className="py-2.5 px-4">FORMATO</th>
                <th className="py-2.5 px-4">TAMAÑO</th>
                <th className="py-2.5 px-4 text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#171d2a]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500">
                    No se encontraron registros en la biblioteca con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filtered.map((entry, index) => {
                  const isPlayingThis = activeTrackId === entry.id;

                  return (
                    <tr
                      key={entry.id}
                      className={`hover:bg-[#131824] transition-colors ${
                        isPlayingThis ? 'bg-[#171e2e] text-purple-300' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-zinc-500 w-8">{index + 1}</td>
                      <td className="py-3 px-4 font-semibold text-zinc-100 flex items-center space-x-2">
                        <button
                          onClick={() => onPlayTrack(entry)}
                          className="w-7 h-7 rounded bg-[#161d2b] hover:bg-purple-500 hover:text-black text-purple-400 flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer"
                          title="Reproducir pista"
                        >
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        </button>
                        <div className="truncate max-w-xs sm:max-w-sm">
                          <div className="truncate">{entry.title}</div>
                          <div className="text-[10px] text-zinc-500 font-normal truncate">
                            {entry.fileName}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-zinc-400">
                        <div>{entry.artist}</div>
                        <div className="text-[10px] text-zinc-600">{entry.album || 'Sencillo'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {entry.genre}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-amber-400">
                        {entry.bpm ? `${entry.bpm} BPM` : '--'}
                        {entry.key ? ` // ${entry.key}` : ''}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30">
                          {entry.format}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-400">{entry.fileSizeFormatted}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => onOpenNeuralScout(entry)}
                            className="p-1.5 rounded bg-[#151a26] hover:bg-purple-500/20 text-purple-400 border border-[#232c3f] cursor-pointer"
                            title="Análisis sónico neuronal"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteTrack(entry.id)}
                            className="p-1.5 rounded bg-[#151a26] hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 border border-[#232c3f] cursor-pointer"
                            title="Eliminar de la biblioteca"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
