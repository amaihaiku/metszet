import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Play,
  Pause,
  RefreshCw,
  Radio,
  MapPin,
  AlertCircle,
  Clock,
  Layers,
} from 'lucide-react';
import type { GeoLocation } from '../../types/weather';

export interface RadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: GeoLocation;
}

interface RainViewerFrame {
  time: number;
  path: string;
  isNowcast?: boolean;
}

interface RainViewerApiResponse {
  host: string;
  radar: {
    past: Array<{ time: number; path: string }>;
    nowcast: Array<{ time: number; path: string }>;
  };
}

interface LeafletMap {
  remove: () => void;
  invalidateSize: () => void;
  removeLayer: (layer: unknown) => void;
  hasLayer: (layer: unknown) => boolean;
}

interface LeafletTileLayer {
  setOpacity: (opacity: number) => void;
  addTo: (map: LeafletMap) => LeafletTileLayer;
}

interface LeafletMarker {
  addTo: (map: LeafletMap) => LeafletMarker;
}

interface LeafletInstance {
  map: (element: HTMLElement, options?: Record<string, unknown>) => LeafletMap;
  tileLayer: (url: string, options?: Record<string, unknown>) => LeafletTileLayer;
  divIcon: (options?: Record<string, unknown>) => unknown;
  marker: (latlng: [number, number], options?: Record<string, unknown>) => LeafletMarker;
  control: {
    zoom: (options?: Record<string, unknown>) => { addTo: (map: LeafletMap) => void };
  };
}

interface WindowWithLeaflet extends Window {
  L?: LeafletInstance;
}

/**
 * Dynamically loads Leaflet CSS & JS from unpkg if not already present on window.
 */
