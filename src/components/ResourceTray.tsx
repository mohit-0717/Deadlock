import React from 'react';
import { Database, Activity, Cpu } from 'lucide-react';

interface ResourceTrayProps {
  resourceNames: string[];
  available: number[];
  workVector?: number[];
  label?: string;
  isWorkVector?: boolean;
}

export const ResourceTray: React.FC<ResourceTrayProps> = ({
  resourceNames,
  available,
  workVector,
  label = 'Current Available Resources [W]',
  isWorkVector = false,
}) => {
  const displayValues = workVector || available;

  return (
    <div className="bg-white rounded-xl px-4 py-3 border border-slate-200 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Indicator & Title */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div
            className={`p-1.5 rounded-lg border shrink-0 ${
              isWorkVector
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 font-sans tracking-tight">
                {label}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold border ${
                  isWorkVector
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                {isWorkVector ? 'Algorithm Work Vector' : 'Available Pool'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-sans mt-0.5">
              Vector: <span className="font-mono font-bold text-slate-900">[{displayValues.join(', ')}]</span>
            </div>
          </div>
        </div>

        {/* Right: Technical Resource Quantity Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {resourceNames.map((name, idx) => {
            const count = displayValues[idx] ?? 0;

            return (
              <div
                key={name}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center gap-1.5 font-sans">
                  <span className="w-5 h-5 rounded bg-white border border-slate-200 flex items-center justify-center text-[11px] font-mono font-bold text-slate-800">
                    {name}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">Type {name}:</span>
                </div>
                <span className="font-mono font-extrabold text-sm text-slate-950">
                  {count}
                </span>
                <span className="text-[10px] text-slate-400 font-sans">units</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
