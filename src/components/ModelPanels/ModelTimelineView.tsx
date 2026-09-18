import React, { useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import type { HourlyConsensusPoint, WeatherModel } from '../../types/weather';
import {
  SUPPORTED_MODELS,
  WEATHER_MODEL_REGISTRY,
} from '../../types/weather';
import {
  OMNI_GROUP,
  connectOmniGroup,
  getSingleModelChartOption,
} from '../../lib/echartsOptions';
import { Layers } from 'lucide-react';

export interface ModelTimelineViewProps {
  hourlyPoints: HourlyConsensusPoint[];
}

export const ModelTimelineView: React.FC<ModelTimelineViewProps> = ({
  hourlyPoints,
}) => {
  useEffect(() => {
    // Connect chart group once all instances mount
    const timer = setTimeout(() => {
      connectOmniGroup();
    }, 100);
    return () => clearTimeout(timer);
  }, [hourlyPoints]);

  if (hourlyPoints.length === 0) {
    return (
      <div className="glass-card p-8 text-center text-slate-400">
        No forecast timeline points available.
      </div>
    );
  }

  const timestamps = hourlyPoints.map((p) => p.time);

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
          <Layers className="w-3.5 h-3.5 text-sky-400" />
          <span>Synchronized Multi-Model Timelines</span>
        </div>
        <span className="text-[11px] text-slate-400">
          Hover cursor across any chart to inspect synchronized model divergence
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {SUPPORTED_MODELS.map((modelKey: WeatherModel) => {
          const info = WEATHER_MODEL_REGISTRY[modelKey];
          const temperatures = hourlyPoints.map(
            (p) => p.models[modelKey]?.temperature ?? 0
          );
          const rain = hourlyPoints.map(
            (p) => p.models[modelKey]?.precipitation ?? 0
          );

          const latestPoint = hourlyPoints[0]?.models[modelKey];

          const chartOption = getSingleModelChartOption(
            timestamps,
            temperatures,
            rain,
            info.color,
            info.shortName
          );

          return (
            <div
              key={modelKey}
              className="glass-panel rounded-xl p-3.5 relative overflow-hidden transition-all duration-200 border border-slate-800/80 hover:border-slate-700/80"
            >
              {/* Header Bar */}
              <div className="flex items-center justify-between px-1 pb-1">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full ring-2 ring-white/10"
                    style={{ backgroundColor: info.color }}
                  />
                  <span className="font-semibold text-slate-200 text-sm">
                    {info.name}
                  </span>
                  <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
                    {info.resolutionKm}km resolution
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="text-slate-400 hidden sm:inline">
                    Current:{' '}
                    <strong className="text-slate-100 font-semibold">
                      {latestPoint ? `${latestPoint.temperature.toFixed(1)}°C` : '--'}
                    </strong>
                  </span>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                    style={{
                      backgroundColor: info.badgeBg,
                      borderColor: info.badgeBorder,
                      color: info.color,
                    }}
                  >
                    {info.shortName}
                  </span>
                </div>
              </div>

              {/* Stacked ECharts Timeline */}
              <div className="w-full h-32 -mb-2">
                <ReactECharts
                  option={chartOption}
                  style={{ height: '100%', width: '100%' }}
                  opts={{ renderer: 'canvas' }}
                  notMerge={true}
                  lazyUpdate={true}
                  onChartReady={(instance) => {
                    // Set instance group and connect
                    instance.group = OMNI_GROUP;
                    connectOmniGroup();
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

