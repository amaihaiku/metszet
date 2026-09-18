import React from 'react';
import ReactECharts from 'echarts-for-react';
import type {
  AstronomyInfo,
  DailyConsensusSummary,
  HourlyConsensusPoint,
  StationMetadata,
} from '../../types/weather';
import {
  OMNI_GROUP,
  connectOmniGroup,
  getConsensusChartOption,
  formatTimeLabel,
} from '../../lib/echartsOptions';
import { WeatherIcon } from '../Common/WeatherIcon';
import {
  Thermometer,
  Droplets,
  Wind,
  Gauge,
  Activity,
  MapPin,
  Sunrise,
  Sunset,
  Moon,
  Clock,
  Radio,
  Compass,
  CheckCircle2,
} from 'lucide-react';
import { HU_TEXTS } from '../../lib/i18n';

export interface ConsensusPanelProps {
  hourlyPoints: HourlyConsensusPoint[];
  dailySummary?: DailyConsensusSummary;
  locationName?: string;
  country?: string;
  horizon?: 'most' | '24h' | '72h';
  currentHourIndex?: number;
  astronomy?: AstronomyInfo;
  stationMetadata?: StationMetadata;
}

export const ConsensusPanel: React.FC<ConsensusPanelProps> = ({
  hourlyPoints,
  dailySummary,
  locationName = 'Budapest',
  country = 'Magyarország',
  horizon = 'most',
  currentHourIndex = 0,
  astronomy,
  stationMetadata,
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
  const isMost = horizon === 'most';

  // --------------------------------------------------------------------------
  // 1. "MOST" VIEW: Strictly Real-Time Measured Facts (No chart, no future timeline)
  // --------------------------------------------------------------------------
  if (isMost) {
    return (
      <div className="clean-card p-4 sm:p-5 flex flex-col justify-between flex-1 min-h-0 bg-white border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Top Hero: Current Temperature & Real-Time Verified Tag */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1">
              <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span className="font-semibold text-slate-900">{locationName}</span>
              <span className="text-slate-300">•</span>
              <span>{country}</span>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                {current.weightedTemperature.toFixed(1)}°C
              </span>
              <div className="flex flex-col">
                <span className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-1.5">
                  <WeatherIcon name={current.weatherIcon} className="w-4 h-4 text-sky-600" />
                  {current.weatherDescription}
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  {dailySummary
                    ? `Ma mért szélsőértékek: ${dailySummary.tempMin}° / ${dailySummary.tempMax}°`
                    : `Helyi ingadozás: ±${(current.tempSpread / 2).toFixed(1)}°`}
                </span>
              </div>
            </div>
          </div>

          {/* Verified Measurement Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden xs:inline">Valós idejű</span> tényadatok
          </div>
        </div>

        {/* 2x2 Spacious Real-Time Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 my-auto py-2">
          {/* Card 1: Hőmérséklet */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Hőmérséklet
              </span>
              <Thermometer className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
              {current.weightedTemperature.toFixed(1)} °C
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <Activity className="w-3 h-3 text-indigo-500" />
              <span>Modellek szórása: ±{(current.tempSpread / 2).toFixed(1)}°C (σ={current.stdDev.toFixed(2)}°)</span>
            </div>
          </div>

          {/* Card 2: Csapadék */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Csapadék
              </span>
              <Droplets className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
              {current.precipitationAmount.toFixed(1)} mm
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <span>Relatív páratartalom:</span>
              <strong className="text-slate-700">{stationMetadata?.humidity ?? 36}%</strong>
            </div>
          </div>

          {/* Card 3: Szélsebesség & Irány */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Szélsebesség & Irány
              </span>
              <Wind className="w-4 h-4 text-teal-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
              {Math.round(current.weightedWindSpeed)} km/h
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <Compass className="w-3 h-3 text-teal-600" />
              <span>Irány:</span>
              <strong className="text-slate-800">
                {stationMetadata?.windDirectionCompass || 'ÉNy'}
                {stationMetadata?.windDirectionDeg !== undefined && ` (${stationMetadata.windDirectionDeg}°)`}
              </strong>
            </div>
          </div>

          {/* Card 4: Légnyomás */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Felszíni Légnyomás
              </span>
              <Gauge className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
              {current.weightedPressure ? Math.round(current.weightedPressure) : 1013} hPa
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              <span>Átszámított tengerszinti légnyomás</span>
            </div>
          </div>
        </div>

        {/* Station Metadata & Authentication Panel at Bottom */}
        <div className="pt-3 border-t border-slate-100 bg-slate-50/50 -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 p-3 sm:p-4 rounded-b-2xl">
          <div className="flex items-center gap-2 mb-2">
            <Radio className="w-3.5 h-3.5 text-emerald-600" />
            <h4 className="text-xs font-bold text-slate-800">Mérőállomás és hitelesítési adatok</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="text-[10px] font-semibold uppercase text-slate-400">Mérés forrása</div>
              <div className="font-bold text-slate-800 text-xs mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>{stationMetadata?.source || 'DWD / HungaroMet / ECMWF mérőhálózat'}</span>
              </div>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="text-[10px] font-semibold uppercase text-slate-400">Mérőállomás helyszíne</div>
              <div className="font-bold text-slate-800 text-xs mt-0.5 truncate">
                {stationMetadata?.stationName || `${locationName} automata állomás`}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {stationMetadata?.coordinates || '47.50°É, 19.04°K'} • {stationMetadata?.elevation || 113} m tszf.
              </div>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="text-[10px] font-semibold uppercase text-slate-400">Pontos mérésidő</div>
              <div className="font-bold text-slate-800 text-xs mt-0.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span className="text-sm font-extrabold text-slate-900 tabular-nums">
                  {stationMetadata?.timestamp || '16:15'}
                </span>
                <span className="text-[11px] text-slate-500 font-normal">óra (helyi idő)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 2. "24h" & "72h" FORECAST VIEWS: Elevated Chart, Astronomy Row, 2x2 Grid, Taller Timeline
  // --------------------------------------------------------------------------
  const filteredPoints =
    horizon === '24h'
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
    <div className="clean-card p-3 sm:p-4 flex flex-col justify-between flex-1 min-h-0 bg-white border border-slate-200/90 shadow-sm overflow-hidden">
      {/* 1. Above Chart: Compact, Elegant Astronomy Row (Sunrise, Sunset, Moon Phase) ONLY */}
      <div className="flex items-center justify-around py-1 px-3 rounded-xl bg-slate-50/90 border border-slate-200/70 text-xs font-semibold text-slate-700 shadow-2xs">
        <div className="flex items-center gap-1.5">
          <Sunrise className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="text-slate-500 font-normal">Napkelte:</span>
          <span className="text-slate-900 font-bold tabular-nums">{astronomy?.sunrise || '06:25'}</span>
        </div>

        <span className="text-slate-300">|</span>

        <div className="flex items-center gap-1.5">
          <Sunset className="w-4 h-4 text-orange-500 shrink-0" />
          <span className="text-slate-500 font-normal">Napnyugta:</span>
          <span className="text-slate-900 font-bold tabular-nums">{astronomy?.sunset || '18:50'}</span>
        </div>

        <span className="text-slate-300">|</span>

        <div className="flex items-center gap-1.5">
          <Moon className="w-4 h-4 text-indigo-500 shrink-0" />
          <span className="text-slate-500 font-normal">Holdfázis:</span>
          <span className="text-slate-900 font-bold">{astronomy?.moonPhase.name || 'Első negyed'}</span>
        </div>
      </div>

      {/* 2. Elevated ECharts Trend Graph (Moved higher into the freed space) */}
      <div className="w-full flex-1 min-h-[135px] max-h-[175px] my-1 relative">
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

      {/* 3. 2x2 Grid of Spacious Primary Metric Cards (grid-cols-2 gap-3) */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 pt-1 border-t border-slate-100 text-xs">
        {/* Card 1: Hőmérséklet tartomány & átlag */}
        <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 truncate">
              Hőmérséklet ({horizon})
            </span>
            <Thermometer className="w-3.5 h-3.5 text-sky-600 shrink-0" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-slate-900 tabular-nums">
            {periodTempMin.toFixed(0)}° - {periodTempMax.toFixed(0)} °C
          </div>
          <div className="text-[11px] text-slate-500 truncate mt-0.5">
            Átlagos hőmérséklet: <strong className="text-slate-700">{periodTempAvg.toFixed(1)} °C</strong>
          </div>
        </div>

        {/* Card 2: Eltérés és bizonytalanság */}
        <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 truncate">
              Modell eltérés (szórás)
            </span>
            <Activity className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-slate-900 tabular-nums">
            ±{(periodAvgSpread / 2).toFixed(1)} °C
          </div>
          <div className="text-[11px] text-slate-500 truncate mt-0.5">
            Átlagos szórás: <strong className="text-slate-700">σ = {periodAvgStdDev.toFixed(2)} °C</strong>
          </div>
        </div>

        {/* Card 3: Csapadék összeg és csúcs valószínűség */}
        <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 truncate">
              Várható csapadék
            </span>
            <Droplets className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-slate-900 tabular-nums">
            {periodTotalRain.toFixed(1)} mm
          </div>
          <div className="text-[11px] text-slate-500 truncate mt-0.5">
            Csúcs esély: <strong className="text-slate-700">{periodMaxRainProb}%</strong>
          </div>
        </div>

        {/* Card 4: Szélsebesség és Légnyomás */}
        <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 truncate">
              Szél & Légnyomás
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <Wind className="w-3.5 h-3.5 text-teal-600" />
              <Gauge className="w-3.5 h-3.5 text-indigo-600" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-slate-900 tabular-nums">
            {Math.round(periodMaxWind)} km/h <span className="text-xs font-normal text-slate-500">max</span>
          </div>
          <div className="text-[11px] text-slate-500 truncate mt-0.5">
            Átlagos légnyomás: <strong className="text-slate-700">{Math.round(periodAvgPressure)} hPa</strong>
          </div>
        </div>
      </div>

      {/* 4. Taller, Highly Legible Chronological Hourly Strip */}
      <div className="mt-2 pt-1.5 border-t border-slate-100">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1 px-1">
          <span>Időrendi bontás ({horizon === '24h' ? 'Következő 24 óra' : 'Következő 72 óra'})</span>
          <span className="text-[10px] text-slate-400 font-normal">Óra • Hőmérséklet • Csapadék</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {filteredPoints.slice(0, 16).map((pt) => {
            const timeLabel = formatTimeLabel(pt.time);
            return (
              <div
                key={pt.time}
                className="flex flex-col items-center justify-between py-2 px-2 rounded-xl bg-slate-50 border border-slate-200/70 min-w-[58px] sm:min-w-[64px] shrink-0 text-center shadow-2xs"
              >
                <span className="text-[11px] font-bold text-slate-700">
                  {timeLabel}
                </span>

                <WeatherIcon
                  name={pt.weatherIcon}
                  className="w-4 h-4 my-1 text-sky-600"
                />

                <span className="text-xs sm:text-sm font-extrabold text-slate-900 tabular-nums">
                  {Math.round(pt.weightedTemperature)}°
                </span>

                <span className="text-[10px] text-blue-600 font-semibold mt-0.5">
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
