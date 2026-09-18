import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type {
  DailyConsensusSummary,
  HourlyConsensusPoint,
  WeatherModel,
} from '../../types/weather';
import {
  SUPPORTED_MODELS,
  WEATHER_MODEL_REGISTRY,
} from '../../types/weather';
import {
  getWeatherCodeDetails,
  calculateModelPeriodSummary,
} from '../../lib/aggregator';
import { WeatherIcon } from '../Common/WeatherIcon';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Thermometer,
  Droplets,
  Wind,
  Gauge,
  Activity,
  Layers,
  MapPin,
} from 'lucide-react';
import { HU_TEXTS } from '../../lib/i18n';
import type { TimeHorizon } from '../Controls/ViewControls';

export interface SourcesCarouselProps {
  currentHour?: HourlyConsensusPoint;
  hourlyPoints?: HourlyConsensusPoint[];
  todaySummary?: DailyConsensusSummary;
  horizon?: TimeHorizon;
  onHorizonChange?: (horizon: TimeHorizon) => void;
  onBack: () => void;
  locationName?: string;
  currentHourIndex?: number;
}

export const SourcesCarousel: React.FC<SourcesCarouselProps> = ({
  currentHour,
  hourlyPoints = [],
  todaySummary,
  horizon = 'most',
  onHorizonChange,
  onBack,
  locationName = 'Budapest',
  currentHourIndex = 0,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef<number>(0);

  const models = SUPPORTED_MODELS;
  const currentModelKey: WeatherModel = models[currentIndex] ?? 'ecmwf_ifs025';
  const info = WEATHER_MODEL_REGISTRY[currentModelKey];

  // Real-time instantaneous point for this model
  const instantaneousPoint = currentHour?.models[currentModelKey];
  const weather = getWeatherCodeDetails(instantaneousPoint?.weatherCode ?? 0);

  // Model-specific period aggregation
  const summary = calculateModelPeriodSummary(
    hourlyPoints,
    currentModelKey,
    horizon,
    currentHourIndex
  );

  // Calculate consensus average temperature for delta comparison
  const windowCount = horizon === 'most' ? 1 : horizon === '24h' ? 24 : 72;
  const activeWindow = hourlyPoints.slice(currentHourIndex, currentHourIndex + windowCount);
  const consensusAvgTemp =
    activeWindow.length > 0
      ? activeWindow.reduce((acc, p) => acc + p.weightedTemperature, 0) / activeWindow.length
      : currentHour?.weightedTemperature ?? 0;

  const delta =
    horizon === 'most'
      ? instantaneousPoint && currentHour
        ? Number((instantaneousPoint.temperature - currentHour.weightedTemperature).toFixed(1))
        : null
      : Number((summary.tempAvg - consensusAvgTemp).toFixed(1));

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % models.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + models.length) % models.length);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => (prev - 1 + models.length) % models.length);
      }
      if (e.key === 'ArrowRight') {
        setCurrentIndex((prev) => (prev + 1) % models.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [models.length]);

  // Native touch gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
    touchDeltaX.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    touchDeltaX.current = (e.touches[0]?.clientX ?? 0) - touchStartX.current;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null) return;
    const threshold = 40;
    if (touchDeltaX.current < -threshold) {
      nextSlide();
    } else if (touchDeltaX.current > threshold) {
      prevSlide();
    }
    touchStartX.current = null;
    touchDeltaX.current = 0;
  };

  const isMost = horizon === 'most';

  return (
    <div
      className="h-full max-h-full flex flex-col justify-between py-2 px-3 sm:px-4 max-w-xl mx-auto w-full select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Header Bar with Location & Horizon Toggle */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700 transition-colors shadow-2xs cursor-pointer shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span className="hidden xs:inline">{HU_TEXTS.backButton}</span>
        </button>

        <div className="flex items-center gap-1 text-xs text-slate-700 font-semibold truncate">
          <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
          <span className="truncate max-w-[90px] sm:max-w-[140px]">{locationName}</span>
        </div>

        {/* Compact Horizon Toggle */}
        {onHorizonChange && (
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200/80 text-[11px] font-semibold shrink-0">
            {(['most', '24h', '72h'] as TimeHorizon[]).map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => onHorizonChange(h)}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  horizon === h
                    ? 'bg-white text-sky-700 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {h === 'most' ? 'Most' : h}
              </button>
            ))}
          </div>
        )}

        <div className="text-xs font-semibold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200 shrink-0">
          {currentIndex + 1} / {models.length}
        </div>
      </div>

      {/* Main Swipeable Carousel Card with Drag Gesture */}
      <div className="relative my-auto py-2 touch-pan-y">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentModelKey}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={(_e, { offset, velocity }) => {
              const swipeThreshold = 50;
              if (offset.x < -swipeThreshold || velocity.x < -300) {
                nextSlide();
              } else if (offset.x > swipeThreshold || velocity.x > 300) {
                prevSlide();
              }
            }}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
            className="clean-card p-5 relative overflow-hidden bg-white shadow-md border-t-4 cursor-grab active:cursor-grabbing"
            style={{ borderTopColor: info.color }}
          >
            {/* Top info badge & agency */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: info.color }}
                  />
                  <h3 className="text-base font-bold text-slate-900">
                    {info.name}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {info.agency} • {info.resolutionKm} km felbontás
                </p>
              </div>

              <span
                className="text-xs font-bold px-2.5 py-0.5 rounded-full border"
                style={{
                  backgroundColor: info.badgeBg,
                  borderColor: info.badgeBorder,
                  color: info.color,
                }}
              >
                {Math.round(info.defaultWeight * 100)}% súly
              </span>
            </div>

            {/* Main Temp & Weather Icon */}
            <div className="flex items-center justify-between my-4 px-1">
              <div>
                <div className="text-4xl font-extrabold text-slate-900 tracking-tight">
                  {isMost
                    ? instantaneousPoint
                      ? `${instantaneousPoint.temperature.toFixed(1)}°C`
                      : '--'
                    : `${summary.tempAvg.toFixed(1)}°C`}
                </div>
                <div className="text-xs font-medium text-slate-600 mt-1 flex items-center gap-1.5">
                  <span>{isMost ? weather.label : `${horizon.toUpperCase()} előrejelzés`}</span>
                  {isMost && todaySummary && (
                    <span className="text-slate-400 font-normal">
                      (Ma: {todaySummary.tempMin}° / {todaySummary.tempMax}°)
                    </span>
                  )}
                  {!isMost && (
                    <span className="text-slate-400 font-normal">
                      ({summary.tempMin.toFixed(0)}° - {summary.tempMax.toFixed(0)}°)
                    </span>
                  )}
                </div>
              </div>

              <div
                className="p-3.5 rounded-2xl border border-slate-100 shadow-sm"
                style={{ backgroundColor: `${info.color}15` }}
              >
                <WeatherIcon
                  name={weather.iconName}
                  className="w-10 h-10"
                  style={{ color: info.color }}
                />
              </div>
            </div>

            {/* Delta pill vs consensus */}
            {delta !== null && (
              <div className="mb-4 py-1.5 px-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1 text-[11px] font-medium">
                  <Activity className="w-3.5 h-3.5 text-slate-400" />
                  Eltérés a konszenzustól ({horizon === 'most' ? 'Most' : horizon}):
                </span>
                <span
                  className={`font-bold ${
                    delta > 0
                      ? 'text-amber-600'
                      : delta < 0
                        ? 'text-sky-600'
                        : 'text-slate-600'
                  }`}
                >
                  {delta > 0 ? `+${delta}°C (melegebb)` : delta < 0 ? `${delta}°C (hűvösebb)` : 'Pontosan azonos'}
                </span>
              </div>
            )}

            {/* 4 Compact Parameter Cards: Temp, Rain, Wind, Pressure */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 mb-0.5">
                  <span className="font-medium text-[11px] uppercase tracking-tight">{HU_TEXTS.temperature}</span>
                  <Thermometer className="w-3.5 h-3.5 text-sky-600" />
                </div>
                <div className="text-base sm:text-lg font-semibold tabular-nums text-slate-900">
                  {isMost
                    ? instantaneousPoint
                      ? `${instantaneousPoint.temperature.toFixed(1)} °C`
                      : '--'
                    : `${summary.tempMin.toFixed(0)}° - ${summary.tempMax.toFixed(0)}°`}
                </div>
                {!isMost && (
                  <span className="text-[10px] text-slate-500">Átlag: {summary.tempAvg.toFixed(1)} °C</span>
                )}
              </div>

              <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 mb-0.5">
                  <span className="font-medium text-[11px] uppercase tracking-tight">{HU_TEXTS.precipitation}</span>
                  <Droplets className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div className="text-base sm:text-lg font-semibold tabular-nums text-slate-900">
                  {isMost
                    ? instantaneousPoint
                      ? `${instantaneousPoint.precipitation.toFixed(1)} mm`
                      : '--'
                    : `${summary.totalPrecipitation.toFixed(1)} mm`}
                </div>
                {!isMost && (
                  <span className="text-[10px] text-slate-500">{horizon} összeg</span>
                )}
              </div>

              <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 mb-0.5">
                  <span className="font-medium text-[11px] uppercase tracking-tight">{HU_TEXTS.windSpeed}</span>
                  <Wind className="w-3.5 h-3.5 text-teal-600" />
                </div>
                <div className="text-base sm:text-lg font-semibold tabular-nums text-slate-900">
                  {isMost
                    ? instantaneousPoint
                      ? `${Math.round(instantaneousPoint.windSpeed)} km/h`
                      : '--'
                    : `${summary.maxWindSpeed} km/h max`}
                </div>
                {!isMost && (
                  <span className="text-[10px] text-slate-500">Átlag: {summary.avgWindSpeed} km/h</span>
                )}
              </div>

              <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 mb-0.5">
                  <span className="font-medium text-[11px] uppercase tracking-tight">{HU_TEXTS.pressure}</span>
                  <Gauge className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                <div className="text-base sm:text-lg font-semibold tabular-nums text-slate-900">
                  {isMost
                    ? instantaneousPoint
                      ? `${instantaneousPoint.pressure.toFixed(1)} hPa`
                      : '--'
                    : `${Math.round(summary.avgPressure)} hPa`}
                </div>
                {!isMost && (
                  <span className="text-[10px] text-slate-500">{horizon} átlag</span>
                )}
              </div>
            </div>

            {/* Model Description Footer */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 leading-snug">
              {info.description}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Carousel Navigation Arrows */}
        <button
          type="button"
          onClick={prevSlide}
          aria-label="Előző forrás"
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-8 h-8 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all z-20 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={nextSlide}
          aria-label="Következő forrás"
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 w-8 h-8 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all z-20 cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Slide Indicators & Back Button */}
      <div className="pt-2 border-t border-slate-200 flex flex-col items-center gap-2.5">
        {/* Dot indicators */}
        <div className="flex items-center gap-1.5">
          {models.map((m, idx) => {
            const isCurrent = idx === currentIndex;
            const modelInfo = WEATHER_MODEL_REGISTRY[m];
            return (
              <button
                key={m}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                aria-label={modelInfo.shortName}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  isCurrent ? 'w-6 bg-sky-600' : 'w-2 bg-slate-300 hover:bg-slate-400'
                }`}
              />
            );
          })}
        </div>

        {/* Big Return Button */}
        <button
          type="button"
          onClick={onBack}
          className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-slate-300 text-slate-700 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs hover:shadow transition-all cursor-pointer"
        >
          <Layers className="w-4 h-4 text-slate-500" />
          <span>Vissza a konszenzusos nézetbe</span>
        </button>
      </div>
    </div>
  );
};
