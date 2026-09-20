import React, { useState } from 'react';
import {
  Settings,
  Folder,
  Sliders,
  ShieldCheck,
  HardDrive,
  Save,
  DownloadCloud,
  CheckCircle2,
  Lock,
  Cpu
} from 'lucide-react';
import { SettingsConfig } from '../types';
import { electronBridge } from '../services/electronBridge';

interface SettingsViewProps {
  settings: SettingsConfig;
  onUpdateSettings: (newSettings: SettingsConfig) => void;
  onAddToast: (text: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onAddToast
}) => {
  const [form, setForm] = useState<SettingsConfig>({ ...settings });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await electronBridge.updateSettings(form);
      onUpdateSettings(updated);
      onAddToast('Configuración guardada correctamente en settings.json', 'success');
    } catch (err) {
      onAddToast('Error al guardar la configuración', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(form, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'radx_configuracion_backup.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onAddToast('Copia de seguridad descargada', 'info');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-mono">
      {/* Header */}
      <div className="bg-[#0b0e15] border border-[#1d2332] rounded-xl p-5 shadow-xl flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-['Chakra_Petch'] text-lg font-bold tracking-wider text-zinc-100 uppercase">
              CONFIGURACIÓN DEL MOTOR RAD X
            </span>
            <span className="px-2 py-0.5 text-[10px] rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
              ESCRITORIO
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Configuración de rutas de almacenamiento, descargas simultáneas, fundido cruzado DSP y parámetros del sistema.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-all disabled:opacity-50 cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isSaving ? 'GUARDANDO...' : 'GUARDAR CONFIGURACIÓN'}</span>
        </button>
      </div>

      {/* Directory Routing */}
      <div className="bg-[#0c0f17] border border-[#1b2233] rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-zinc-200 flex items-center space-x-2 pb-2 border-b border-[#181f2d]">
          <Folder className="w-4 h-4 text-amber-400" />
          <span>RUTAS DE DIRECTORIOS Y PERSISTENCIA</span>
        </h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 block mb-1">
              Directorio principal de música (C:\Music)
            </label>
            <input
              type="text"
              value={form.musicDirectory}
              onChange={e => setForm({ ...form, musicDirectory: e.target.value })}
              className="w-full bg-[#080a0f] border border-[#232b3d] rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
            />
            <span className="text-[10px] text-zinc-500">
              Directorio predeterminado monitorizado para pistas de la biblioteca (C:\Music).
            </span>
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1">
              Directorio del Explorador automático (C:\Music\Scout)
            </label>
            <input
              type="text"
              value={form.scoutDirectory}
              onChange={e => setForm({ ...form, scoutDirectory: e.target.value })}
              className="w-full bg-[#080a0f] border border-[#232b3d] rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
            />
            <span className="text-[10px] text-zinc-500">
              Directorio de destino para pistas capturadas automáticamente por el Explorador (C:\Music\Scout).
            </span>
          </div>
        </div>
      </div>

      {/* Pipeline & DSP Audio Settings */}
      <div className="bg-[#0c0f17] border border-[#1b2233] rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-zinc-200 flex items-center space-x-2 pb-2 border-b border-[#181f2d]">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span>FLUJO DE DESCARGA Y REPRODUCCIÓN DSP</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-zinc-400 block mb-1">Descargas simultáneas máximas</label>
            <select
              value={form.maxConcurrentDownloads}
              onChange={e => setForm({ ...form, maxConcurrentDownloads: parseInt(e.target.value, 10) })}
              className="w-full bg-[#080a0f] border border-[#232b3d] rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-cyan-500"
            >
              <option value={1}>1 descarga (Ancho de banda bajo)</option>
              <option value={2}>2 descargas</option>
              <option value={3}>3 descargas (Recomendado)</option>
              <option value={5}>5 descargas (Ancho de banda alto)</option>
            </select>
          </div>

          <div>
            <label className="text-zinc-400 block mb-1">Formato de audio preferido</label>
            <select
              value={form.preferredFormat}
              onChange={e => setForm({ ...form, preferredFormat: e.target.value as any })}
              className="w-full bg-[#080a0f] border border-[#232b3d] rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="MP3">MP3 (320 kbps Constante)</option>
              <option value="WEBM">WEBM (Opus Alta Calidad)</option>
              <option value="FLAC">FLAC (Lossless Master)</option>
              <option value="WAV">WAV (PCM Directo 44.1kHz)</option>
            </select>
          </div>

          <div>
            <label className="text-zinc-400 block mb-1">Duración del fundido cruzado (segundos)</label>
            <input
              type="number"
              min={1}
              max={12}
              value={form.crossfadeDurationSec}
              onChange={e => setForm({ ...form, crossfadeDurationSec: parseInt(e.target.value, 10) })}
              className="w-full bg-[#080a0f] border border-[#232b3d] rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-zinc-400 block mb-1">Intervalo del Explorador (horas)</label>
            <input
              type="number"
              min={6}
              max={48}
              value={form.scoutIntervalHours}
              onChange={e => setForm({ ...form, scoutIntervalHours: parseInt(e.target.value, 10) })}
              className="w-full bg-[#080a0f] border border-[#232b3d] rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Electron Security Audit Checklist */}
      <div className="bg-[#0c0f17] border border-[#1b2233] rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-zinc-200 flex items-center space-x-2 pb-2 border-b border-[#181f2d]">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>ESTADO DE SEGURIDAD DE ELECTRON</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-[#090b10] border border-[#1a202d] flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div>
              <div className="font-bold text-zinc-200">Aislamiento de contexto: ACTIVO</div>
              <div className="text-[10px] text-zinc-500">contextIsolation: true activo en preload</div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#090b10] border border-[#1a202d] flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div>
              <div className="font-bold text-zinc-200">Integración de Node: DESACTIVADA</div>
              <div className="text-[10px] text-zinc-500">nodeIntegration: false en proceso principal</div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#090b10] border border-[#1a202d] flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div>
              <div className="font-bold text-zinc-200">Política de Seguridad de Contenido (CSP)</div>
              <div className="text-[10px] text-zinc-500">Cabeceras estrictas CSP inyectadas</div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#090b10] border border-[#1a202d] flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div>
              <div className="font-bold text-zinc-200">Saneamiento de IPC y canales seguros</div>
              <div className="text-[10px] text-zinc-500">Invocación segura de IPC solo mediante bridge</div>
            </div>
          </div>
        </div>
      </div>

      {/* Backup & Actions */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={handleExportJson}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-[#141924] hover:bg-[#1c2333] border border-[#232c3f] text-xs text-zinc-300 transition-colors cursor-pointer"
        >
          <DownloadCloud className="w-4 h-4 text-cyan-400" />
          <span>EXPORTAR COPIA DE CONFIGURACIÓN</span>
        </button>

        <span className="text-[11px] text-zinc-500">MOTOR RAD X v1.0 • ESTABLE</span>
      </div>
    </div>
  );
};
