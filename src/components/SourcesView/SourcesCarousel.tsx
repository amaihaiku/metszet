import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactECharts from 'echarts-for-react';
import type {
  AstronomyInfo,
  DailyConsensusSummary,
  HourlyConsensusPoint,
  WeatherModel,
} from '../../types/weather';
import {
  SUPPORTED_MODELS,
  WEATHER_MODEL_REGISTRY,
} from '../../types/weather';
import {
  calculateFrontEffect,
} from '../../lib/aggregator';
import {
  OMNI_GROUP,
  connectOmniGroup,
  getSingleModelChartOption,
  formatFullDateTime,
} from '../../lib/echartsOptions';
import { AstroFrontStrip } from '../Common/AstroFrontStrip';
import { WeatherIcon } from '../Common/WeatherIcon';
import { getWeatherCodeDetails } from '../../lib/aggregator';
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
  Clock,
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
  astronomy?: AstronomyInfo;
}

export const SourcesCarousel: React.FC<SourcesCarouselProps> = ({
  hourlyPoints = [],
  horizon = '24h',
  onHorizonChange,
  onBack,
  locationName = 'Budapest',
  currentHourIndex = 0,
  astronomy,
}) => {
  const [currentModelIndex, setCurrentModelIndex] = useState<number>(0);
  const [selectedHourIndex, setSelectedHourIndex] = useState<number>(0);
  const [prevHorizon, setPrevHorizon] = useState<string>(horizon);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef<number>(0);

  if (prevHorizon !== horizon) {
    setPrevHorizon(horizon);
    setSelectedHourIndex(0);
  }

  const activeHorizon = horizon === '72h' ? '72h' : '24h';
  const models = SUPPORTED_MODELS;
  const currentModelKey: WeatherModel = models[currentModelIndex] ?? 'ecmwf_ifs025';
  const info = WEATHER_MODEL_REGISTRY[currentModelKey];

  // Active slice of hourly points for this horizon
  const count = activeHorizon === '72h' ? 72 : 24;
  const windowPoints = hourlyPoints.slice(currentHourIndex, currentHourIndex + count);

  // Selected hour point
  const activeHourIdx = Math.min(selectedHourIndex, Math.max(0, windowPoints.length - 1));
  const activeConsensusPoint = windowPoints[activeHourIdx] || windowPoints[0];
  const activeModelPoint = activeConsensusPoint?.models[currentModelKey];
  const activeWeather = getWeatherCodeDetails(activeModelPoint?.weatherCode ?? 0);

  // Calculate delta vs consensus for this specific hour
  const consensusTemp = activeConsensusPoint?.weightedTemperature;
  const delta =
    activeModelPoint && consensusTemp !== undefined
      ? Number((activeModelPoint.temperature - consensusTemp).toFixed(1))
      : 0;

  // Dynamic front effect at selected hour
  const selectedGlobalIdx = currentHourIndex + activeHourIdx;
  const dynamicFront = calculateFrontEffect(hourlyPoints, selectedGlobalIdx);

  // Series data for Single Model ECharts
  const timestamps = windowPoints.map((p) => p.time);
  const temperatures = windowPoints.map((p) => p.models[currentModelKey]?.temperature ?? 0);
  const rain = windowPoints.map((p) => p.models[currentModelKey]?.precipitation ?? 0);

  const chartOption = getSingleModelChartOption(
    timestamps,
    temperatures,
    rain,
    info.color,
    info.shortName,
    activeConsensusPoint?.time
  );

  const nextSlide = () => {
    setCurrentModelIndex((prev) => (prev + 1) % models.length);
  };

  const prevSlide = () => {
    setCurrentModelIndex((prev) => (prev - 1 + models.length) % models.length);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setCurrentModelIndex((prev) => (prev - 1 + models.length) % models.length);
      }
      if (e.key === 'ArrowRight') {
        setCurrentModelIndex((prev) => (prev + 1) % models.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [models.length]);

  // Native touch gesture handlers for slide switching
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
    const threshold = 45;
    if (touchDeltaX.current < -threshold) {
      nextSlide();
    } else if (touchDeltaX.current > threshold) {
      prevSlide();
    }
    touchStartX.current = null;
    touchDeltaX.current = 0;
  };

  return (
    <div
      className="h-full max-h-full flex flex-col justify-between py-1 sm:py-2 px-2.5 sm:px-4 max-w-xl mx-auto w-full select-none overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 1. Top Header Bar: Back Button, Location, 24h/72h Horizon Toggle, Model Counter */}
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 gap-2 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700 transition-colors shadow-2xs cursor-pointer shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
          <span>{HU_TEXTS.backButton}</span>
        </button>

        <div className="flex items-center gap-1 text-xs text-slate-700 font-semibold truncate">
          <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
          <span className="truncate max-w-[100px] sm:max-w-[150px]">{locationName}</span>
        </div>

        {/* Restricted Horizon Toggle: Only '24h' and '72h' */}
        {onHorizonChange && (
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200/80 text-[11px] font-semibold shrink-0">
            {(['24h', '72h'] as TimeHorizon[]).map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => onHorizonChange(h)}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  activeHorizon === h
                    ? 'bg-white text-sky-700 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {h}
              </button>
            ))}
          </div>
        )}

        <div className="text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-200 shrink-0 tabular-nums">
          {currentModelIndex + 1} / {models.length}
        </div>
      </div>

      {/* 2. Main Swipeable Provider Slide with Slide Parity */}
      <div className="relative my-auto py-1 touch-pan-y flex-1 min-h-0 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentModelKey}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_e, { offset, velocity }) => {
              const swipeThreshold = 50;
              if (offset.x < -swipeThreshold || velocity.x < -300) {
                nextSlide();
              } else if (offset.x > swipeThreshold || velocity.x > 300) {
                prevSlide();
              }
            }}
            initial={{ opacity: 0, x: 25 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -25 }}
            transition={{ duration: 0.18 }}
            className="clean-card p-3 sm:p-4 relative overflow-hidden bg-white shadow-md border-t-4 cursor-grab active:cursor-grabbing flex flex-col justify-between gap-1.5"
            style={{ borderTopColor: info.color }}
          >
            {/* Header: Provider Name, Agency, Resolution, Weight */}
            <div className="flex items-start justify-between gap-2 pb-1 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: info.color }}
                  />
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                    {info.name}
                  </h3>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                  {info.agency} • {info.resolutionKm} km
                </p>
              </div>

              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0"
                style={{
                  backgroundColor: info.badgeBg,
                  borderColor: info.badgeBorder,
                  color: info.color,
                }}
              >
                {Math.round(info.defaultWeight * 100)}% súly
              </span>
            </div>

            {/* Slide Parity: Astro & Biometeorology Strip */}
            <AstroFrontStrip
              astronomy={astronomy}
              frontEffect={dynamicFront}
            />

            {/* Interactive Single Model ECharts Trend Graph with Tap/Scrub */}
            <div className="w-full h-[115px] sm:h-[130px] relative my-0.5">
              <ReactECharts
                option={chartOption}
                style={{ height: '100%', width: '100%' }}
                opts={{ renderer: 'canvas' }}
                notMerge={true}
                lazyUpdate={true}
                onChartReady={(instance) => {
                  instance.group = OMNI_GROUP;
                  connectOmniGroup();

                  const zr = instance.getZr();
                  if (!zr) return;

                  const handlePointer = (offsetX: number, offsetY: number) => {
                    const pointInPixel = [offsetX, offsetY];
                    if (instance.containPixel('grid', pointInPixel)) {
                      const coord = instance.convertFromPixel({ seriesIndex: 0 }, pointInPixel);
                      if (coord && typeof coord[0] === 'number') {
                        const idx = Math.max(0, Math.min(windowPoints.length - 1, Math.round(coord[0])));
                        setSelectedHourIndex(idx);
                      }
                    }
                  };

                  zr.on('click', (e: { offsetX: number; offsetY: number }) => {
                    handlePointer(e.offsetX, e.offsetY);
                  });

                  zr.on('mousemove', (e: { which: number; offsetX: number; offsetY: number }) => {
                    if (e.which === 1) {
                      handlePointer(e.offsetX, e.offsetY);
                    }
                  });
                }}
                onEvents={{
                  updateAxisPointer: (event: { dataIndex?: number; axesInfo?: Array<{ value: number }> }) => {
                    if (typeof event.dataIndex === 'number') {
                      setSelectedHourIndex(event.dataIndex);
                    } else if (event.axesInfo?.[0] && typeof event.axesInfo[0].value === 'number') {
                      const val = event.axesInfo[0].value;
                      if (val >= 0 && val < windowPoints.length) {
                        setSelectedHourIndex(val);
                      }
                    }
                  },
                }}
              />
            </div>

            {/* Selected Hour Indicator Bar */}
            <div className="flex items-center justify-between px-1 text-[11px] font-semibold text-slate-600">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span className="text-slate-500 font-normal">Kiválasztott óra:</span>
                <strong className="text-slate-900 font-extrabold">
                  {activeConsensusPoint ? formatFullDateTime(activeConsensusPoint.time) : '--'}
                </strong>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 text-[10px] font-bold border border-sky-200 shrink-0">
                <WeatherIcon name={activeWeather.iconName} className="w-3 h-3" />
                <span>{activeWeather.label}</span>
              </span>
            </div>

            {/* Synchronized 2x2 Metric Cards (Model's values at selected hour) */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Card 1: Hőmérséklet */}
              <div className="p-2 rounded-xl bg-slate-50/80 border border-slate-200/60 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 mb-0.5">
                  <span className="font-semibold text-[11px] uppercase tracking-tight">{HU_TEXTS.temperature}</span>
                  <Thermometer className="w-3.5 h-3.5 text-sky-600" />
                </div>
                <div className="text-base sm:text-lg font-extrabold tabular-nums text-slate-900">
                  {activeModelPoint ? `${activeModelPoint.temperature.toFixed(1)} °C` : '--'}
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">
                  Konszenzus: <strong className="text-slate-700">{consensusTemp?.toFixed(1) ?? '--'} °C</strong>
                </div>
              </div>

              {/* Card 2: Eltérés a konszenzustól */}
              <div className="p-2 rounded-xl bg-slate-50/80 border border-slate-200/60 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 mb-0.5">
                  <span className="font-semibold text-[11px] uppercase tracking-tight">Konszenzus eltérés</span>
                  <Activity className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                <div
                  className={`text-base sm:text-lg font-extrabold tabular-nums ${
                    delta > 0 ? 'text-amber-600' : delta < 0 ? 'text-sky-600' : 'text-slate-900'
                  }`}
                >
                  {delta > 0 ? `+${delta}` : delta} °C
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">
                  {delta > 0 ? 'Melegebb a modelleknél' : delta < 0 ? 'Hűvösebb a modelleknél' : 'Megegyezik'}
                </div>
              </div>

              {/* Card 3: Csapadék */}
              <div className="p-2 rounded-xl bg-slate-50/80 border border-slate-200/60 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 mb-0.5">
                  <span className="font-semibold text-[11px] uppercase tracking-tight">{HU_TEXTS.precipitation}</span>
                  <Droplets className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div className="text-base sm:text-lg font-extrabold tabular-nums text-slate-900">
                  {activeModelPoint ? `${activeModelPoint.precipitation.toFixed(1)} mm` : '0.0 mm'}
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">
                  Felhőzet: <strong className="text-slate-700">{activeModelPoint?.cloudCover ?? 0}%</strong>
                </div>
              </div>

              {/* Card 4: Szél & Légnyomás */}
              <div className="p-2 rounded-xl bg-slate-50/80 border border-slate-200/60 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 mb-0.5">
                  <span className="font-semibold text-[11px] uppercase tracking-tight">Szél & Nyomás</span>
                  <div className="flex items-center gap-1">
                    <Wind className="w-3 h-3 text-teal-600" />
                    <Gauge className="w-3 h-3 text-indigo-600" />
                  </div>
                </div>
                <div className="text-base sm:text-lg font-extrabold tabular-nums text-slate-900 truncate">
                  {activeModelPoint ? `${Math.round(activeModelPoint.windSpeed)} km/h` : '--'}
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">
                  Légnyomás: <strong className="text-slate-700">{activeModelPoint?.pressure ? Math.round(activeModelPoint.pressure) : 1013} hPa</strong>
                </div>
              </div>
            </div>

            {/* Model Description */}
            <div className="pt-1 border-t border-slate-100 text-[10px] text-slate-500 truncate">
              {info.description}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        <button
          type="button"
          onClick={prevSlide}
          aria-label="Előző forrás"
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2.5 w-7 h-7 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all z-20 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={nextSlide}
          aria-label="Következő forrás"
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2.5 w-7 h-7 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all z-20 cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 3. Slide Indicators & Back Button */}
      <div className="pt-1.5 border-t border-slate-200 flex flex-col items-center gap-1.5 shrink-0">
        {/* Dot indicators */}
        <div className="flex items-center gap-1.5">
          {models.map((m, idx) => {
            const isCurrent = idx === currentModelIndex;
            const modelInfo = WEATHER_MODEL_REGISTRY[m];
            return (
              <button
                key={m}
                type="button"
                onClick={() => setCurrentModelIndex(idx)}
                aria-label={modelInfo.shortName}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  isCurrent ? 'w-5 bg-sky-600' : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                }`}
              />
            );
          })}
        </div>

        {/* Back Button */}
        <button
          type="button"
          onClick={onBack}
          className="w-full py-1.5 px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-slate-300 text-slate-700 font-semibold text-xs flex items-center justify-center gap-2 shadow-2xs hover:shadow transition-all cursor-pointer"
        >
          <Layers className="w-3.5 h-3.5 text-slate-500" />
          <span>Vissza a konszenzusos nézetbe</span>
        </button>
      </div>
    </div>
  );
};
