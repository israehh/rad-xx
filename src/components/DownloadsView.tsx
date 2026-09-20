import React from 'react';
import {
  Download,
  Pause,
  Play,
  XCircle,
  RotateCcw,
  CheckCircle2,
  Trash2,
  Clock,
  HardDrive,
  Activity,
  Layers,
  ListOrdered
} from 'lucide-react';
import { DownloadJob, QueueItem } from '../types';

interface DownloadsViewProps {
  downloadJobs: DownloadJob[];
  queueItems: QueueItem[];
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  onRetry?: (id: string) => void;
  onClearFinished: () => void;
  onRemoveFromQueue: (id: string) => void;
}

export const DownloadsView: React.FC<DownloadsViewProps> = ({
  downloadJobs,
  queueItems,
  onPause,
  onResume,
  onCancel,
  onRetry,
  onClearFinished,
  onRemoveFromQueue
}) => {
  const activeDownloads = downloadJobs.filter(j => j.status === 'Downloading');
  const queuedDownloads = downloadJobs.filter(j => j.status === 'Queued');
  const finishedDownloads = downloadJobs.filter(j => j.status === 'Finished');

  return (
    <div className="space-y-6">
      {/* Telemetry Header */}
      <div className="bg-[#0b0e15] border border-[#1d2332] rounded-xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-['Chakra_Petch'] text-lg font-bold tracking-wider text-zinc-100 uppercase">
              GESTOR DE DESCARGAS <span className="text-emerald-400">// PROCESAMIENTO</span>
            </span>
            <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              PERSISTENCIA ACTIVA
            </span>
          </div>
          <p className="text-xs font-mono text-zinc-400 mt-0.5">
            Flujo en tiempo real con recuperación automática del estado en JSON tras reiniciar la aplicación.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-4 px-3 py-1.5 rounded-lg bg-[#0f131f] border border-[#1f2638] text-xs font-mono">
            <div>
              <span className="text-zinc-500 text-[10px]">ACTIVAS: </span>
              <span className="text-emerald-400 font-bold">{activeDownloads.length}</span>
            </div>
            <div className="h-4 w-px bg-zinc-800" />
            <div>
              <span className="text-zinc-500 text-[10px]">COMPLETADAS: </span>
              <span className="text-zinc-200 font-bold">{finishedDownloads.length}</span>
            </div>
          </div>

          <button
            onClick={onClearFinished}
            disabled={finishedDownloads.length === 0}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#151a26] hover:bg-[#1f2637] border border-[#232c3f] text-xs font-mono text-zinc-400 hover:text-zinc-200 disabled:opacity-30 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>LIMPIAR COMPLETADAS</span>
          </button>
        </div>
      </div>

      {/* Active & Historical Download Jobs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-zinc-400 px-1">
          <span className="flex items-center space-x-2">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>COLA DE DESCARGAS ({downloadJobs.length} TAREAS)</span>
          </span>
          <span className="text-[11px] text-zinc-500">DESCARGAS SIMULTÁNEAS: 3 MÁXIMO</span>
        </div>

        {downloadJobs.length === 0 ? (
          <div className="bg-[#0b0e15] border border-[#1b212f] rounded-xl p-10 text-center font-mono text-xs text-zinc-500">
            No hay descargas activas. Utiliza el Buscador o el Explorador para enviar pistas a la cola.
          </div>
        ) : (
          <div className="space-y-2.5">
            {downloadJobs.map(job => {
              const isDownloading = job.status === 'Downloading';
              const isFinished = job.status === 'Finished';
              const isPaused = job.status === 'Paused';

              const statusLabels: Record<string, string> = {
                Downloading: 'DESCARGANDO',
                Finished: 'COMPLETADO',
                Paused: 'PAUSADO',
                Queued: 'EN COLA',
                Failed: 'ERROR'
              };

              return (
                <div
                  key={job.id}
                  className="bg-[#0c0f17] border border-[#1b2233] rounded-xl p-3.5 transition-all space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="w-12 h-12 rounded bg-black border border-[#212a3d] overflow-hidden flex-shrink-0">
                        <img src={job.thumbnail} alt={job.title} className="w-full h-full object-cover" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-semibold font-mono text-zinc-100 truncate">
                            {job.title}
                          </span>
                          <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                            {job.format}
                          </span>
                        </div>
                        <div className="text-xs font-mono text-zinc-500 truncate">
                          <span>{job.artist}</span> • <span>{job.genre}</span> •{' '}
                          <span className="text-zinc-600">{job.targetPath}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Pill & Control Actions */}
                    <div className="flex items-center space-x-3 flex-shrink-0">
                      <span
                        className={`px-2.5 py-1 rounded text-xs font-mono font-bold flex items-center space-x-1 ${
                          isFinished
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : isDownloading
                            ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 animate-pulse'
                            : isPaused
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}
                      >
                        {isFinished && <CheckCircle2 className="w-3.5 h-3.5" />}
                        <span>{statusLabels[job.status] || job.status.toUpperCase()}</span>
                      </span>

                      <div className="flex items-center space-x-1">
                        {isDownloading && (
                          <button
                            onClick={() => onPause(job.id)}
                            className="p-1.5 rounded bg-[#151a27] hover:bg-[#1f2638] text-zinc-300 border border-[#222b3d] cursor-pointer"
                            title="Pausar"
                          >
                            <Pause className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {isPaused && (
                          <button
                            onClick={() => onResume(job.id)}
                            className="p-1.5 rounded bg-[#151a27] hover:bg-[#1f2638] text-emerald-400 border border-[#222b3d] cursor-pointer"
                            title="Reanudar"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                        )}

                        {(job.status === 'Failed' || job.status === 'Finished' || job.status === 'Paused') && onRetry && (
                          <button
                            onClick={() => onRetry(job.id)}
                            className="p-1.5 rounded bg-[#151a27] hover:bg-[#1f2638] text-amber-400 border border-[#222b3d] cursor-pointer"
                            title="Reiniciar descarga"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => onCancel(job.id)}
                          className="p-1.5 rounded bg-[#151a27] hover:bg-[#25171e] text-zinc-400 hover:text-rose-400 border border-[#222b3d] cursor-pointer"
                          title="Cancelar y eliminar"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar & Telemetry Bar */}
                  <div className="space-y-1.5 font-mono text-[11px]">
                    <div className="flex items-center justify-between text-zinc-400">
                      <div className="flex items-center space-x-3">
                        <span className="text-zinc-200 font-bold">{job.progress.percentage}%</span>
                        <span className="text-zinc-600">|</span>
                        <span>VELOCIDAD: {job.progress.speed}</span>
                        <span className="text-zinc-600">|</span>
                        <span>TIEMPO: {job.progress.eta}</span>
                      </div>
                      <span>
                        {job.progress.sizeFormatted} ({job.quality})
                      </span>
                    </div>

                    <div className="h-1.5 w-full bg-[#161c28] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isFinished
                            ? 'bg-emerald-500'
                            : isPaused
                            ? 'bg-amber-500'
                            : 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                        }`}
                        style={{ width: `${job.progress.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Auxiliary Waiting Queue Section */}
      <div className="space-y-3 pt-4 border-t border-[#181e2b]">
        <div className="flex items-center justify-between text-xs font-mono text-zinc-400 px-1">
          <span className="flex items-center space-x-2">
            <ListOrdered className="w-3.5 h-3.5 text-amber-400" />
            <span>COLA DE ESPERA ({queueItems.length} PISTAS PENDIENTES)</span>
          </span>
        </div>

        {queueItems.length === 0 ? (
          <div className="bg-[#0a0d14] border border-[#161c28] rounded-xl p-6 text-center font-mono text-xs text-zinc-600">
            La cola de espera está vacía.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {queueItems.map((item, idx) => (
              <div
                key={item.id}
                className="bg-[#0b0e16] border border-[#1a2130] rounded-lg p-2.5 flex items-center justify-between text-xs font-mono"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <span className="text-zinc-500 font-bold w-4">#{idx + 1}</span>
                  <div className="w-8 h-8 rounded bg-black overflow-hidden flex-shrink-0">
                    <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="truncate">
                    <div className="text-zinc-200 truncate font-medium">{item.title}</div>
                    <div className="text-[10px] text-zinc-500">{item.genre} • {item.format}</div>
                  </div>
                </div>

                <button
                  onClick={() => onRemoveFromQueue(item.id)}
                  className="p-1 rounded text-zinc-500 hover:text-rose-400 transition-colors ml-2 cursor-pointer"
                  title="Eliminar de la cola"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
