import React from 'react';
import type { AstronomyInfo, FrontEffect } from '../../types/weather';
import {
  Sunrise,
  Sunset,
  Moon,
  ArrowUp,
  ArrowDown,
  Zap,
  Snowflake,
  Flame,
  Minus,
} from 'lucide-react';

export interface AstroFrontStripProps {
  astronomy?: AstronomyInfo;
  frontEffect?: FrontEffect;
  className?: string;
}

export const AstroFrontStrip: React.FC<AstroFrontStripProps> = ({
  astronomy,
  frontEffect,
  className = '',
}) => {
  const sunrise = astronomy?.sunrise || '06:25';
  const sunset = astronomy?.sunset || '18:50';

  const moonPhase = astronomy?.moonPhase;
  const moonPct = moonPhase?.percentage ?? 50;
  const moonTrend = moonPhase?.trend || '↑';
  const moonName = moonPhase?.name || 'Holdfázis';

  const activeFront = frontEffect || astronomy?.frontEffect || {
    type: 'none',
    icon: '—',
    label: 'Nincs fronthatás',
    severity: 'mild',
    deltaPressure6h: 0,
  };

  return (
    <div
      className={`w-full flex items-center justify-between sm:justify-around py-1.5 px-3 rounded-xl bg-slate-50/90 border border-slate-200/80 shadow-2xs select-none text-slate-800 ${className}`}
    >
      {/* 1. Sunrise: Outline icon + time */}
      <div
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-800"
        title={`Napkelte: ${sunrise}`}
      >
        <Sunrise className="w-4 h-4 text-amber-500 shrink-0" strokeWidth={1.75} />
        <span className="tabular-nums font-bold text-slate-900">{sunrise}</span>
      </div>

      <span className="text-slate-200 font-light">|</span>

      {/* 2. Sunset: Outline icon + time */}
      <div
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-800"
        title={`Napnyugta: ${sunset}`}
      >
        <Sunset className="w-4 h-4 text-orange-500 shrink-0" strokeWidth={1.75} />
        <span className="tabular-nums font-bold text-slate-900">{sunset}</span>
      </div>

      <span className="text-slate-200 font-light">|</span>

      {/* 3. Moon Phase: Outline Moon + percentage + line trend arrow */}
      <div
        className="flex items-center gap-1 text-xs font-semibold text-slate-800"
        title={`Holdfázis: ${moonName} (${moonPct}% ${moonTrend === '↑' ? 'növekvő' : 'fogyó'})`}
      >
        <Moon className="w-3.5 h-3.5 text-indigo-500 shrink-0" strokeWidth={1.75} />
        <span className="tabular-nums font-bold text-slate-900">{moonPct}%</span>
        {moonTrend === '↑' ? (
          <ArrowUp className="w-3 h-3 text-indigo-600 shrink-0" strokeWidth={2} />
        ) : (
          <ArrowDown className="w-3 h-3 text-indigo-400 shrink-0" strokeWidth={2} />
        )}
      </div>

      <span className="text-slate-200 font-light">|</span>

      {/* 4. Front Effect: Outline Zap + stylized line front badge */}
      <div
        className="flex items-center gap-1 text-xs font-semibold"
        title={`Fronthatás: ${activeFront.label} (${activeFront.deltaPressure6h > 0 ? '+' : ''}${activeFront.deltaPressure6h} hPa / 6h)`}
      >
        <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" strokeWidth={1.75} />
        {activeFront.type === 'cold' ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-bold">
            <Snowflake className="w-3 h-3 text-sky-600 shrink-0" strokeWidth={1.75} />
            <span>Hideg</span>
          </span>
        ) : activeFront.type === 'warm' ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
            <Flame className="w-3 h-3 text-rose-500 shrink-0" strokeWidth={1.75} />
            <span>Meleg</span>
          </span>
        ) : activeFront.type === 'mixed' ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
            <Snowflake className="w-2.5 h-2.5 text-sky-600 shrink-0" strokeWidth={1.75} />
            <Flame className="w-2.5 h-2.5 text-rose-500 shrink-0" strokeWidth={1.75} />
            <span>Kettős</span>
          </span>
        ) : (
          <span className="inline-flex items-center px-1 py-0.5 text-slate-400">
            <Minus className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
          </span>
        )}
      </div>
    </div>
  );
};
