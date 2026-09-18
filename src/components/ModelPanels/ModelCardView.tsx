import React from 'react';
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
import { Droplets, Wind, ArrowUp, ArrowDown, Activity } from 'lucide-react';

export interface ModelCardViewProps {
  currentHour?: HourlyConsensusPoint;
  todaySummary?: DailyConsensusSummary;
}

export const ModelCardView: React.FC<ModelCardViewProps> = ({
  currentHour,
  todaySummary,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {SUPPORTED_MODELS.map((modelKey: WeatherModel) => {
        const info = WEATHER_MODEL_REGISTRY[modelKey];
        const point = currentHour?.models[modelKey];
        const weather = getWeatherCodeDetails(point?.weatherCode ?? 0);

        // Calculate delta against the consensus weighted temperature
        const delta =
          point && currentHour
            ? Number((point.temperature - currentHour.weightedTemperature).toFixed(1))
            : null;

        return (
          <div
            key={modelKey}
            className="clean-card p-4 flex flex-col justify-between relative overflow-hidden bg-white shadow-xs border border-slate-200/80 transition-all duration-300"
            style={{
              borderTop: `3px solid ${info.color}`,
            }}
          >
            {/* Top ambient color glow */}
            <div
              className="absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl pointer-events-none opacity-10"
              style={{ backgroundColor: info.color }}
            />

            {/* Header: Model identifier and metadata */}
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: info.color }}
                    />
                    <h3 className="font-bold text-slate-900 text-sm tracking-wide">
                      {info.shortName}
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate max-w-[150px] mt-0.5">
                    {info.agency} • {info.resolutionKm} km felbontás
                  </p>
                </div>

                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                  style={{
                    backgroundColor: info.badgeBg,
                    borderColor: info.badgeBorder,
                    color: info.color,
                  }}
                >
                  {Math.round(info.defaultWeight * 100)}% súly
                </span>
              </div>

              {/* Main Temperature & Weather Icon */}
              <div className="flex items-center justify-between my-3">
                <div>
                  <div className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-baseline gap-1">
                    {point ? `${Math.round(point.temperature)}°` : '--'}
                    <span className="text-xs font-semibold text-slate-500">
                      {point ? `${point.temperature.toFixed(1)}°C` : ''}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 font-medium flex items-center gap-1.5 mt-1">
                    <span>{weather.label}</span>
                    {todaySummary && (
                      <span className="text-[11px] text-slate-400 font-normal">
                        • Ma: {todaySummary.tempMin}°/{todaySummary.tempMax}°
                      </span>
                    )}
                  </div>
                </div>

                <div
                  className="p-2.5 rounded-2xl border border-slate-100 shadow-2xs"
                  style={{ backgroundColor: `${info.color}15` }}
                >
                  <WeatherIcon
                    name={weather.iconName}
                    className="w-7 h-7"
                    style={{ color: info.color }}
                  />
                </div>
              </div>
            </div>

            {/* Delta vs Consensus Pill */}
            {delta !== null && (
              <div className="my-2 py-1 px-2.5 rounded-lg bg-slate-50/80 border border-slate-200/60 flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1 text-[11px] font-medium">
                  <Activity className="w-3 h-3 text-slate-400" />
                  Eltérés a konszenzustól:
                </span>
                <span
                  className={`font-semibold flex items-center gap-0.5 ${
                    delta > 0
                      ? 'text-amber-600'
                      : delta < 0
                        ? 'text-sky-600'
                        : 'text-slate-600'
                  }`}
                >
                  {delta > 0 ? (
                    <ArrowUp className="w-3 h-3" />
                  ) : delta < 0 ? (
                    <ArrowDown className="w-3 h-3" />
                  ) : null}
                  {delta > 0 ? `+${delta}°` : `${delta}°`}
                </span>
              </div>
            )}

            {/* Metrics Footer: Precipitation & Wind Speed */}
            <div className="pt-2.5 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-slate-600">
                <Droplets className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="text-[11px] text-slate-500">Eső:</span>
                <span className="font-semibold text-slate-900 tabular-nums">
                  {point ? `${point.precipitation.toFixed(1)} mm` : '--'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-slate-600 justify-end">
                <Wind className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span className="text-[11px] text-slate-500">Szél:</span>
                <span className="font-semibold text-slate-900 tabular-nums">
                  {point ? `${Math.round(point.windSpeed)} km/h` : '--'}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
