import React from 'react';
import { Radio, Search, Download, Disc3, Settings, ShieldAlert, Cpu, Sparkles, FolderSync } from 'lucide-react';
import { ActiveTab } from '../store/useRadxStore';

interface HeaderNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  activeDownloadsCount: number;
  libraryCount: number;
  onQuickNeuralClick: () => void;
  onScanLibraryClick: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  activeTab,
  setActiveTab,
  activeDownloadsCount,
  libraryCount,
  onQuickNeuralClick,
  onScanLibraryClick
}) => {
  return (
    <header className="bg-[#0b0d13] border-b border-[#1f2433] px-4 py-2.5 flex items-center justify-between select-none sticky top-0 z-40 backdrop-blur-md">
      {/* Brand Identity & System Telemetry */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2.5">
          <div className="relative flex items-center justify-center w-8 h-8 rounded bg-[#131722] border border-[#2a3449] text-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
            <Radio className="w-4 h-4 animate-pulse text-amber-400" />
            <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-['Chakra_Petch'] text-base font-bold tracking-widest text-zinc-100 uppercase">
                RAD <span className="text-amber-500">X</span>
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-mono uppercase rounded bg-[#1c2230] text-amber-400 border border-[#2e394f]">
                v1.0-RC
              </span>
            </div>
            <div className="text-[10px] font-mono tracking-tight text-zinc-500 flex items-center space-x-2">
              <span>INTELIGENCIA SÓNICA</span>
              <span className="text-zinc-700">|</span>
              <span className="text-emerald-400/90 flex items-center space-x-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>EN LÍNEA</span>
              </span>
            </div>
          </div>
        </div>

        {/* System Specs Pill */}
        <div className="hidden lg:flex items-center space-x-3 px-3 py-1 rounded bg-[#0f131c] border border-[#1d2331] text-[11px] font-mono text-zinc-400">
          <span className="flex items-center space-x-1 text-zinc-400">
            <Cpu className="w-3.5 h-3.5 text-amber-500/80" />
            <span>DSP: 48kHz / 32-bit</span>
          </span>
          <span className="text-zinc-700">|</span>
          <span className="text-zinc-400">BÚFER: 256s</span>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <nav className="flex items-center space-x-1 bg-[#090b10] p-1 rounded-lg border border-[#1a202d]">
        <button
          onClick={() => setActiveTab('hunter')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded text-xs font-mono tracking-wider transition-all ${
            activeTab === 'hunter'
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.15)] font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#141924]'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>BUSCADOR</span>
        </button>

        <button
          onClick={() => setActiveTab('scout')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded text-xs font-mono tracking-wider transition-all ${
            activeTab === 'scout'
              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.15)] font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#141924]'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>EXPLORADOR</span>
        </button>

        <button
          onClick={() => setActiveTab('downloads')}
          className={`relative flex items-center space-x-2 px-3.5 py-1.5 rounded text-xs font-mono tracking-wider transition-all ${
            activeTab === 'downloads'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_8px_rgba(160,185,129,0.15)] font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#141924]'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>DESCARGAS</span>
          {activeDownloadsCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500 text-black">
              {activeDownloadsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('library')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded text-xs font-mono tracking-wider transition-all ${
            activeTab === 'library'
              ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30 shadow-[0_0_8px_rgba(168,85,247,0.15)] font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#141924]'
          }`}
        >
          <Disc3 className="w-3.5 h-3.5" />
          <span>BIBLIOTECA</span>
          <span className="text-[10px] text-zinc-500">({libraryCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-mono tracking-wider transition-all ${
            activeTab === 'audit'
              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#141924]'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span>AUDITORÍA</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-[#141924] transition-all ${
            activeTab === 'settings' ? 'text-amber-400 bg-[#161c28]' : ''
          }`}
          title="Configuración"
        >
          <Settings className="w-4 h-4" />
        </button>
      </nav>

      {/* Action shortcuts: Sync & Neural Intelligence */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onScanLibraryClick}
          className="hidden md:flex items-center space-x-1.5 px-2.5 py-1.5 rounded bg-[#131722] hover:bg-[#1b2233] border border-[#263044] text-[11px] font-mono text-zinc-300 transition-colors"
          title="Escanear carpetas de música"
        >
          <FolderSync className="w-3.5 h-3.5 text-amber-400" />
          <span>SINCRONIZAR</span>
        </button>

        <button
          onClick={onQuickNeuralClick}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-gradient-to-r from-amber-500/20 to-cyan-500/20 hover:from-amber-500/30 hover:to-cyan-500/30 border border-amber-500/40 text-xs font-mono font-semibold text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)] transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '8s' }} />
          <span>EXPLORADOR NEURONAL</span>
        </button>
      </div>
    </header>
  );
};
