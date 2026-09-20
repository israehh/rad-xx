import React from 'react';
import {
  Radio,
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  Play,
  Download,
  PlusCircle,
  Clock,
  Sparkles,
  Zap,
  Activity,
  Check
} from 'lucide-react';
import { ScoutResult, Track } from '../types';

interface ScoutViewProps {
  scoutResults: ScoutResult[];
  isScanning: boolean;
  onTriggerScan: () => void;
  onPlayTrack: (track: any) => void;
  onAddToQueue: (track: any, format: string) => void;
  onDownload: (track: any, format: string) => void;
  onOpenNeuralScout: (track: any) => void;
}

export const ScoutView: React.FC<ScoutViewProps> = ({
  scoutResults,
  isScanning,
  onTriggerScan,
  onPlayTrack,
  onAddToQueue,
  onDownload,
  onOpenNeuralScout
}) => {
  const newDiscoveries = scoutResults.filter(r => r.status === 'new');
  const avgTrend = scoutResults.length
    ? Math.round(scoutResults.reduce((acc, curr) => acc + curr.trendScore, 0) / scoutResults.length)
    : 0;

  return (
    <div className="space-y-4">
      {/* Radar Control Terminal Banner */}
      <div className="bg-[#0b0e16] border border-[#1d2435] rounded-xl p-5 shadow-xl relative overflow-hidden">
        {/* Ambient Radar Background Graphic */}
        <div className="absolute -right-16 -top-16 w-64 h-64 border border-cyan-500/10 rounded-full pointer-events-none animate-ping" style={{ animationDuration: '6s' }} />
        <div className="absolute -right-8 -top-8 w-48 h-48 border border-cyan-500/20 rounded-full pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-['Chakra_Petch'] text-lg font-bold tracking-wider text-zinc-100 uppercase">
                EXPLORADOR <span className="text-cyan-400">// RASTREO AUTOMATIZADO</span>
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                ACTIVO
              </span>
            </div>
            <p className="text-xs font-mono text-zinc-400 mt-1 max-w-2xl">
              Rastreador automatizado continuo que explora archivos rave europeos, canales de música y cintas underground. Descarta automáticamente pistas que ya existan en tu biblioteca.
            </p>
          </div>

          {/* Radar Metrics & Sweep Action */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 bg-[#0f131f] border border-[#20293d] px-3.5 py-2 rounded-lg text-xs font-mono">
              <div>
                <div className="text-[10px] text-zinc-500">TENDENCIA MEDIA</div>
                <div className="text-sm font-bold text-amber-400">{avgTrend}%</div>
              </div>
              <div className="h-6 w-px bg-[#263147]" />
              <div>
                <div className="text-[10px] text-zinc-500">NUEVAS DETECCIONES</div>
                <div className="text-sm font-bold text-cyan-400">{newDiscoveries.length}</div>
              </div>
            </div>

            <button
              onClick={onTriggerScan}
              disabled={isScanning}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 text-black font-mono font-bold text-xs shadow-[0_0_16px_rgba(6,182,212,0.3)] transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'EXPLORANDO FRECUENCIAS...' : 'INICIAR RASTREO'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Radar Feed Results */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-zinc-400 px-1">
          <span className="flex items-center space-x-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>REGISTRO DE DETECCIONES ({scoutResults.length} PISTAS)</span>
          </span>
          <span className="text-zinc-500 text-[11px]">FILTRADO DE DUPLICADOS: ACTIVO</span>
        </div>

        <div className="space-y-2.5">
          {scoutResults.map(item => {
            const isTopTier = item.trendScore >= 90;

            return (
              <div
                key={item.id}
                className="bg-[#0c0f17] border border-[#1b2233] hover:border-[#2b354d] rounded-xl p-4 transition-all hover:bg-[#10141f] flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                {/* Left: Thumbnail & Essential Data */}
                <div className="flex items-center space-x-4 min-w-0 flex-1">
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-black border border-[#222b3f]">
                    <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                    <button
                      onClick={() => onPlayTrack(item)}
                      className="absolute inset-0 m-auto w-8 h-8 rounded-full bg-black/70 hover:bg-cyan-500 hover:text-black text-cyan-400 border border-cyan-500/40 flex items-center justify-center transition-all cursor-pointer"
                      title="Reproducir audio"
                    >
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </button>
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold font-mono text-zinc-100 truncate">
                        {item.title}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                        {item.genre}
                      </span>
                      {isTopTier && (
                        <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                          <Zap className="w-2.5 h-2.5" />
                          <span>VIRAL</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-3 text-xs font-mono text-zinc-400">
                      <span>{item.artist}</span>
                      <span>•</span>
                      <span className="text-zinc-500">{item.channel}</span>
                      <span>•</span>
                      <span>{item.duration}</span>
                      {item.bpm && (
                        <>
                          <span>•</span>
                          <span className="text-amber-400 font-bold">{item.bpm} BPM</span>
                        </>
                      )}
                    </div>

                    <p className="text-[11px] font-mono text-zinc-400/80 line-clamp-1 italic">
                      "{item.classificationNotes}"
                    </p>
                  </div>
                </div>

                {/* Right: Trend Score & Action Decks */}
                <div className="flex items-center space-x-4 self-end md:self-center">
                  <div className="text-right font-mono">
                    <div className="text-[10px] text-zinc-500 flex items-center space-x-1 justify-end">
                      <TrendingUp className="w-3 h-3 text-cyan-400" />
                      <span>TENDENCIA</span>
                    </div>
                    <div className="text-base font-bold text-amber-400">{item.trendScore} / 100</div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onAddToQueue(item, 'MP3')}
                      className="p-2 rounded bg-[#141924] hover:bg-[#1d2435] border border-[#232c3f] text-zinc-300 hover:text-amber-400 transition-colors cursor-pointer"
                      title="Añadir a la cola"
                    >
                      <PlusCircle className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onDownload(item, 'MP3')}
                      className="px-3 py-1.5 rounded bg-[#141924] hover:bg-[#1d2435] border border-[#232c3f] hover:border-emerald-500/40 text-xs font-mono text-emerald-400 flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>DESCARGAR MP3</span>
                    </button>

                    <button
                      onClick={() => onOpenNeuralScout(item)}
                      className="p-2 rounded bg-[#141924] hover:bg-amber-500/20 border border-[#232c3f] hover:border-amber-500/40 text-amber-400 transition-colors cursor-pointer"
                      title="Análisis sónico neuronal"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
