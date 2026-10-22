import React from 'react';
import { ShieldAlert, BookOpen, ExternalLink, Activity } from 'lucide-react';

interface PermanentBannerProps {
  onLearnMore?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export const PermanentBanner: React.FC<PermanentBannerProps> = ({
  onLearnMore,
  onNavigateToTab,
}) => {
  return (
    <aside
      aria-label="Core Operating System Principle Banner"
      className="w-full cockpit-glass bg-gradient-to-r from-cyan-950/40 via-slate-900/80 to-indigo-950/40 border-y border-cyan-500/25 px-4 py-2 text-xs sm:text-sm text-cyan-200 shadow-lg backdrop-blur-md transition-all"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shrink-0 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
            <ShieldAlert className="w-4 h-4 text-cyan-300" />
          </span>
          <p className="font-medium text-slate-100 text-xs sm:text-[13px] leading-relaxed">
            <strong className="text-cyan-400 font-bold tracking-wider uppercase font-mono mr-1.5 text-xs">
              [OS Axiom]:
            </strong>
            Banker&apos;s Algorithm <span className="text-emerald-400 font-bold underline decoration-emerald-500/60 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">AVOIDS</span> deadlock by verifying whether granting a request keeps the system safe. It does <span className="text-rose-400 font-bold underline decoration-rose-500/60 drop-shadow-[0_0_8px_rgba(244,63,94,0.3)]">NOT</span> detect an existing deadlock. Detection is a separate algorithm.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 text-xs font-mono">
          {onNavigateToTab && (
            <button
              onClick={() => onNavigateToTab('detection')}
              className="px-2.5 py-1 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-300 font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow-[0_0_10px_rgba(6,182,212,0.3)]"
            >
              <span>Detection Alg</span>
              <ExternalLink className="w-3 h-3 text-cyan-400" />
            </button>
          )}
          {onLearnMore && (
            <button
              onClick={onLearnMore}
              className="px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/70 text-slate-300 font-medium transition-all flex items-center gap-1.5 cursor-pointer hover:border-slate-500"
            >
              <BookOpen className="w-3 h-3 text-cyan-400" />
              <span>Concept Card</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
