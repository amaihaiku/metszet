import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Play,
  Pause,
  RefreshCw,
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

        // 1. Initialize Leaflet Map centered on location coordinates (Locked zoom: 7 to 10)
        const map = L.map(mapContainerRef.current, {
          center: [location.latitude, location.longitude],
          zoom: 8,
          minZoom: 7,
          maxZoom: 10,
          zoomControl: false,       // disable [+] [-] zoom buttons
          scrollWheelZoom: false,  // prevent accidental mouse scroll zooming
          doubleClickZoom: false,  // prevent accidental double-click zooming
          touchZoom: false,        // prevent pinch-to-zoom on mobile
          attributionControl: false,
        });
        mapInstanceRef.current = map;

        // 2. Standard Clean OpenStreetMap Basemap (Un-inverted Light Mode, locked zoom bounds)
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          minZoom: 7,
          maxZoom: 10,
          attribution: '&copy; OpenStreetMap',
        }).addTo(map);

        // 3. Add Pulsing Radar Location Marker at Center (Light Theme)
        const pulsingIcon = L.divIcon({
          className: 'radar-pulsing-marker',
          html: `
            <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
              <div style="position: absolute; width: 28px; height: 28px; border-radius: 9999px; background: rgba(2, 132, 199, 0.35); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="position: absolute; width: 18px; height: 18px; border-radius: 9999px; background: rgba(2, 132, 199, 0.5);"></div>
              <div style="width: 10px; height: 10px; border-radius: 9999px; background: #0284c7; border: 2px solid #ffffff; box-shadow: 0 0 6px rgba(2, 132, 199, 0.7); z-index: 10;"></div>
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

        // Past frames: covering the past 60 minutes
        const nowSec = Date.now() / 1000;
        const rawPast = data.radar?.past || [];
        const filteredPast = rawPast.filter((item) => item.time >= nowSec - 3700);
        const pastSlice: RainViewerFrame[] = (
          filteredPast.length >= 2 ? filteredPast : rawPast.slice(-7)
        ).map((f) => ({
          ...f,
          isNowcast: false,
        }));

        // Future nowcast frames (+10m, +20m, +30m predicted precipitation movement)
        const nowcastSlice: RainViewerFrame[] = (data.radar?.nowcast || []).map((f) => ({
          ...f,
          isNowcast: true,
        }));

        const combinedFrames: RainViewerFrame[] = [...pastSlice, ...nowcastSlice];
        if (combinedFrames.length === 0) {
          throw new Error('Nincsenek elérhető radarfelvételek.');
        }

        // Current real-time index is the last past frame
        const currentMostIndex = Math.max(0, pastSlice.length - 1);
        setFrames(combinedFrames);
        setActiveFrameIndex(currentMostIndex);

        // 6. Preload All Frame Layers Upfront with Opacity 0 (Flicker-Free Layer Switching & Zoom Safeguard)
        const tileLayers: LeafletTileLayer[] = [];
        combinedFrames.forEach((frame, idx) => {
          const tileUrl = `${data.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`;
          const layer = L.tileLayer(tileUrl, {
            opacity: idx === currentMostIndex ? 0.78 : 0,
            zIndex: 10 + idx,
            tileSize: 256,
            maxNativeZoom: 11,
            maxZoom: 10,
            minZoom: 7,
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

  // Synchronize Active Frame Opacity across Layers with smooth CSS crossfade
  useEffect(() => {
    radarLayersRef.current.forEach((layer, idx) => {
      if (idx === activeFrameIndex) {
        layer.setOpacity(0.78);
      } else {
        layer.setOpacity(0);
      }
    });
  }, [activeFrameIndex]);

  // Playback Interval Loop (1300ms per frame for calm, observant movement)
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
    }, 1300);

    return () => {
      if (playbackTimerRef.current !== null) {
        window.clearInterval(playbackTimerRef.current);
        playbackTimerRef.current = null;
      }
    };
  }, [isOpen, isPlaying, frames.length]);

  // Helper: compute mostIndex (index of the last past frame)
  const pastCount = frames.filter((f) => !f.isNowcast).length;
  const mostIndex = Math.max(0, pastCount - 1);
  const isMostFrame = activeFrameIndex === mostIndex;

  // Format frame timestamp to relative tag (-50p, -40p, ..., MOST, +10p, +20p, +30p)
  const getFrameRelativeTag = (
    idx: number,
    allFrames: RainViewerFrame[],
    targetMostIdx: number
  ) => {
    if (idx === targetMostIdx) return 'MOST';
    const targetFrame = allFrames[idx];
    const mostFrame = allFrames[targetMostIdx];
    if (!targetFrame || !mostFrame) return '';
    const diffMinutes = Math.round((targetFrame.time - mostFrame.time) / 60);
    if (diffMinutes === 0) return 'MOST';
    if (diffMinutes < 0) return `${diffMinutes}p`;
    return `+${diffMinutes}p`;
  };

  // Format frame absolute time (HH:mm)
  const getFrameTimeStr = (frame?: RainViewerFrame) => {
    if (!frame || !frame.time) return '--:--';
    const d = new Date(frame.time * 1000);
    return d.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  const currentFrame = frames[activeFrameIndex];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-slate-900/40 backdrop-blur-xs select-none">
      {/* Modal Card (Light Theme) */}
      <div className="relative w-full h-[92dvh] sm:h-[84vh] max-w-4xl rounded-2xl overflow-hidden flex flex-col bg-white text-slate-800 shadow-2xl border border-slate-200/90">
        {/* Scoped CSS for 250ms smooth crossfade between tile layers */}
        <style>{`
          .radar-leaflet-container .leaflet-layer {
            transition: opacity 250ms ease-in-out !important;
          }
        `}</style>

        {/* 1. Modal Header Bar: Radar title opposite close button */}
        <div className="px-4 py-2.5 bg-white border-b border-slate-100 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-800 tracking-tight">
              Radar
            </h3>
            <button
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              title="Radarképek frissítése"
              className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-600' : ''}`} />
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Bezárás"
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Map Container (Bright OSM Basemap) */}
        <div className="relative flex-1 w-full min-h-0 bg-slate-100 overflow-hidden">
          {/* Leaflet DOM Node */}
          <div ref={mapContainerRef} className="w-full h-full radar-leaflet-container" />

          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-30">
              <RefreshCw className="w-8 h-8 text-sky-600 animate-spin" />
              <p className="text-xs font-semibold text-slate-700">
                Radarképek betöltése...
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && !loading && (
            <div className="absolute inset-x-4 top-4 bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl flex items-center justify-between text-xs z-30 shadow-md">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setRefreshKey((k) => k + 1)}
                className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer"
              >
                Újra
              </button>
            </div>
          )}

          {/* Rain Intensity Legend Bar at Top-Left (Light Theme) */}
          <div className="absolute top-3 left-3 z-20 bg-white/90 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-200/90 shadow-sm text-[10px] flex flex-col gap-1 pointer-events-none">
            <span className="text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3 h-3 text-sky-600" />
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

          {/* Active Frame Timestamp Pill at Top-Center (Light Theme) */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full border border-slate-200 shadow-sm flex items-center gap-2 text-xs font-bold pointer-events-none">
            <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span className="tabular-nums tracking-wide text-slate-800 font-extrabold">
              {getFrameTimeStr(currentFrame)}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                isMostFrame
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 animate-pulse'
                  : currentFrame?.isNowcast
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-sky-50 text-sky-700 border-sky-300'
              }`}
            >
              {getFrameRelativeTag(activeFrameIndex, frames, mostIndex)}
            </span>
          </div>
        </div>

        {/* 3. Bottom Playback & Timeline Controls Dock (Clean Light Theme) */}
        <div className="p-3 sm:p-4 bg-white/95 border-t border-slate-200/90 shrink-0 z-20 flex flex-col gap-2.5">
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
                className="w-full h-2.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-sky-600 focus:outline-none border border-slate-200"
              />
            </div>

            {/* Step Indicators Bar with Dynamic Slicing */}
            <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar py-0.5 text-[10px] select-none">
              {frames.map((f, idx) => {
                const isSelected = idx === activeFrameIndex;
                const tag = getFrameRelativeTag(idx, frames, mostIndex);
                const isNowcast = f.isNowcast;
                const isMost = idx === mostIndex;

                return (
                  <button
                    key={`${f.time}-${idx}`}
                    type="button"
                    onClick={() => {
                      stopPlayback();
                      setActiveFrameIndex(idx);
                    }}
                    className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] transition-all cursor-pointer ${
                      isSelected
                        ? isMost
                          ? 'bg-emerald-600 text-white font-black shadow-xs ring-2 ring-emerald-300'
                          : isNowcast
                            ? 'bg-amber-500 text-white font-black shadow-xs ring-2 ring-amber-300'
                            : 'bg-sky-600 text-white font-black shadow-xs ring-2 ring-sky-300'
                        : isMost
                          ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-bold border border-emerald-300'
                          : isNowcast
                            ? 'text-amber-700 bg-amber-50/70 hover:bg-amber-100 font-semibold border border-amber-200'
                            : 'text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200/60 font-medium'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Controls Bottom Row: Play/Pause, Frame Info, Legend */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
            {/* Play/Pause Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all shadow-2xs cursor-pointer ${
                  isPlaying
                    ? 'bg-sky-600 hover:bg-sky-700 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
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

              <span className="text-[11px] text-slate-500 hidden xs:inline">
                {isPlaying ? 'Automatikus lejátszás (1.3 mp)' : 'Manuális léptetés'}
              </span>
            </div>

            {/* Nowcast vs Past Legend Pills (Light Theme) */}
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                <span>Múlt (1 óra)</span>
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>MOST</span>
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Nowcast (+30p)</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
