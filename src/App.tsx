import { useState, useEffect } from 'react';
import type {
  DailyConsensusSummary,
  GeoLocation,
  HourlyConsensusPoint,
} from './types/weather';
import {
  DEFAULT_LOCATION,
  POPULAR_LOCATIONS,
  fetchMultiModelForecast,
  searchCity,
} from './api/openMeteo';
import { aggregateForecast } from './lib/aggregator';
import { ConsensusPanel } from './components/ConsensusPanel/ConsensusPanel';
import {
  ViewControls,
  type TimeHorizon,
} from './components/Controls/ViewControls';
import { SourcesCarousel } from './components/SourcesView/SourcesCarousel';
import { OrientationLock } from './components/Orientation/OrientationLock';
import appIcon from './assets/app-icon.png';
import {
  Search,
  RefreshCw,
  AlertCircle,
  Layers,
} from 'lucide-react';
import { HU_TEXTS } from './lib/i18n';
import './App.css';

export function App() {
  const [selectedLocation, setSelectedLocation] =
    useState<GeoLocation>(DEFAULT_LOCATION);
  const [horizon, setHorizon] = useState<TimeHorizon>('most');
  const [showSources, setShowSources] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const [hourlyPoints, setHourlyPoints] = useState<HourlyConsensusPoint[]>([]);
  const [dailySummaries, setDailySummaries] = useState<DailyConsensusSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<GeoLocation[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState<boolean>(false);

  // Map horizon to forecast days needed from API
  // 'most': 2 days, '24h': 2 days, '72h': 4 days
  const days = horizon === '72h' ? 4 : 2;

  useEffect(() => {
    let ignore = false;

    const fetchForecast = async () => {
      await Promise.resolve();
      if (ignore) return;
      setLoading(true);
      setError(null);

      try {
        const raw = await fetchMultiModelForecast(
          selectedLocation.latitude,
          selectedLocation.longitude,
          days
        );
        if (ignore) return;
        const aggregated = aggregateForecast(raw);

        setHourlyPoints(aggregated.hourly);
        setDailySummaries(aggregated.daily);
      } catch (err) {
        if (ignore) return;
        console.error('Failed to load forecast:', err);
        setError(
          err instanceof Error ? err.message : HU_TEXTS.errorMessage
        );
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void fetchForecast();
    return () => {
      ignore = true;
    };
  }, [selectedLocation, days, refreshKey]);

  // Handle City Search with debounce
  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchCity(query, 6);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const displayedResults = searchQuery.trim().length < 2 ? [] : searchResults;

  const handleSelectCity = (city: GeoLocation) => {
    setSelectedLocation(city);
    setSearchQuery('');
    setShowSearchDropdown(false);
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col justify-between overflow-hidden bg-white text-slate-900 select-none">
      {/* 1. Orientation Lock Overlay (Triggers when mobile is in landscape) */}
      <OrientationLock />

      {/* 2. Top Header: App Icon & Title ONLY, with Location search */}
      <header className="h-14 min-h-14 px-3.5 sm:px-5 flex items-center justify-between border-b border-slate-200/70 bg-white/95 backdrop-blur-md z-40 shrink-0">
        {/* Branding: Icon (~40px) right next to Title with optical alignment */}
        <div className="flex items-center gap-2.5">
          <img
            src={appIcon}
            alt="OmniForecast Icon"
            className="w-10 h-10 rounded-xl object-contain shadow-xs border border-slate-100"
          />
          <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 m-0 leading-none">
            {HU_TEXTS.appTitle}
          </h1>
        </div>

        {/* Compact Search & City Picker */}
        <div className="flex items-center gap-2">
          {/* Quick Hungarian Preset Cities Dropdown / Selector */}
          <div className="relative">
            <select
              value={selectedLocation.name}
              onChange={(e) => {
                const found = POPULAR_LOCATIONS.find((l) => l.name === e.target.value);
                if (found) setSelectedLocation(found);
              }}
              className="text-xs font-semibold py-1 px-2.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200/70 focus:outline-hidden transition-colors cursor-pointer"
            >
              {POPULAR_LOCATIONS.map((loc) => (
                <option key={loc.id} value={loc.name}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative hidden sm:block w-44 lg:w-56">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchDropdown(true);
                }}
                onFocus={() => setShowSearchDropdown(true)}
                placeholder={HU_TEXTS.searchPlaceholder}
                className="clean-input w-full pl-8 pr-7 py-1 text-xs rounded-lg text-slate-900 placeholder-slate-400"
              />
              {searching && (
                <RefreshCw className="w-3 h-3 text-sky-600 animate-spin absolute right-2.5" />
              )}
            </div>

            {/* Dropdown Results */}
            {showSearchDropdown && displayedResults.length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-xl z-50 border border-slate-200 overflow-hidden">
                {displayedResults.map((city) => (
                  <button
                    key={`${city.id}-${city.name}`}
                    type="button"
                    onClick={() => handleSelectCity(city)}
                    className="w-full px-3 py-2 text-left text-xs text-slate-800 hover:bg-slate-50 flex items-center justify-between border-b border-slate-100 last:border-0 transition-colors"
                  >
                    <div>
                      <span className="font-semibold text-slate-900">{city.name}</span>
                      <span className="text-slate-500 ml-1.5 text-[11px]">
                        {city.admin1 ? `${city.admin1}, ` : ''}
                        {city.country}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">{city.countryCode}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 3. Main Body Container (fits single screen height without vertical scrolling) */}
      <main className="flex-1 min-h-0 flex flex-col justify-between p-2.5 sm:p-3.5 max-w-4xl mx-auto w-full overflow-hidden">
        {showSources ? (
          /* Dedicated Sources Carousel View */
          <SourcesCarousel
            currentHour={hourlyPoints[0]}
            todaySummary={dailySummaries[0]}
            onBack={() => setShowSources(false)}
            locationName={selectedLocation.name}
          />
        ) : (
          /* Primary Summary Dashboard (Single Viewport) */
          <div className="h-full flex flex-col justify-between gap-2 overflow-hidden">
            {/* Top Time Horizon Selector (Most | 24h | 72h) */}
            <ViewControls
              horizon={horizon}
              onHorizonChange={setHorizon}
            />

            {/* Loading State */}
            {loading && (
              <div className="clean-card p-8 text-center my-auto space-y-2">
                <RefreshCw className="w-6 h-6 text-sky-600 animate-spin mx-auto" />
                <p className="text-xs font-semibold text-slate-700">
                  {HU_TEXTS.loadingMessage}
                </p>
                <p className="text-[11px] text-slate-400">
                  ECMWF IFS • DWD ICON-EU • DWD ICON • Météo-France
                </p>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="clean-card p-5 border-rose-200 bg-rose-50 text-rose-800 flex items-start gap-2.5 my-auto">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <div className="flex-1 text-xs">
                  <h4 className="font-bold text-rose-900">{HU_TEXTS.errorMessage}</h4>
                  <p className="mt-0.5 text-rose-700">{error}</p>
                  <button
                    type="button"
                    onClick={() => setRefreshKey((k) => k + 1)}
                    className="mt-2 px-3 py-1 rounded bg-rose-600 text-white font-semibold text-xs hover:bg-rose-700 transition-colors"
                  >
                    {HU_TEXTS.retry}
                  </button>
                </div>
              </div>
            )}

            {/* Consensus Hero & Breakdown */}
            {!loading && !error && hourlyPoints.length > 0 && (
              <ConsensusPanel
                hourlyPoints={hourlyPoints}
                dailySummary={dailySummaries[0]}
                locationName={selectedLocation.name}
                country={selectedLocation.country}
                horizon={horizon}
              />
            )}

            {/* Persistent "Források" Button at bottom of main view */}
            <div className="w-full pt-1 shrink-0">
              <button
                type="button"
                onClick={() => setShowSources(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-slate-300 text-slate-700 font-medium text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs hover:shadow transition-all group cursor-pointer"
              >
                <Layers className="w-4 h-4 text-sky-600 transition-transform group-hover:scale-105" />
                <span className="font-semibold text-slate-800">{HU_TEXTS.sourcesButton}</span>
                <span className="text-slate-400 font-normal text-xs">(4 modell nyers adatai)</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 4. Footer: Restrict text EXCLUSIVELY to: 2026 AmaihAIku */}
      <footer className="h-6 min-h-6 flex items-center justify-center border-t border-slate-100 bg-white text-[11px] text-slate-400 select-none shrink-0">
        {HU_TEXTS.footer}
      </footer>
    </div>
  );
}

export default App;
