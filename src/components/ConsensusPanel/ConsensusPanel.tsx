import React from 'react';
import ReactECharts from 'echarts-for-react';
import type {
  DailyConsensusSummary,
  HourlyConsensusPoint,
} from '../../types/weather';
import {
  OMNI_GROUP,
  connectOmniGroup,
  getConsensusChartOption,
  formatTimeLabel,
} from '../../lib/echartsOptions';
import { classifyConfidence } from '../../lib/aggregator';
import { WeatherIcon } from '../Common/WeatherIcon';
import {
  Thermometer,
  Droplets,
  Wind,
  Gauge,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  Activity,
  MapPin,
} from 'lucide-react';
import { HU_TEXTS } from '../../lib/i18n';

export interface ConsensusPanelProps {
  hourlyPoints: HourlyConsensusPoint[];
  dailySummary?: DailyConsensusSummary;
  locationName?: string;
  country?: string;
  horizon?: 'most' | '24h' | '72h';
  currentHourIndex?: number;
}

export const ConsensusPanel: React.FC<ConsensusPanelProps> = ({
  hourlyPoints,
  dailySummary,
  locationName = 'Budapest',
  country = 'Magyarország',
  horizon = 'most',
  currentHourIndex = 0,
}) => {
  if (hourlyPoints.length === 0) {
    return (
      <div className="clean-card p-6 text-center text-slate-500">
        {HU_TEXTS.noData}
      </div>
    );
  }

  // Strictly locate instantaneous current hour point
  const current = hourlyPoints[currentHourIndex] || hourlyPoints[0]!;
  const confidence = classifyConfidence(current.confidenceScore);

  // Slice timeline starting at current real-time hour
  // 'most': immediate upcoming 10 hours for dense overview
  // '24h': next 24 hours
  // '72h': next 72 hours
  const filteredPoints =
    horizon === 'most'
      ? hourlyPoints.slice(currentHourIndex, currentHourIndex + 10)
      : horizon === '24h'
        ? hourlyPoints.slice(currentHourIndex, currentHourIndex + 24)
        : hourlyPoints.slice(currentHourIndex, currentHourIndex + 72);

  // Series arrays for ECharts
  const timestamps = filteredPoints.map((p) => p.time);
  const weightedTemps = filteredPoints.map((p) => p.weightedTemperature);
  const tempMins = filteredPoints.map((p) => p.tempMin);
  const tempMaxs = filteredPoints.map((p) => p.tempMax);
  const rainMedians = filteredPoints.map((p) => p.precipitationAmount);
  const confidenceScores = filteredPoints.map((p) => p.confidenceScore);

  const consensusOption = getConsensusChartOption(
    timestamps,
    weightedTemps,
    tempMins,
    tempMaxs,
    rainMedians,
    confidenceScores
  );

  // Derived metrics based on horizon
  const isMost = horizon === 'most';

  const periodTempMin = Math.min(...filteredPoints.map((p) => p.tempMin));
  const periodTempMax = Math.max(...filteredPoints.map((p) => p.tempMax));
  const periodTempAvg =
    filteredPoints.reduce((acc, p) => acc + p.weightedTemperature, 0) /
    (filteredPoints.length || 1);
  const periodTotalRain = filteredPoints.reduce(
    (acc, p) => acc + p.precipitationAmount,
    0
  );
  const periodMaxRainProb = Math.max(
    ...filteredPoints.map((p) => p.precipitationProbability),
    0
  );
  const periodMaxWind = Math.max(
    ...filteredPoints.map((p) => p.weightedWindSpeed),
    0
  );
  const periodAvgPressure =
    filteredPoints.reduce((acc, p) => acc + (p.weightedPressure || 1013), 0) /
    (filteredPoints.length || 1);
  const periodAvgSpread =
    filteredPoints.reduce((acc, p) => acc + p.tempSpread, 0) /
    (filteredPoints.length || 1);
  const periodAvgStdDev =
    filteredPoints.reduce((acc, p) => acc + p.stdDev, 0) /
    (filteredPoints.length || 1);

  return (
    <div className="clean-card p-3.5 sm:p-4 flex flex-col justify-between flex-1 min-h-0 bg-white border border-slate-200 shadow-sm overflow-hidden">
      {/* 1. Header: Location, Current Weather & Confidence Badge */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span className="font-semibold text-slate-900">{locationName}</span>
            <span className="text-slate-300">•</span>
            <span>{country}</span>
          </div>

          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {isMost ? `${Math.round(current.weightedTemperature)}°C` : `${Math.round(periodTempAvg)}°C`}
            </span>
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <WeatherIcon name={current.weatherIcon} className="w-3.5 h-3.5 text-sky-600" />
              {isMost ? current.weatherDescription : `${horizon.toUpperCase()} átlag`}
            </span>
            <span className="text-[11px] text-slate-400 hidden xs:inline">
              {isMost
                ? `(Tartomány: ${current.tempMin}° - ${current.tempMax}°)`
                : `(${horizon.toUpperCase()}: ${Math.round(periodTempMin)}° - ${Math.round(periodTempMax)}°)`}
            </span>
          </div>
        </div>

        {/* Dynamic Confidence Badge (compact, no truncation) */}
        <div
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-bold shrink-0 whitespace-nowrap shadow-2xs ${confidence.badgeClass}`}
        >
          {confidence.level === 'high' ? (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          ) : confidence.level === 'moderate' ? (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          ) : (
            <HelpCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          )}
          <span className="whitespace-nowrap">{confidence.score}% Konszenzus</span>
        </div>
      </div>

      {/* 2. Embedded ECharts Trend with Uncertainty Band */}
      <div className="w-full flex-1 min-h-[125px] max-h-[165px] my-0.5 relative">
        <ReactECharts
          option={consensusOption}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'canvas' }}
          notMerge={true}
          lazyUpdate={true}
          onChartReady={(instance) => {
            instance.group = OMNI_GROUP;
            connectOmniGroup();
          }}
        />
      </div>

      {/* 3. Primary Metrics Summary Grid: Temp, Spread, Rain, Wind, Pressure */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2 pt-2 border-t border-slate-100 text-xs">
        {/* Metric 1: Temp & Range */}
        <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-100/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-0.5">
            <span className="text-[11px] font-medium uppercase tracking-tight truncate">Hőmérséklet</span>
            <Thermometer className="w-3.5 h-3.5 text-sky-600 shrink-0" />
          </div>
          <div className="text-base sm:text-lg font-semibold text-slate-900 tabular-nums truncate">
            {isMost
              ? `${current.weightedTemperature.toFixed(1)}°C`
              : `${periodTempMin.toFixed(0)}° - ${periodTempMax.toFixed(0)}°`}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 truncate">
            {isMost
              ? dailySummary
                ? `Ma: ${dailySummary.tempMin}° / ${dailySummary.tempMax}°`
                : `±${(current.tempSpread / 2).toFixed(1)}°`
              : `Átlag: ${periodTempAvg.toFixed(1)}°C`}
          </div>
        </div>

        {/* Metric 2: Uncertainty Spread */}
        <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-100/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-0.5">
            <span className="text-[11px] font-medium uppercase tracking-tight truncate">Eltérés (szórás)</span>
            <Activity className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          </div>
          <div className="text-base sm:text-lg font-semibold text-slate-900 tabular-nums">
            ±{isMost ? (current.tempSpread / 2).toFixed(1) : (periodAvgSpread / 2).toFixed(1)}°C
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 truncate">
            {isMost ? `σ = ${current.stdDev.toFixed(2)}°C` : `Átlag σ = ${periodAvgStdDev.toFixed(2)}°C`}
          </div>
        </div>

        {/* Metric 3: Rain */}
        <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-100/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-0.5">
            <span className="text-[11px] font-medium uppercase tracking-tight truncate">Csapadék</span>
            <Droplets className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          </div>
          <div className="text-base sm:text-lg font-semibold text-slate-900 tabular-nums">
            {isMost ? `${current.precipitationProbability}%` : `${periodTotalRain.toFixed(1)} mm`}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 truncate">
            {isMost ? `${current.precipitationAmount.toFixed(1)} mm` : `Csúcs: ${periodMaxRainProb}%`}
          </div>
        </div>

        {/* Metric 4: Wind & Pressure */}
        <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-100/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-0.5">
            <span className="text-[11px] font-medium uppercase tracking-tight truncate">Szél / Nyomás</span>
            <div className="flex items-center gap-0.5 shrink-0">
              <Wind className="w-3.5 h-3.5 text-teal-600" />
              <Gauge className="w-3.5 h-3.5 text-indigo-600" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-semibold text-slate-900 tabular-nums">
            {isMost ? `${Math.round(current.weightedWindSpeed)} km/h` : `${Math.round(periodMaxWind)} km/h`}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 truncate">
            {isMost
              ? current.weightedPressure
                ? `${Math.round(current.weightedPressure)} hPa`
                : '1013 hPa'
              : `Átlag: ${Math.round(periodAvgPressure)} hPa`}
          </div>
        </div>
      </div>

      {/* 4. Compact Dense Hourly Breakdown Strip (Conserves Vertical Space) */}
      <div className="mt-1.5 pt-1.5 border-t border-slate-100">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1 px-1">
          <span>Időrendi bontás ({horizon === 'most' ? 'Következő órák' : horizon === '24h' ? '24 óra' : '72 óra'})</span>
          <span className="text-[10px] text-slate-400 font-normal">Hőmérséklet • Csapadék</span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin">
          {filteredPoints.slice(0, 14).map((pt) => {
            const timeLabel = formatTimeLabel(pt.time);
            return (
              <div
                key={pt.time}
                className="flex flex-col items-center justify-between py-1 px-1.5 rounded-lg bg-slate-50 border border-slate-100 min-w-[50px] sm:min-w-[54px] shrink-0 text-center"
              >
                <span className="text-[10px] font-semibold text-slate-600">
                  {timeLabel}
                </span>

                <WeatherIcon
                  name={pt.weatherIcon}
                  className="w-3.5 h-3.5 my-0.5 text-sky-600"
                />

                <span className="text-xs font-bold text-slate-900 tabular-nums">
                  {Math.round(pt.weightedTemperature)}°
                </span>

                <span className="text-[9px] text-blue-600 font-medium">
                  {pt.precipitationProbability > 0 ? `${pt.precipitationProbability}%` : '0%'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
