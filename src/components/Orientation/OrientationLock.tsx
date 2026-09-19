import React from 'react';
import { Smartphone } from 'lucide-react';
import { HU_TEXTS } from '../../lib/i18n';

export const OrientationLock: React.FC = () => {
  return (
    <div className="orientation-lock-overlay hidden fixed inset-0 z-[9999] bg-white text-slate-900 flex-col items-center justify-center p-6 text-center select-none shadow-2xl pt-[max(env(safe-area-inset-top),16px)] pb-[max(env(safe-area-inset-bottom),16px)]">
      <div className="w-16 h-16 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center mb-4 animate-bounce">
        <Smartphone className="w-8 h-8 text-sky-600 rotate-90" />
      </div>

      <h2 className="text-xl font-bold text-slate-900 mb-2">
        {HU_TEXTS.orientationTitle}
      </h2>

      <p className="text-sm text-slate-600 max-w-sm leading-relaxed">
        {HU_TEXTS.orientationDesc}
      </p>

      <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-sky-700 bg-sky-50 px-3.5 py-1.5 rounded-full border border-sky-200">
        <span>METSZET • Álló tájolás</span>
      </div>

      <style>{`
        @media (orientation: landscape) and (max-height: 600px),
               (orientation: landscape) and (max-width: 1024px) and (hover: none) and (pointer: coarse) {
          .orientation-lock-overlay {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
};

