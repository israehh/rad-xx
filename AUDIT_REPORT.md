# RAD X - Informe de Auditoría y Certificación Técnica

**Versión:** 1.0-RC  
**Roles:** Principal Software Architect, Senior Electron Engineer, Senior Node.js Engineer, Senior Audio Systems Engineer, QA Lead  
**Estado:** Totalmente Funcional (0% Simulación, 100% Ejecución Real)  

---

## 1. Resumen Ejecutivo

Este informe documenta la auditoría exhaustiva, depuración y corrección del proyecto **RAD X (Underground Audio Intelligence & Discovery Workstation)**.

El objetivo prioritario y excluyente establecido fue:
> **Convertir RAD X en un sistema real de descubrimiento, descarga, indexación y gestión musical utilizando `yt-dlp` y `ffprobe`, eliminando por completo cualquier simulación, mock, placeholder, dato inventado o comportamiento falso.**

A través de esta intervención arquitectónica, se erradicaron de raíz los patrones sintéticos identificados en el código (`RAD_X_OFFLINE_AUDIO_PAYLOAD`, `fs.ftruncateSync`, metadatos inventados como 145/148 BPM, tonalidades fijas como '4A' o 'Am', tamaños simulados de 12 MB, generadores con `Math.random()`, y catálogos estáticos de fallback).

---

## 2. Inventario de Patrones Eliminados (Purga de Simulación)

| Componente | Patrón Detectado | Riesgo / Defecto | Corrección Aplicada |
|---|---|---|---|
| `fallbackCatalog.ts` | Archivo con 40+ pistas hardcodeadas | Proporcionaba resultados simulados cuando las búsquedas fallaban | **Eliminado por completo**. Las búsquedas devuelven exclusivamente resultados reales o listas vacías. |
| `DownloadManager.cjs` | `RAD_X_OFFLINE_AUDIO_PAYLOAD`, `fs.ftruncateSync` | Creaba archivos binarios simulados truncados en disco | **Eliminado al 100%**. Las descargas se ejecutan mediante `yt-dlp` con extracción de audio y control de procesos en tiempo real. |
| `DownloadManager.cjs` & `server.ts` | Estimación de bytes fijos (12 MB) y progreso simulado | Falsificaba el estado de la descarga | Progreso vinculado exclusivamente a líneas parseadas `[download] %` de `yt-dlp`. Si no hay datos, se refleja `null`. |
| `ytdlp.cjs` / `inspectAudioFile` | Invención de BPM (148), Key ('Am'), y Bitrate (320 kbps) | Corrompía la integridad de la base de datos con datos no medidos | Si `ffprobe` no detecta BPM, tonalidad o tags, el valor devuelto es estrictamente `null`. |
| `LibraryManager.cjs` & `ScoutScheduler.cjs` | Inserción forzada de "Industrial Techno" y 145 BPM | Catalogación apócrifa en disco | Manejo limpio de metadatos ausentes (`null`). El género proviene únicamente de las etiquetas reales o se clasifica como no asignado. |
| `ScoutEngine.cjs` | `Math.random()` para `trendScore` (70-98) | Simulación de métricas de popularidad | Eliminado. Se almacenan únicamente métricas comprobadas o `null`. |
| `useRadxStore.ts` & `audioEngine.ts` | Valores predeterminados en fallback (145 BPM, 'Industrial Techno') | Reproducción engañosa en sintetizador DSP | El reproductor admite `null` en metadatos y reproduce el archivo real desde disco o previsualizaciones válidas. |
| `DownloadsView.tsx` | Falta de visibilidad de errores reales de `yt-dlp` | Ocultaba las razones de salida no nula de los binarios | Inspector de diagnóstico integrado: muestra comando ejecutado, código de salida y stderr completo. |

---

## 3. Arquitectura del Sistema Real

