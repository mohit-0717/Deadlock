import React from 'react';
import { Database, Sparkles, Activity, Layers } from 'lucide-react';

interface ResourceTrayProps {
  resourceNames: string[];
  available: number[];
  workVector?: number[];
  label?: string;
  isWorkVector?: boolean;
}

const RESOURCE_THEMES = [
  { stroke: '#06b6d4', glow: 'rgba(6, 182, 212, 0.4)', text: 'text-cyan-400', badge: 'bg-cyan-950/70 border-cyan-500/40 text-cyan-300' },
  { stroke: '#a855f7', glow: 'rgba(168, 85, 247, 0.4)', text: 'text-purple-400', badge: 'bg-purple-950/70 border-purple-500/40 text-purple-300' },
  { stroke: '#10b981', glow: 'rgba(16, 185, 129, 0.4)', text: 'text-emerald-400', badge: 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300' },
  { stroke: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)', text: 'text-amber-400', badge: 'bg-amber-950/70 border-amber-500/40 text-amber-300' },
  { stroke: '#ec4899', glow: 'rgba(236, 72, 153, 0.4)', text: 'text-pink-400', badge: 'bg-pink-950/70 border-pink-500/40 text-pink-300' },
  { stroke: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)', text: 'text-blue-400', badge: 'bg-blue-950/70 border-blue-500/40 text-blue-300' },
];

export const ResourceTray: React.FC<ResourceTrayProps> = ({
  resourceNames,
  available,
  workVector,
  label = 'Available Resource Pool',
  isWorkVector = false,
}) => {
  const displayValues = workVector || available;

  return (
    <div className="cockpit-glass rounded-2xl p-4 sm:p-5 shadow-xl border border-cyan-500/25 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-64 h-32 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-xl border ${
              isWorkVector
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.3)] animate-pulse'
                : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
            }`}
          >
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
                {label}
              </h4>
              {isWorkVector ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 font-mono">
                  Live Work Vector
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 font-mono">
                  Available Pool [W]
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Vector: <span className="text-cyan-300 font-bold">[{displayValues.join(', ')}]</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
          <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>Real-time Resource Allocator</span>
        </div>
      </div>

      {/* Resource Gauge Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {resourceNames.map((name, idx) => {
          const theme = RESOURCE_THEMES[idx % RESOURCE_THEMES.length];
          const count = displayValues[idx] ?? 0;
          // Normalized representation: assume nominal max of 12 for visual arc
          const arcPercent = Math.min(100, Math.round((count / 12) * 100));
          const circumference = 2 * Math.PI * 24; // r = 24
          const strokeDashoffset = circumference - (arcPercent / 100) * circumference;

          return (
            <div
              key={name}
              className="p-3 rounded-xl cockpit-glass-subtle border border-slate-700/60 hover:border-cyan-500/40 transition-all duration-300 flex flex-col justify-between hover:scale-[1.02] shadow-sm relative group overflow-hidden"
            >
              {/* Top Label & Quantity */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-slate-300">
                  Type <span className={theme.text}>{name}</span>
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${theme.badge}`}>
                  R{idx}
                </span>
              </div>

              {/* Center Gauge Arc */}
              <div className="flex items-center justify-center my-2 relative">
                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 60 60">
                  {/* Track ring */}
                  <circle
                    cx="30"
                    cy="30"
                    r="24"
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeWidth="4"
                    fill="transparent"
                  />
                  {/* Active arc */}
                  <circle
                    cx="30"
                    cy="30"
                    r="24"
                    stroke={theme.stroke}
                    strokeWidth="4"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                    style={{
                      filter: `drop-shadow(0 0 6px ${theme.glow})`,
                      transition: 'stroke-dashoffset 0.6s ease',
                    }}
                  />
                </svg>

                {/* Numeric readout */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-black font-mono tabular-nums text-slate-100">
                    {count}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 uppercase tracking-tighter">
                    Units
                  </span>
                </div>
              </div>

              {/* Physical Token Tray representation */}
              <div className="mt-2 min-h-[22px] px-2 py-1 rounded-lg bg-black/50 border border-slate-800 flex flex-wrap gap-1 items-center justify-center">
                {count === 0 ? (
                  <span className="text-[10px] text-slate-500 font-mono italic">Depleted</span>
                ) : (
                  Array.from({ length: Math.min(count, 8) }, (_, tIdx) => (
                    <span
                      key={tIdx}
                      className="w-2 h-2 rounded-full shadow-sm transform transition-all duration-300"
                      style={{
                        backgroundColor: theme.stroke,
                        boxShadow: `0 0 6px ${theme.glow}`,
                      }}
                      title={`${name} unit ${tIdx + 1}`}
                    />
                  ))
                )}
                {count > 8 && (
                  <span className="text-[9px] font-mono text-slate-400 font-bold ml-0.5">
                    +{count - 8}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
