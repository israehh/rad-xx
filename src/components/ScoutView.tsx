import React, { useState, useEffect } from 'react';
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
  Check,
  Cpu,
  Terminal,
  PlayCircle,
  PauseCircle
} from 'lucide-react';
import { ScoutResult, Track, ScoutSchedulerStatus } from '../types';
import { electronBridge } from '../services/electronBridge';

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
  const [schedulerStatus, setSchedulerStatus] = useState<ScoutSchedulerStatus | null>(null);
  const [schedulerLogs, setSchedulerLogs] = useState<string[]>([]);
  const [isTriggeringScheduler, setIsTriggeringScheduler] = useState(false);
  const [timeUntilNextRun, setTimeUntilNextRun] = useState<string>('--:--');

  const fetchSchedulerData = async () => {
    try {
      const status = await electronBridge.getScoutSchedulerStatus();
      if (status) {
        setSchedulerStatus(status);
        if (Array.isArray(status.recentLogs)) {
          setSchedulerLogs(status.recentLogs);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch scheduler data:', err);
    }
  };

  useEffect(() => {
    fetchSchedulerData();
    const interval = setInterval(fetchSchedulerData, 4000);

    // Listen for live scheduler logs if available
    const unsub = electronBridge.onScoutLog((logLine: string) => {
      setSchedulerLogs(prev => [logLine, ...prev.slice(0, 49)]);
    });

    return () => {
      clearInterval(interval);
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // Update countdown timer to next run
  useEffect(() => {
    if (!schedulerStatus?.nextRunTimestamp) return;

    const timer = setInterval(() => {
      const diffMs = schedulerStatus.nextRunTimestamp - Date.now();
      if (diffMs <= 0) {
        setTimeUntilNextRun('Iniciando...');
      } else {
        const totalSec = Math.floor(diffMs / 1000);
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;
        setTimeUntilNextRun(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [schedulerStatus?.nextRunTimestamp]);

  const handleTriggerCycle = async () => {
    setIsTriggeringScheduler(true);
    try {
      await electronBridge.triggerScoutScheduler();
      await fetchSchedulerData();
    } catch (err) {
      console.error('Trigger cycle failed:', err);
    } finally {
      setIsTriggeringScheduler(false);
    }
  };

  const handleToggleScheduler = async () => {
    if (!schedulerStatus) return;
    const nextState = !schedulerStatus.active;
    try {
      await electronBridge.toggleScoutScheduler(nextState);
      await fetchSchedulerData();
    } catch (err) {
      console.error('Toggle scheduler failed:', err);
    }
  };

  const newDiscoveries = scoutResults.filter(r => r.status === 'new');
  const scoredItems = scoutResults.filter(r => typeof r.trendScore === 'number');
  const avgTrend = scoredItems.length
    ? Math.round(scoredItems.reduce((acc, curr) => acc + (curr.trendScore || 0), 0) / scoredItems.length)
    : null;

  return (
    <div className="space-y-4">
      {/* Autonomous ScoutScheduler 24/7 System Card */}
      <div className="bg-[#090c14] border border-cyan-800/40 rounded-xl p-5 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Cpu className="w-5 h-5 animate-pulse" />
              </span>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-['Chakra_Petch'] text-lg font-bold tracking-wider text-zinc-100 uppercase">
                    SCOUT SCHEDULER AUTÓNOMO 24/7
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-mono rounded border flex items-center space-x-1 ${
                      schedulerStatus?.active
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${schedulerStatus?.active ? 'bg-emerald-400 animate-ping' : 'bg-zinc-600'}`} />
                    <span>{schedulerStatus?.active ? 'SISTEMA AUTÓNOMO ACTIVO' : 'PAUSADO'}</span>
                  </span>
                </div>
                <p className="text-xs font-mono text-zinc-400 mt-0.5">
                  Ciclo continuo de búsqueda, deduplicación con biblioteca, encolado y descarga en disco cada 30 minutos sin intervención manual.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleToggleScheduler}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                schedulerStatus?.active
                  ? 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-amber-400 hover:border-amber-500/40'
                  : 'bg-emerald-950/40 border-emerald-600/40 text-emerald-300 hover:bg-emerald-900/40'
              }`}
            >
              {schedulerStatus?.active ? (
                <>
                  <PauseCircle className="w-4 h-4 text-amber-400" />
                  <span>PAUSAR 24/7</span>
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4 text-emerald-400" />
                  <span>ACTIVAR 24/7</span>
                </>
              )}
            </button>

            <button
              onClick={handleTriggerCycle}
              disabled={isTriggeringScheduler || schedulerStatus?.isRunningCycle}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTriggeringScheduler || schedulerStatus?.isRunningCycle ? 'animate-spin' : ''}`} />
              <span>
                {isTriggeringScheduler || schedulerStatus?.isRunningCycle
                  ? 'EJECUTANDO CICLO...'
                  : 'FORZAR CICLO AHORA'}
              </span>
            </button>
          </div>
        </div>

        {/* Telemetry Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-[#1a2233] text-xs font-mono">
          <div className="bg-[#0e121d] border border-[#1e2638] rounded-lg p-2.5">
            <div className="text-[10px] text-zinc-500">PRÓXIMO BARRIDO</div>
            <div className="text-sm font-bold text-cyan-400 flex items-center space-x-1 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400/80" />
              <span>{timeUntilNextRun}</span>
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Intervalo: {schedulerStatus?.scoutIntervalMinutes || 30} min</div>
          </div>

          <div className="bg-[#0e121d] border border-[#1e2638] rounded-lg p-2.5">
            <div className="text-[10px] text-zinc-500">CICLOS EJECUTADOS</div>
            <div className="text-sm font-bold text-amber-400 mt-0.5">
              #{schedulerStatus?.cycleCount || 0}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Persistente tras reinicios</div>
          </div>

          <div className="bg-[#0e121d] border border-[#1e2638] rounded-lg p-2.5">
            <div className="text-[10px] text-zinc-500">PISTAS ENCOLADAS AUTO</div>
            <div className="text-sm font-bold text-emerald-400 mt-0.5">
              {schedulerStatus?.totalQueuedLifetime || 0} pistas
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Total lifetime</div>
          </div>

          <div className="bg-[#0e121d] border border-[#1e2638] rounded-lg p-2.5">
            <div className="text-[10px] text-zinc-500">FILTRADO DUPLICADOS</div>
            <div className="text-sm font-bold text-emerald-400 mt-0.5 flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>ESTRICTO</span>
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Título / Artista / Archivo / DB</div>
          </div>
        </div>

        {/* Live Autonomous Activity Terminal */}
        <div className="mt-4 pt-3 border-t border-[#1a2233]">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mb-2">
            <span className="flex items-center space-x-1.5 text-zinc-300">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold">CONSOLA DE EVENTOS AUTÓNOMOS RAD X</span>
            </span>
            <span className="text-[10px] text-zinc-500">
              Formatos: [SCOUT] • [QUEUE] • [DOWNLOAD] • [LIBRARY]
            </span>
          </div>

          <div className="bg-[#05070a] border border-[#161d2b] rounded-lg p-2.5 max-h-36 overflow-y-auto space-y-1 font-mono text-[11px] select-text">
            {schedulerLogs.length === 0 ? (
              <div className="text-zinc-600 italic">Esperando primeros registros del ciclo autónomo...</div>
            ) : (
              schedulerLogs.map((logLine, idx) => {
                let badgeColor = 'bg-zinc-800 text-zinc-400 border-zinc-700';
                if (logLine.includes('[SCOUT]')) badgeColor = 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
                else if (logLine.includes('[QUEUE]')) badgeColor = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
                else if (logLine.includes('[DOWNLOAD]')) badgeColor = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
                else if (logLine.includes('[LIBRARY]')) badgeColor = 'bg-purple-500/15 text-purple-400 border-purple-500/30';

                return (
                  <div key={idx} className="flex items-start space-x-2 text-zinc-300 leading-relaxed font-mono">
                    <span className={`px-1.5 py-0.2 text-[9px] rounded border uppercase font-bold flex-shrink-0 ${badgeColor}`}>
                      {logLine.includes('[SCOUT]')
                        ? 'SCOUT'
                        : logLine.includes('[QUEUE]')
                        ? 'QUEUE'
                        : logLine.includes('[DOWNLOAD]')
                        ? 'DOWNLOAD'
                        : logLine.includes('[LIBRARY]')
                        ? 'LIBRARY'
                        : 'RADX'}
                    </span>
                    <span className="truncate">{logLine}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Radar Feed Results Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-zinc-400 px-1">
          <span className="flex items-center space-x-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>RADAR MANUAL & HISTORIAL ({scoutResults.length} PISTAS)</span>
          </span>
          <button
            onClick={onTriggerScan}
            disabled={isScanning}
            className="flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Rastreando...' : 'BARRIDO MANUAL'}</span>
          </button>
        </div>

        <div className="space-y-2.5">
          {scoutResults.map(item => {
            const isTopTier = item.trendScore !== null && item.trendScore !== undefined && item.trendScore >= 90;

            return (
              <div
                key={item.id}
                className="bg-[#0c0f17] border border-[#1b2233] hover:border-[#2b354d] rounded-xl p-4 transition-all hover:bg-[#10141f] flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                {/* Left: Thumbnail & Essential Data */}
                <div className="flex items-center space-x-4 min-w-0 flex-1">
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-black border border-[#222b3f] flex items-center justify-center">
                    {item.thumbnail ? (
                      <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <Radio className="w-8 h-8 text-zinc-600" />
                    )}
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
                      {item.genre && (
                        <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                          {item.genre}
                        </span>
                      )}
                      {isTopTier && (
                        <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                          <Zap className="w-2.5 h-2.5" />
                          <span>VIRAL</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-3 text-xs font-mono text-zinc-400">
                      <span>{item.artist || 'Desconocido'}</span>
                      {item.channel && (
                        <>
                          <span>•</span>
                          <span className="text-zinc-500">{item.channel}</span>
                        </>
                      )}
                      {item.duration && (
                        <>
                          <span>•</span>
                          <span>{item.duration}</span>
                        </>
                      )}
                      {item.bpm && (
                        <>
                          <span>•</span>
                          <span className="text-amber-400 font-bold">{item.bpm} BPM</span>
                        </>
                      )}
                    </div>

                    {item.classificationNotes && (
                      <p className="text-[11px] font-mono text-zinc-400/80 line-clamp-1 italic">
                        "{item.classificationNotes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Trend Score & Action Decks */}
                <div className="flex items-center space-x-4 self-end md:self-center">
                  <div className="text-right font-mono">
                    <div className="text-[10px] text-zinc-500 flex items-center space-x-1 justify-end">
                      <TrendingUp className="w-3 h-3 text-cyan-400" />
                      <span>TENDENCIA</span>
                    </div>
                    <div className="text-base font-bold text-amber-400">
                      {item.trendScore !== null && item.trendScore !== undefined ? `${item.trendScore} / 100` : 'Real Live'}
                    </div>
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
