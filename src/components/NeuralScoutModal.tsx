import React, { useState } from 'react';
import { Sparkles, Brain, X, Send, Cpu, Disc3, Layers, CheckCircle2, AlertCircle } from 'lucide-react';
import { Track, LibraryEntry } from '../types';
import { electronBridge } from '../services/electronBridge';

interface NeuralScoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetTrack: Partial<Track | LibraryEntry> | null;
}

export const NeuralScoutModal: React.FC<NeuralScoutModalProps> = ({
  isOpen,
  onClose,
  targetTrack
}) => {
  const [query, setQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunAnalysis = async (customPrompt?: string) => {
    const promptToSend = customPrompt || query || 'Proporciona un análisis arquitectónico sonoro detallado, perfil de energía y recomendaciones de transición armónica.';
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const res = await electronBridge.askNeuralScout(targetTrack || {}, promptToSend);
      if (res.success && res.analysis) {
        setAnalysisResult(res.analysis);
      } else {
        setError(res.error || 'El análisis no devolvió respuesta.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error al comunicar con el motor de inteligencia neural.');
    } finally {
      setIsLoading(false);
    }
  };

  const presetQueries = [
    'Perfil acústico: armónicos de bombo, curvas ácidas 303, saturación de cinta',
    'Objetivos armónicos clave Camelot y puntos de transición en mezclas de 32 compases',
    'Secuenciación de sesión club peak-time (progresión 145-160 BPM)',
    'ADN del subgénero y linaje histórico (Tresor / Berghain / Monnom Black)'
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0b0e15] border border-amber-500/40 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-[0_0_50px_rgba(245,158,11,0.15)] overflow-hidden font-mono">
        {/* Modal Header */}
        <div className="bg-[#0e121c] px-5 py-4 border-b border-[#212a3d] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Brain className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-['Chakra_Petch'] text-base font-bold text-zinc-100 tracking-wider">
                  ARQUITECTO SÓNICO NEURAL
                </span>
                <span className="px-2 py-0.5 text-[10px] rounded bg-amber-500 text-black font-bold">
                  GEMINI 3.1 PRO // PENSAMIENTO AVANZADO
                </span>
              </div>
              <div className="text-xs text-zinc-400">
                Razonamiento musicológico profundo e inteligencia acústica
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-[#182030] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Track Inspection Banner */}
        <div className="bg-[#121623] px-5 py-3 border-b border-[#1c2436] flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <Disc3 className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-xs text-zinc-500">PISTA ANALIZADA:</span>
              <div className="text-sm font-bold text-zinc-100 truncate">
                {targetTrack?.title || 'Catálogo Global Underground'}
              </div>
            </div>
          </div>

          {targetTrack?.genre && (
            <div className="flex items-center space-x-2 text-xs">
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                {targetTrack.genre}
              </span>
              {targetTrack.bpm && (
                <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  {targetTrack.bpm} BPM
                </span>
              )}
            </div>
          )}
        </div>

        {/* Modal Body & Neural Content */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs text-zinc-300">
          {/* Preset Prompts Deck */}
          <div>
            <span className="text-[11px] text-zinc-500 block mb-2 font-semibold">
              CONSULTAS PREDEFINIDAS:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {presetQueries.map((pq, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setQuery(pq);
                    handleRunAnalysis(pq);
                  }}
                  disabled={isLoading}
                  className="text-left p-2.5 rounded-lg bg-[#0e121c] hover:bg-[#161d2c] border border-[#212a3d] hover:border-amber-500/40 text-zinc-300 text-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {pq}
                </button>
              ))}
            </div>
          </div>

          {/* Loading Indicator with Thinking Mode Telemetry */}
          {isLoading && (
            <div className="p-8 rounded-xl bg-[#090b10] border border-amber-500/30 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="space-y-1">
                <p className="font-bold text-amber-400">ACTIVANDO MODO DE RAZONAMIENTO NEURAL PROFUNDO...</p>
                <p className="text-[11px] text-zinc-500">
                  Modelo: gemini-3.1-pro-preview • Nivel de pensamiento: ALTO
                </p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-600/40 text-rose-300 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <span className="font-bold">Aviso del motor neural:</span>
                <p className="text-[11px]">{error}</p>
                <p className="text-[10px] text-zinc-400">
                  (Asegúrate de que GEMINI_API_KEY esté configurada en los Secretos)
                </p>
              </div>
            </div>
          )}

          {/* Output Display */}
          {analysisResult && (
            <div className="p-4 rounded-xl bg-[#080a0f] border border-[#232b3d] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#1b2233] text-zinc-400 text-[11px]">
                <span className="flex items-center space-x-1 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>ANÁLISIS COMPLETADO (gemini-3.1-pro-preview)</span>
                </span>
                <span>NIVEL: RAZONAMIENTO AVANZADO</span>
              </div>
              <div className="whitespace-pre-wrap leading-relaxed font-mono text-zinc-200 text-xs">
                {analysisResult}
              </div>
            </div>
          )}
        </div>

        {/* Query Input Bar */}
        <div className="bg-[#0e121c] p-4 border-t border-[#1f2638] flex items-center space-x-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleRunAnalysis()}
            placeholder="Pregunta al modelo sobre tonos de transición, curvas de filtro 303, ajuste de subgraves..."
            className="flex-1 bg-[#090b10] border border-[#263147] focus:border-amber-500 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none"
          />
          <button
            onClick={() => handleRunAnalysis()}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs font-mono flex items-center space-x-1.5 transition-all disabled:opacity-40 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>ANALIZAR</span>
          </button>
        </div>
      </div>
    </div>
  );
};
