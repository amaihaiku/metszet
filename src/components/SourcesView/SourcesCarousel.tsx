import React, { useState } from 'react';
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
import { getWeatherCodeDetails } from '../../lib/aggregator';
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

export interface SourcesCarouselProps {
  currentHour?: HourlyConsensusPoint;
  todaySummary?: DailyConsensusSummary;
  onBack: () => void;
  locationName?: string;
}

export const SourcesCarousel: React.FC<SourcesCarouselProps> = ({
  currentHour,
  todaySummary,
  onBack,
  locationName = 'Budapest',
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const models = SUPPORTED_MODELS;
  const currentModelKey: WeatherModel = models[currentIndex] ?? 'ecmwf_ifs025';
  const info = WEATHER_MODEL_REGISTRY[currentModelKey];
  const point = currentHour?.models[currentModelKey];
  const weather = getWeatherCodeDetails(point?.weatherCode ?? 0);

  const delta =
    point && currentHour
      ? Number((point.temperature - currentHour.weightedTemperature).toFixed(1))
      : null;

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % models.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + models.length) % models.length);
  };

  return (
    <div className="h-full max-h-full flex flex-col justify-between py-2 px-3 sm:px-4 max-w-xl mx-auto w-full select-none">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>{HU_TEXTS.backButton}</span>
        </button>

        <div className="text-center">
          <h2 className="text-sm font-bold text-slate-900 m-0">
            {HU_TEXTS.sourcesTitle}
          </h2>
          <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500">
            <MapPin className="w-3 h-3 text-sky-600" />
            <span>{locationName}</span>
          </div>
        </div>

        <div className="text-xs font-semibold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200">
          {currentIndex + 1} / {models.length}
        </div>
      </div>

      {/* Main Swipeable Carousel Card */}
      <div className="relative my-auto py-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentModelKey}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="clean-card p-5 relative overflow-hidden bg-white shadow-md border-t-4"
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
                  {point ? `${point.temperature.toFixed(1)}°C` : '--'}
                </div>
                <div className="text-xs font-medium text-slate-600 mt-1 flex items-center gap-1.5">
                  <span>{weather.label}</span>
                  {todaySummary && (
                    <span className="text-slate-400 font-normal">
                      (Ma: {todaySummary.tempMin}° / {todaySummary.tempMax}°)
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
                  Eltérés a konszenzustól:
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
                  {point ? `${point.temperature.toFixed(1)} °C` : '--'}
                </div>
              </div>

              <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 mb-0.5">
                  <span className="font-medium text-[11px] uppercase tracking-tight">{HU_TEXTS.precipitation}</span>
                  <Droplets className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div className="text-base sm:text-lg font-semibold tabular-nums text-slate-900">
                  {point ? `${point.precipitation.toFixed(1)} mm` : '--'}
                </div>
              </div>

              <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 mb-0.5">
                  <span className="font-medium text-[11px] uppercase tracking-tight">{HU_TEXTS.windSpeed}</span>
                  <Wind className="w-3.5 h-3.5 text-teal-600" />
                </div>
                <div className="text-base sm:text-lg font-semibold tabular-nums text-slate-900">
                  {point ? `${Math.round(point.windSpeed)} km/h` : '--'}
                </div>
              </div>

              <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 mb-0.5">
                  <span className="font-medium text-[11px] uppercase tracking-tight">{HU_TEXTS.pressure}</span>
                  <Gauge className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                <div className="text-base sm:text-lg font-semibold tabular-nums text-slate-900">
                  {point ? `${point.pressure.toFixed(1)} hPa` : '--'}
                </div>
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
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-8 h-8 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all z-20"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={nextSlide}
          aria-label="Következő forrás"
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 w-8 h-8 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all z-20"
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
                className={`h-2 rounded-full transition-all ${
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
          className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-slate-300 text-slate-700 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs hover:shadow transition-all"
        >
          <Layers className="w-4 h-4 text-slate-500" />
          <span>Vissza a konszenzusos nézetbe</span>
        </button>
      </div>
    </div>
  );
};