### 3.1 Motor de Descargas (`DownloadManager.cjs` / `server.ts`)
- **Ejecución Directa de Binario**: Se invoca el binario real `yt-dlp` verificado en `$PATH` o `./bin/yt-dlp`.
- **Argumentos de Extracción**: `--extract-audio`, `--audio-format <mp3|opus|flac|wav>`, `--audio-quality 0`, `--no-playlist`, `-o <targetPath>`.
- **Trazabilidad de Ejecución**:
  - `executedCommand`: Cadena exacta del comando ejecutado.
  - `exitCode`: Código de retorno del proceso hijo.
  - `fullStderr`: Búfer con los últimos 5,000 caracteres de stderr en caso de fallo (p. ej., restricciones geográficas, CAPTCHA de Google, etc.).
- **Inspección Post-Descarga**: Al terminar con código `0`, se ejecuta `ffprobe` real sobre el archivo descargado para capturar la duración en segundos, bitrate real, canales (estéreo/mono), formato y códec.

### 3.2 Motor de Descubrimiento (`HunterEngine.cjs` / `ScoutEngine.cjs`)
- **Búsquedas Reales**: Ejecuta `yt-dlp --dump-single-json "ytsearchN:..."` para consultar el índice en tiempo real.
- **Sin Fallbacks Falsos**: Si la red no está disponible o la consulta no arroja coincidencias, se devuelve una lista vacía `[]`, nunca datos inventados.

### 3.3 Gestión de Biblioteca e Indexación (`LibraryManager.cjs`)
- **Escaneo Físico de Disco**: Recorre de manera recursiva `musicDirectory` y `scoutDirectory` buscando extensiones reales (`.mp3`, `.flac`, `.wav`, `.m4a`, `.opus`, `.webm`).
- **Verificación `ffprobe`**: Cada archivo encontrado se somete a `ffprobe -v quiet -print_format json -show_format -show_streams`. Los valores no presentes en los metadatos ID3 o contenedores se guardan como `null`.

### 3.4 Motor de Audio y Reproducción (`audioEngine.ts` / `useRadxStore.ts`)
- **Streaming de Archivos Reales**: Endpoint `/api/audio/stream/:id` configurado para transmitir directamente el archivo binario desde el sistema de archivos del servidor al navegador mediante `res.sendFile`.
- **Sintetizador de Frecuencias DSP**: Motor Web Audio API de 48kHz / 32-bit flotante con analizador de espectro de 64 bandas para visualización visual en canvas en tiempo real.

---

## 4. Matriz de Verificación y Pruebas QA

| Escenario de Prueba | Comportamiento Esperado | Resultado de Auditoría |
|---|---|---|
| **Búsqueda en Hunter sin conexión** | Devuelve lista vacía `[]` con indicación de red; sin tarjetas estáticas | **Aprobado** |
| **Búsqueda en Hunter con conexión** | Descubre pistas reales de YouTube con URLs verídicas y thumbnails | **Aprobado** |
| **Descarga fallida por IP/CAPTCHA** | Guarda `status: 'Failed'`, muestra `exitCode` != 0, comando y `fullStderr` | **Aprobado** |
| **Descarga exitosa** | Descarga audio real, extrae formato, inspecciona con `ffprobe`, indexa en biblioteca | **Aprobado** |
| **Pista con tags incompletos** | BPM, Key y TrendScore se presentan como `--` o `null` sin inventar valores | **Aprobado** |
| **Reinicio de servidor / app** | Restaura descargas y cola pendientes desde JSON sin perder datos | **Aprobado** |

---

## 5. Conclusión

El sistema **RAD X** cumple rigurosamente con los estándares de ingeniería exigidos:
- No existen simulaciones de bytes ni truncados de archivos.
- No existen metadatos generados al azar (`Math.random()`).
- No existen catálogos estáticos ni archivos mock.
- Las herramientas `yt-dlp` y `ffprobe` actúan como la única fuente de verdad para audio y metadatos.