function loadLeafletScript(): Promise<LeafletInstance> {
  return new Promise((resolve, reject) => {
    const win = window as unknown as WindowWithLeaflet;
    if (win.L) {
      resolve(win.L);
      return;
    }

    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const existingScript = document.querySelector('script[src*="leaflet.js"]');
    if (existingScript) {
      if (win.L) {
        resolve(win.L);
      } else {
        existingScript.addEventListener('load', () => {
          if (win.L) resolve(win.L);
          else reject(new Error('Leaflet script loaded but window.L is missing'));
        });
        existingScript.addEventListener('error', reject);
      }
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => {
      if (win.L) resolve(win.L);
      else reject(new Error('Leaflet script loaded but window.L is missing'));
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export const RadarModal: React.FC<RadarModalProps> = ({
  isOpen,
  onClose,
  location,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const radarLayersRef = useRef<LeafletTileLayer[]>([]);
  const playbackTimerRef = useRef<number | null>(null);

  const [frames, setFrames] = useState<RainViewerFrame[]>([]);
  const [activeFrameIndex, setActiveFrameIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Clear playback timer helper without setting React state
  const clearPlaybackTimer = useCallback(() => {
    if (playbackTimerRef.current !== null) {
      window.clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
  }, []);

  // Stop playback and update state
  const stopPlayback = useCallback(() => {
    clearPlaybackTimer();
    setIsPlaying(false);
  }, [clearPlaybackTimer]);

  // Teardown map instance & all radar layers safely
  const teardownMap = useCallback(() => {
    clearPlaybackTimer();

    radarLayersRef.current.forEach((layer) => {
      try {
        if (mapInstanceRef.current && mapInstanceRef.current.hasLayer(layer)) {
          mapInstanceRef.current.removeLayer(layer);
        }
      } catch {
        // Ignore removal error during teardown
      }
    });
    radarLayersRef.current = [];

    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch {
        // Ignore map removal error
      }
      mapInstanceRef.current = null;
    }
  }, [clearPlaybackTimer]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Initialize Map & Fetch RainViewer Radar Layers
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isCancelled = false;

    const initRadarMap = async () => {
      await Promise.resolve();
      if (isCancelled) return;
      setLoading(true);
      setError(null);

      try {
        const L = await loadLeafletScript();
        if (isCancelled || !mapContainerRef.current) return;

        // Clean up previous map if exists
        if (mapInstanceRef.current) {
          teardownMap();
        }

        // 1. Initialize Leaflet Map centered on location coordinates
        const map = L.map(mapContainerRef.current, {
          center: [location.latitude, location.longitude],
          zoom: 8,
          minZoom: 6,
          maxZoom: 13,
          zoomControl: false,
          attributionControl: false,
        });
        mapInstanceRef.current = map;

        // Custom zoom control in top-right
        L.control.zoom({ position: 'topright' }).addTo(map);

        // 2. Add CartoDB Dark Matter Basemap Tiles
        L.tileLayer(
          'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
          {
            maxZoom: 19,
            subdomains: 'abcd',
          }
        ).addTo(map);

        // 3. Add Pulsing Radar Location Marker at Center
        const pulsingIcon = L.divIcon({
          className: 'radar-pulsing-marker',
          html: `
            <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
              <div style="position: absolute; width: 28px; height: 28px; border-radius: 9999px; background: rgba(14, 165, 233, 0.45); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="position: absolute; width: 18px; height: 18px; border-radius: 9999px; background: rgba(14, 165, 233, 0.6);"></div>
              <div style="width: 10px; height: 10px; border-radius: 9999px; background: #38bdf8; border: 2px solid #ffffff; box-shadow: 0 0 8px rgba(56, 189, 248, 0.9); z-index: 10;"></div>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        L.marker([location.latitude, location.longitude], {
          icon: pulsingIcon,
          zIndexOffset: 1000,
        }).addTo(map);

        // 4. Critical Leaflet Render Fix: Execute map.invalidateSize()
        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 80);
        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 200);

        // 5. Fetch RainViewer Weather Maps API
        const response = await fetch(
          'https://api.rainviewer.com/public/weather-maps.json'
        );
        if (!response.ok) {
          throw new Error('Nem sikerült letölteni a radartérkép adatait.');
        }

        const data: RainViewerApiResponse = await response.json();
        if (isCancelled) return;

        // Frame Slicing: Last 4 frames from past + Next 3 frames from nowcast
        const pastSlice: RainViewerFrame[] = (data.radar?.past || []).slice(-4).map((f) => ({
          ...f,
          isNowcast: false,
        }));
        const nowcastSlice: RainViewerFrame[] = (data.radar?.nowcast || []).slice(0, 3).map((f) => ({
          ...f,
          isNowcast: true,
        }));

        const combinedFrames: RainViewerFrame[] = [...pastSlice, ...nowcastSlice];
        if (combinedFrames.length === 0) {
          throw new Error('Nincsenek elérhető radarfelvételek.');
        }

        // Current real-time index is the last past frame (or index 3)
        const currentMostIndex = Math.max(0, pastSlice.length - 1);
        setFrames(combinedFrames);
        setActiveFrameIndex(currentMostIndex);

        // 6. Preload All Frame Layers Upfront with Opacity 0 (Flicker-Free Layer Switching)
        const tileLayers: LeafletTileLayer[] = [];
        combinedFrames.forEach((frame, idx) => {
          const tileUrl = `${data.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`;
          const layer = L.tileLayer(tileUrl, {
            opacity: idx === currentMostIndex ? 0.85 : 0,
            zIndex: 10 + idx,
            tileSize: 256,
          });
          layer.addTo(map);
          tileLayers.push(layer);
        });

        radarLayersRef.current = tileLayers;
        setIsPlaying(true);
      } catch (err) {
        if (!isCancelled) {
          console.error('[RadarModal] Error initializing radar:', err);
          setError(
            err instanceof Error ? err.message : 'Ismeretlen hiba a radarkép betöltésekor.'
          );
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    void initRadarMap();

    return () => {
      isCancelled = true;
      teardownMap();
    };
  }, [isOpen, location.latitude, location.longitude, refreshKey, teardownMap]);

  // Synchronize Active Frame Opacity across Layers
  useEffect(() => {
    radarLayersRef.current.forEach((layer, idx) => {
      if (idx === activeFrameIndex) {
        layer.setOpacity(0.85);
      } else {
        layer.setOpacity(0);
      }
    });
  }, [activeFrameIndex]);

  // Playback Interval Loop (~750ms)
  useEffect(() => {
    if (!isOpen || !isPlaying || frames.length === 0) {
      if (playbackTimerRef.current !== null) {
        window.clearInterval(playbackTimerRef.current);
        playbackTimerRef.current = null;
      }
      return;
    }

    playbackTimerRef.current = window.setInterval(() => {
      setActiveFrameIndex((prev) => (prev + 1) % frames.length);
    }, 750);

    return () => {
      if (playbackTimerRef.current !== null) {
        window.clearInterval(playbackTimerRef.current);
        playbackTimerRef.current = null;
      }
    };
  }, [isOpen, isPlaying, frames.length]);

  // Format frame timestamp to relative tag (-30p, -20p, -10p, MOST, +10p, +20p, +30p)
  const getFrameRelativeTag = (idx: number, total: number) => {
    // Current "MOST" index is 3 when total is 7 (4 past + 3 nowcast)
    const mostIdx = Math.max(0, total - 4 >= 0 ? 3 : total - 1);
    const diff = idx - mostIdx;
    if (diff === 0) return 'MOST';
    if (diff < 0) return `${diff * 10}p`;
    return `+${diff * 10}p`;
  };

  // Format frame absolute time (HH:mm)
  const getFrameTimeStr = (frame?: RainViewerFrame) => {
    if (!frame || !frame.time) return '--:--';
    const d = new Date(frame.time * 1000);
    return d.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  const currentFrame = frames[activeFrameIndex];
  const isMostFrame = activeFrameIndex === 3 || (!currentFrame?.isNowcast && activeFrameIndex === Math.max(0, frames.filter(f => !f.isNowcast).length - 1));

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm select-none">
      {/* Modal Card */}
      <div className="relative w-full h-[92dvh] sm:h-[84vh] max-w-4xl rounded-2xl overflow-hidden flex flex-col bg-slate-900 text-white shadow-2xl border border-slate-700/80">
        {/* 1. Modal Header Bar */}
        <div className="px-3.5 sm:px-4 py-2.5 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-400 shrink-0">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                  Élő csapadék-radar
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live RainViewer
                </span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-sky-400" />
                <span className="text-slate-200 font-semibold">{location.name}</span>
                <span>és a Kárpát-medence</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              title="Radarképek frissítése"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-400' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onClose}
              title="Bezárás"
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 border border-slate-700 hover:border-rose-700 text-slate-300 hover:text-rose-300 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Map Container */}
        <div className="relative flex-1 w-full min-h-0 bg-slate-950 overflow-hidden">
          {/* Leaflet DOM Node */}
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-30">
              <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
              <p className="text-xs font-semibold text-slate-300">
                Radarképek betöltése...
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && !loading && (
            <div className="absolute inset-x-4 top-4 bg-rose-950/90 border border-rose-700 text-rose-200 p-3 rounded-xl flex items-center justify-between text-xs z-30 shadow-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setRefreshKey((k) => k + 1)}
                className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
              >
                Újra
              </button>
            </div>
          )}

          {/* Rain Intensity Legend Bar at Top-Left */}
          <div className="absolute top-3 left-3 z-20 bg-slate-900/85 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-800 shadow-md text-[10px] flex flex-col gap-1 pointer-events-none">
            <span className="text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3 h-3 text-sky-400" />
              Intenzitás (dBZ)
            </span>
            <div className="flex items-center gap-1">
              <span className="w-3 h-2 rounded-xs bg-[#00ecec]" title="Gyenge eső (10-20 dBZ)" />
              <span className="w-3 h-2 rounded-xs bg-[#01a0f6]" title="Mérsékelt (20-35 dBZ)" />
              <span className="w-3 h-2 rounded-xs bg-[#0000f6]" title="Intenzív (35-45 dBZ)" />
              <span className="w-3 h-2 rounded-xs bg-[#00e100]" title="Heves (45-50 dBZ)" />
              <span className="w-3 h-2 rounded-xs bg-[#ffff00]" title="Zápor / Zivatar (50-55 dBZ)" />
              <span className="w-3 h-2 rounded-xs bg-[#e70000]" title="Jégesőveszély (>55 dBZ)" />
            </div>
          </div>

          {/* Active Frame Timestamp Pill at Top-Center */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded-full border border-slate-700 shadow-lg flex items-center gap-2 text-xs font-bold pointer-events-none">
            <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="tabular-nums tracking-wide text-white">
              {getFrameTimeStr(currentFrame)}
            </span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold ${
                isMostFrame
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse'
                  : currentFrame?.isNowcast
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
              }`}
            >
              {getFrameRelativeTag(activeFrameIndex, frames.length)}
            </span>
          </div>
        </div>

        {/* 3. Bottom Playback & Timeline Controls Dock */}
        <div className="p-3 sm:p-4 bg-slate-900/95 border-t border-slate-800 shrink-0 z-20 flex flex-col gap-2.5">
          {/* Timeline Slider and Step Markers */}
          <div className="flex flex-col gap-1.5">
            <div className="relative flex items-center">
              <input
                type="range"
                min={0}
                max={Math.max(0, frames.length - 1)}
                step={1}
                value={activeFrameIndex}
                onChange={(e) => {
                  stopPlayback();
                  setActiveFrameIndex(parseInt(e.target.value, 10));
                }}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500 focus:outline-none"
              />
            </div>

            {/* Step Indicators Bar */}
            <div className="flex items-center justify-between px-0.5 text-[10px] font-bold select-none">
              {frames.map((f, idx) => {
                const isSelected = idx === activeFrameIndex;
                const tag = getFrameRelativeTag(idx, frames.length);
                const isNowcast = f.isNowcast;
                const isMost = tag === 'MOST';

                return (
                  <button
                    key={`${f.time}-${idx}`}
                    type="button"
                    onClick={() => {
                      stopPlayback();
                      setActiveFrameIndex(idx);
                    }}
                    className={`px-1.5 py-0.5 rounded-md transition-all cursor-pointer ${
                      isSelected
                        ? isMost
                          ? 'bg-emerald-500 text-white font-extrabold shadow-sm'
                          : isNowcast
                            ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                            : 'bg-sky-500 text-white font-extrabold shadow-sm'
                        : isMost
                          ? 'text-emerald-400 hover:bg-slate-800'
                          : isNowcast
                            ? 'text-amber-400/80 hover:bg-slate-800'
                            : 'text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Controls Bottom Row: Play/Pause, Frame Info, Legend */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs">
            {/* Play/Pause Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all shadow-sm cursor-pointer ${
                  isPlaying
                    ? 'bg-sky-500 hover:bg-sky-400 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>Szünet</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Lejátszás</span>
                  </>
                )}
              </button>

              <span className="text-[11px] text-slate-400 hidden xs:inline">
                {isPlaying ? 'Automatikus lejátszás' : 'Manuális léptetés'}
              </span>
            </div>

            {/* Nowcast vs Past Legend Pill */}
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <span>Múlt (40 perc)</span>
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Nowcast (+30p modell)</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
