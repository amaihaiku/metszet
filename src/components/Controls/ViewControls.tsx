import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Calendar, Zap } from 'lucide-react';
import { HU_TEXTS } from '../../lib/i18n';

export type TimeHorizon = 'most' | '24h' | '72h';

export interface ViewControlsProps {
  horizon: TimeHorizon;
  onHorizonChange: (horizon: TimeHorizon) => void;
}

const HORIZON_OPTIONS: Array<{
  id: TimeHorizon;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'most', label: HU_TEXTS.horizonMost, icon: Zap },
  { id: '24h', label: HU_TEXTS.horizon24h, icon: Clock },
  { id: '72h', label: HU_TEXTS.horizon72h, icon: Calendar },
];

export const ViewControls: React.FC<ViewControlsProps> = ({
  horizon,
  onHorizonChange,
}) => {
  return (
    <div className="w-full flex items-center justify-center">
      <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200/80 shadow-inner">
        {HORIZON_OPTIONS.map((opt) => {
          const isActive = horizon === opt.id;
          const Icon = opt.icon;

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onHorizonChange(opt.id)}
              className={`relative px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all z-10 ${
                isActive
                  ? 'text-sky-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeHorizonPill"
                  className="absolute inset-0 rounded-lg bg-white border border-slate-200 shadow-sm -z-10"
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.3 }}
                />
              )}
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
