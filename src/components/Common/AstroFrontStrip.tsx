import React from 'react';
import type { AstronomyInfo, FrontEffect } from '../../types/weather';

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
  const moonGlyph = moonPhase?.glyph || '🌓';
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
      {/* 1. Sunrise: 🌅 [time] */}
      <div
        className="flex items-center gap-1 text-xs font-semibold"
        title={`Napkelte: ${sunrise}`}
      >
        <span className="text-sm shrink-0" role="img" aria-label="Napkelte">
          🌅
        </span>
        <span className="tabular-nums font-bold text-slate-900">{sunrise}</span>
      </div>

      <span className="text-slate-200 font-light">|</span>

      {/* 2. Sunset: 🌇 [time] */}
      <div
        className="flex items-center gap-1 text-xs font-semibold"
        title={`Napnyugta: ${sunset}`}
      >
        <span className="text-sm shrink-0" role="img" aria-label="Napnyugta">
          🌇
        </span>
        <span className="tabular-nums font-bold text-slate-900">{sunset}</span>
      </div>

      <span className="text-slate-200 font-light">|</span>

      {/* 3. Moon Phase: 🌓 [pct]% [trend] */}
      <div
        className="flex items-center gap-1 text-xs font-semibold"
        title={`Holdfázis: ${moonName} (${moonPct}% ${moonTrend === '↑' ? 'növekvő' : 'fogyó'})`}
      >
        <span className="text-sm shrink-0" role="img" aria-label={moonName}>
          {moonGlyph}
        </span>
        <span className="tabular-nums font-bold text-slate-900">
          {moonPct}% {moonTrend}
        </span>
      </div>

      <span className="text-slate-200 font-light">|</span>

      {/* 4. Front Effect: ⚡ [icon] */}
      <div
        className="flex items-center gap-1 text-xs font-semibold"
        title={`Fronthatás: ${activeFront.label} (${activeFront.deltaPressure6h > 0 ? '+' : ''}${activeFront.deltaPressure6h} hPa / 6h)`}
      >
        <span className="text-sm shrink-0" role="img" aria-label="Fronthatás">
          ⚡
        </span>
        <span
          className={`font-bold ${
            activeFront.type === 'cold'
              ? 'text-sky-600'
              : activeFront.type === 'warm'
                ? 'text-rose-600'
                : activeFront.type === 'mixed'
                  ? 'text-purple-600'
                  : 'text-slate-400'
          }`}
        >
          {activeFront.icon}
        </span>
      </div>
    </div>
  );
};

