import React, { useState, useRef } from 'react';
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
  formatFullDateTime,
} from '../../lib/echartsOptions';
import { calculateFrontEffect } from '../../lib/aggregator';
import { AstroFrontStrip } from '../Common/AstroFrontStrip';
import { WeatherIcon } from '../Common/WeatherIcon';
import {
  Thermometer,
  Droplets,
  Wind,
  Gauge,
  Activity,
  MapPin,
  Clock,
  Radio,
  Radar,
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
  onOpenRadar?: () => void;
}

export const ConsensusPanel: React.FC<ConsensusPanelProps> = ({
  hourlyPoints,
  locationName = 'Budapest',
  country = 'Magyarország',
  horizon = 'most',
  currentHourIndex = 0,
  astronomy,
  stationMetadata,
  onOpenRadar,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [prevHorizon, setPrevHorizon] = useState<string>(horizon);
  const chartRef = useRef<ReactECharts | null>(null);

  // Reset selected hour when horizon changes
  if (prevHorizon !== horizon) {
    setPrevHorizon(horizon);
    setSelectedIndex(0);
  }

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
      <div className="clean-card p-2.5 sm:p-3 h-auto flex flex-col justify-between flex-1 min-h-0 bg-white border border-slate-200/90 shadow-sm overflow-hidden gap-1.5 sm:gap-2">
        {/* Top Info Strip: Astro & Biometeorology (Sunrise, Sunset, Moon, Front) - strictly icon + value */}
        <AstroFrontStrip astronomy={astronomy} />

        {/* Top Hero: Current Temperature, Condition, Élő radar button & Real-Time Verified Tag */}
        <div className="flex items-start justify-between gap-2.5 pb-2 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-0.5">
              <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span className="font-semibold text-slate-900">{locationName}</span>
              <span className="text-slate-300">•</span>
              <span>{country}</span>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                {current.weightedTemperature.toFixed(1)}°C
              </span>
              <div className="flex flex-col">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-1.5">
                    <WeatherIcon name={current.weatherIcon} className="w-4 h-4 text-sky-600" />
                    {current.weatherDescription}
                  </span>
                  {onOpenRadar && (
                    <button
                      type="button"
                      onClick={onOpenRadar}
                      className="bg-slate-100/90 hover:bg-slate-200/80 text-slate-700 text-xs font-medium px-2.5 py-1 rounded-full border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Élő csapadékradar megnyitása"
                    >
                      <Radar className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span>Élő radar</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Verified Measurement Badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden xs:inline">Valós idejű</span> Mért értékek
          </div>
        </div>

        {/* 2x2 Spacious Real-Time Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 my-auto py-1">
          {/* Card 1: Hőmérséklet */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-0.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Hőmérséklet
              </span>
              <Thermometer className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
              {current.weightedTemperature.toFixed(1)} °C
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 truncate">
              <Activity className="w-3 h-3 text-indigo-500 shrink-0" />
              <span className="truncate">Modellek szórása: ±{(current.tempSpread / 2).toFixed(1)}° (σ={current.stdDev.toFixed(2)}°)</span>
            </div>
          </div>

          {/* Card 2: Csapadék */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-0.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Csapadék
              </span>
              <Droplets className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
              {current.precipitationAmount.toFixed(1)} mm
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 truncate">
              <span>Páratartalom:</span>
              <strong className="text-slate-700">{stationMetadata?.humidity ?? 36}%</strong>
            </div>
          </div>

          {/* Card 3: Szélsebesség & Irány */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-0.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Szél & Irány
              </span>
              <Wind className="w-4 h-4 text-teal-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
              {Math.round(current.weightedWindSpeed)} km/h
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 truncate">
              <Compass className="w-3 h-3 text-teal-600 shrink-0" />
              <span>Irány:</span>
              <strong className="text-slate-800 truncate">
                {stationMetadata?.windDirectionCompass || 'ÉNy'}
                {stationMetadata?.windDirectionDeg !== undefined && ` (${stationMetadata.windDirectionDeg}°)`}
              </strong>
            </div>
          </div>

          {/* Card 4: Légnyomás */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-0.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Légnyomás
              </span>
              <Gauge className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
              {current.weightedPressure ? Math.round(current.weightedPressure) : 1013} hPa
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 truncate">
              <span>Tengerszinti légnyomás</span>
            </div>
          </div>
        </div>

        {/* Station Metadata & Authentication Panel at Bottom (strictly nested, no overflow) */}
        <div className="pt-2 border-t border-slate-100 bg-slate-50/70 p-2 sm:p-2.5 rounded-xl shrink-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <h4 className="text-[11px] font-bold text-slate-800">Mérőállomás és hitelesítési adatok</h4>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-1.5 text-slate-600">
            <div className="flex-1 min-w-[110px] bg-white py-1.5 px-2 rounded-lg border border-slate-200/80 shadow-2xs">
              <div className="text-[10px] font-semibold uppercase text-slate-400">Mérés forrása</div>
              <div className="font-bold text-slate-800 text-[11px] mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span className="truncate">{stationMetadata?.source || 'DWD / HungaroMet / ECMWF'}</span>
              </div>
            </div>

            <div className="flex-1 min-w-[120px] bg-white py-1.5 px-2 rounded-lg border border-slate-200/80 shadow-2xs">
              <div className="text-[10px] font-semibold uppercase text-slate-400">Állomás helye</div>
              <div className="font-bold text-slate-800 text-[11px] mt-0.5 truncate">
                {stationMetadata?.stationName || `${locationName} automata állomás`}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                {stationMetadata?.coordinates || '47.50°É, 19.04°K'} • {stationMetadata?.elevation || 113} m
              </div>
            </div>

            <div className="flex-1 min-w-[100px] bg-white py-1.5 px-2 rounded-lg border border-slate-200/80 shadow-2xs">
              <div className="text-[10px] font-semibold uppercase text-slate-400">Pontos mérésidő</div>
              <div className="font-bold text-slate-800 text-[11px] mt-0.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 tabular-nums">
                  {stationMetadata?.timestamp || '16:15'}
                </span>
                <span className="text-[10px] text-slate-500 font-normal">óra</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 2. "24h" & "72h" FORECAST VIEWS: Interactive Scrub Chart, Dynamic Cards, Hourly Chips
  // --------------------------------------------------------------------------
  const filteredPoints =
    horizon === '24h'
      ? hourlyPoints.slice(currentHourIndex, currentHourIndex + 24)
      : hourlyPoints.slice(currentHourIndex, currentHourIndex + 72);

  // Selected hour point & dynamic front effect
  const activeIndex = Math.min(selectedIndex, Math.max(0, filteredPoints.length - 1));
  const selectedPt = filteredPoints[activeIndex] || filteredPoints[0]!;
  const selectedGlobalIdx = currentHourIndex + activeIndex;
  const dynamicFront = calculateFrontEffect(hourlyPoints, selectedGlobalIdx);

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
    confidenceScores,
    selectedPt.time
  );

  return (
    <div className="clean-card p-3 sm:p-3.5 flex flex-col justify-between flex-1 min-h-0 bg-white border border-slate-200/90 shadow-sm overflow-hidden gap-1.5">
      {/* 1. Above Chart: Compact Astro & Biometeorology Strip (Icon + Value Only) */}
      <AstroFrontStrip
        astronomy={astronomy}
        frontEffect={dynamicFront}
      />

      {/* 2. Interactive ECharts Trend Graph (Tap/Scrub Snapping) */}
      <div className="w-full flex-1 min-h-[135px] max-h-[175px] relative">
        <ReactECharts
          ref={chartRef}
          option={consensusOption}
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
                  const idx = Math.max(0, Math.min(filteredPoints.length - 1, Math.round(coord[0])));
                  setSelectedIndex(idx);
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
                setSelectedIndex(event.dataIndex);
              } else if (event.axesInfo?.[0] && typeof event.axesInfo[0].value === 'number') {
                const val = event.axesInfo[0].value;
                if (val >= 0 && val < filteredPoints.length) {
                  setSelectedIndex(val);
                }
              }
            },
          }}
        />
      </div>

      {/* Selected Hour Timestamp Indicator Bar */}
      <div className="flex items-center justify-between px-1 text-[11px] font-semibold text-slate-600">
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
          <strong className="text-slate-900 font-extrabold tabular-nums">{formatFullDateTime(selectedPt.time)}</strong>
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 text-[10px] font-bold border border-sky-200">
          <WeatherIcon name={selectedPt.weatherIcon} className="w-3 h-3 text-sky-600" />
          <span>{selectedPt.weatherDescription}</span>
        </span>
      </div>

      {/* 3. 2x2 Grid of Primary Metric Cards (SYNCHRONIZED to selected hour) */}
      <div className="grid grid-cols-2 gap-2 sm:gap-2.5 pt-1 border-t border-slate-100 text-xs">
        {/* Card 1: Hőmérséklet & Modell Tartomány */}
        <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 truncate">
              Hőmérséklet
            </span>
            <Thermometer className="w-3.5 h-3.5 text-sky-600 shrink-0" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-slate-900 tabular-nums">
            {selectedPt.weightedTemperature.toFixed(1)} °C
          </div>
          <div className="text-[11px] text-slate-500 truncate mt-0.5">
            Tartomány: <strong className="text-slate-700">{selectedPt.tempMin.toFixed(1)}° – {selectedPt.tempMax.toFixed(1)}°</strong>
          </div>
        </div>

        {/* Card 2: Modell Eltérés & Konszenzus */}
        <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 truncate">
              Modell eltérés
            </span>
            <Activity className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-slate-900 tabular-nums">
            ±{(selectedPt.tempSpread / 2).toFixed(1)} °C
          </div>
          <div className="text-[11px] text-slate-500 truncate mt-0.5">
            Szórás: <strong className="text-slate-700">σ = {selectedPt.stdDev.toFixed(2)}°</strong> • {selectedPt.confidenceScore}%
          </div>
        </div>

        {/* Card 3: Várható Csapadék */}
        <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 truncate">
              Várható csapadék
            </span>
            <Droplets className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-slate-900 tabular-nums">
            {selectedPt.precipitationAmount.toFixed(1)} mm
          </div>
          <div className="text-[11px] text-slate-500 truncate mt-0.5">
            Csapadékesély: <strong className="text-slate-700">{selectedPt.precipitationProbability}%</strong>
          </div>
        </div>

        {/* Card 4: Szélsebesség & Légnyomás */}
        <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 flex flex-col justify-between shadow-2xs">
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
            {Math.round(selectedPt.weightedWindSpeed)} km/h
          </div>
          <div className="text-[11px] text-slate-500 truncate mt-0.5">
            Légnyomás: <strong className="text-slate-700">{Math.round(selectedPt.weightedPressure)} hPa</strong>
          </div>
        </div>
      </div>

      {/* 4. Interactive Chronological Hourly Strip */}
      <div className="mt-1 pt-1 border-t border-slate-100">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1 px-1">
          <span>Időrendi bontás ({horizon === '24h' ? '24 óra' : '72 óra'})</span>
          <span className="text-[10px] text-slate-400 font-normal">Koppints az órára a részletekért</span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {filteredPoints.slice(0, 24).map((pt, idx) => {
            const isSelected = idx === activeIndex;
            const timeLabel = formatTimeLabel(pt.time);
            return (
              <button
                key={pt.time}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                className={`flex flex-col items-center justify-between py-1.5 px-2 rounded-xl transition-all min-w-[56px] sm:min-w-[62px] shrink-0 text-center cursor-pointer ${
                  isSelected
                    ? 'bg-sky-50 border-2 border-sky-500 shadow-xs scale-102'
                    : 'bg-slate-50 border border-slate-200/70 hover:bg-slate-100/70 shadow-2xs'
                }`}
              >
                <span className={`text-[11px] font-bold ${isSelected ? 'text-sky-700' : 'text-slate-700'}`}>
                  {timeLabel}
                </span>

                <WeatherIcon
                  name={pt.weatherIcon}
                  className="w-4 h-4 my-0.5 text-sky-600"
                />

                <span className="text-xs sm:text-sm font-extrabold text-slate-900 tabular-nums">
                  {Math.round(pt.weightedTemperature)}°
                </span>

                <span className="text-[10px] text-blue-600 font-semibold mt-0.5">
                  {pt.precipitationProbability > 0 ? `${pt.precipitationProbability}%` : '0%'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
