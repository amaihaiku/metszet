import React, { useState, useEffect, useRef } from 'react';
import type { GeoLocation } from '../../types/weather';
import { POPULAR_LOCATIONS, searchCity } from '../../api/openMeteo';
import { Search, X, MapPin, Check, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface SettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLocation: GeoLocation;
  onSelectLocation: (location: GeoLocation) => void;
}

export const SettlementModal: React.FC<SettlementModalProps> = ({
  isOpen,
  onClose,
  selectedLocation,
  onSelectLocation,
}) => {
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<GeoLocation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setQuery('');
        setResults([]);
        inputRef.current?.focus();
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

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

  // Live search with debounce
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return;
    }

    let isCancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchCity(trimmed, 10);
        if (!isCancelled) {
          setResults(res);
        }
      } catch {
        if (!isCancelled) {
          setResults([]);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const displayedResults = query.trim().length < 2 ? [] : results;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85dvh] z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-tight">
                  Település kiválasztása
                </h3>
                <p className="text-[11px] text-slate-500">
                  Magyarországi városok és községek
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Bezárás"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Input Box */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/50">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Keress magyar települést (pl. Eger, Szeged, Siófok)..."
                className="w-full pl-9 pr-9 py-2 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15 shadow-2xs transition-all"
              />
              {loading ? (
                <RefreshCw className="w-4 h-4 text-sky-600 animate-spin absolute right-3" />
              ) : query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-md"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>
          </div>

          {/* Content Area */}
          <div className="overflow-y-auto p-3 space-y-3 max-h-[55dvh] scrollbar-thin">
            {/* Search Results List */}
            {query.trim().length >= 2 ? (
              <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
                  Találatok ({displayedResults.length})
                </div>

                {displayedResults.length > 0 ? (
                  <div className="space-y-1">
                    {displayedResults.map((loc) => {
                      const isSelected =
                        loc.name.toLowerCase() === selectedLocation.name.toLowerCase() ||
                        loc.id === selectedLocation.id;
                      return (
                        <button
                          key={`${loc.id}-${loc.name}`}
                          type="button"
                          onClick={() => {
                            onSelectLocation(loc);
                            onClose();
                          }}
                          className={`w-full px-3 py-2.5 rounded-xl text-left flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-sky-50 border border-sky-200 text-sky-900'
                              : 'hover:bg-slate-50 border border-transparent text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <MapPin
                              className={`w-4 h-4 shrink-0 ${
                                isSelected ? 'text-sky-600' : 'text-slate-400'
                              }`}
                            />
                            <div className="truncate">
                              <span className="text-xs sm:text-sm font-semibold text-slate-900">
                                {loc.name}
                              </span>
                              {loc.admin1 && (
                                <span className="text-[11px] text-slate-500 ml-1.5">
                                  {loc.admin1}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <span className="text-[10px] font-medium text-slate-400">
                              {loc.countryCode || 'HU'}
                            </span>
                            {isSelected && (
                              <Check className="w-4 h-4 text-sky-600" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : !loading ? (
                  <div className="text-center py-6 text-xs text-slate-500">
                    Nem található magyar település a(z) &quot;{query}&quot; kifejezésre.
                  </div>
                ) : null}
              </div>
            ) : (
              /* Quick Presets Section */
              <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
                  Gyakori települések
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {POPULAR_LOCATIONS.map((loc) => {
                    const isSelected =
                      loc.name.toLowerCase() === selectedLocation.name.toLowerCase() ||
                      loc.id === selectedLocation.id;
                    return (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => {
                          onSelectLocation(loc);
                          onClose();
                        }}
                        className={`px-3 py-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between border transition-all ${
                          isSelected
                            ? 'bg-sky-50 border-sky-300 text-sky-800 shadow-2xs font-bold'
                            : 'bg-white hover:bg-slate-50 border-slate-200/80 text-slate-700 shadow-2xs hover:border-slate-300'
                        }`}
                      >
                        <span className="truncate">{loc.name}</span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-sky-600 shrink-0 ml-1" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Kiválasztott: <strong className="text-slate-800">{selectedLocation.name}</strong></span>
            <span className="text-slate-400">Mentve a böngészőbe</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
