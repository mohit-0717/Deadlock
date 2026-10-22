import React from 'react';
import {
  Info,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Shield,
  Cpu,
  Compass,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ConceptCardProps {
  onGoToTab?: (tab: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  isUnsafe?: boolean;
}

export const ConceptCard: React.FC<ConceptCardProps> = ({
  onGoToTab,
  isOpen,
  onToggle,
  isUnsafe = false,
}) => {
  // If not open and not unsafe, render a sleek inline trigger pill so user always has access
  if (!isOpen && !isUnsafe) {
    return null;
  }

  return (
    <div
      className={`rounded-2xl transition-all duration-300 cockpit-glass overflow-hidden ${
        isUnsafe
          ? 'border-amber-500/90 shadow-[0_0_30px_rgba(245,158,11,0.3)] ring-2 ring-amber-500/50'
          : 'border-cyan-500/30 hover:border-cyan-500/50 shadow-2xl'
      }`}
    >
      {/* Header Bar */}
      <div
        className="flex items-center justify-between p-4 sm:p-5 cursor-pointer bg-slate-900/80 hover:bg-slate-900/95 transition-colors border-b border-slate-800"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl border ${
              isUnsafe
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.4)] animate-pulse'
                : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
            }`}
          >
            {isUnsafe ? <AlertTriangle className="w-5 h-5 text-amber-400" /> : <Info className="w-5 h-5 text-cyan-400" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-100 tracking-tight font-mono flex items-center gap-2">
                Theoretical Concept Card: Safe vs Unsafe vs Deadlocked
              </h3>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                isUnsafe ? 'bg-amber-950/80 text-amber-300 border-amber-500/50' : 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40'
              }`}>
                {isUnsafe ? 'Hazard Alert Active' : 'OS Core Theory'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-sans">
              Why Unsafe ≠ Deadlocked &amp; The 4 Classical Deadlock Handling Strategies
            </p>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="text-xs font-mono font-semibold px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
          aria-expanded={isOpen}
        >
          <span>{isOpen ? 'Close Telemetry' : 'Expand Details'}</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {isOpen && (
        <div className="p-4 sm:p-6 space-y-5 bg-slate-950/50 animate-in fade-in duration-200">
          {/* Prominent Concept Highlight Banner (Required exact quote) */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/80 via-slate-900/90 to-amber-950/70 border-2 border-amber-500 text-amber-200 flex items-center gap-3.5 shadow-xl">
            <div className="p-2.5 rounded-xl bg-amber-500/25 text-amber-400 shrink-0 border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.4)]">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-mono font-black text-amber-400 uppercase tracking-widest block">
                Fundamental Operating Systems Rule:
              </span>
              <p className="font-bold text-slate-100 text-sm sm:text-base mt-0.5 drop-shadow">
                &ldquo;Unsafe means a deadlock is possible, not that it has happened.&rdquo;
              </p>
              <p className="text-xs text-amber-300/90 mt-1 font-sans">
                An unsafe state simply means the OS cannot guarantee completion if every process simultaneously claims its maximum declared demand.
              </p>
            </div>
          </div>

          {/* Holographic Venn State Diagram */}
          <div className="cockpit-glass-subtle rounded-xl p-5 border border-cyan-500/20">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-2 font-mono">
                <Compass className="w-4 h-4 text-cyan-400" />
                Dijkstra / Silberschatz State Space Topology
              </h4>
              <span className="text-[11px] font-mono text-cyan-400">Deadlock ⊂ Unsafe ⊂ All States</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
              {/* Visual Venn Graphic */}
              <div className="md:col-span-5 flex justify-center py-2">
                <div className="w-72 h-56 relative flex items-center justify-center p-3 rounded-2xl bg-slate-950/90 border border-slate-700/80 shadow-[0_0_20px_rgba(0,0,0,0.8)] overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] opacity-15 pointer-events-none" />

                  {/* Outer: All System States */}
                  <div className="absolute inset-2 border border-dashed border-slate-600/60 rounded-xl pointer-events-none">
                    <span className="absolute top-1 left-2 text-[9px] uppercase font-mono tracking-widest text-slate-400">
                      Total State Space [S]
                    </span>
                  </div>

                  {/* Safe Region */}
                  <div className="w-28 h-36 rounded-xl bg-emerald-950/70 border-2 border-emerald-500/80 flex flex-col items-center justify-center p-2 text-center mr-2 shadow-[0_0_18px_rgba(16,185,129,0.25)] relative z-10 transition-transform hover:scale-105">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 mb-1" />
                    <span className="text-xs font-black font-mono text-emerald-300">SAFE</span>
                    <span className="text-[9px] text-emerald-400/90 leading-tight mt-1 font-sans">
                      Guaranteeable Sequence Exists
                    </span>
                  </div>

                  {/* Unsafe Region (Enclosing Deadlock) */}
                  <div className="w-32 h-40 rounded-xl bg-amber-950/50 border-2 border-amber-500/70 flex flex-col items-center justify-between p-2 text-center shadow-[0_0_18px_rgba(245,158,11,0.2)] relative z-10 transition-transform hover:scale-105">
                    <div className="flex flex-col items-center">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span className="text-[11px] font-black font-mono text-amber-300">UNSAFE</span>
                      <span className="text-[9px] text-amber-400/90 leading-tight font-sans">
                        Hazard / No Guarantee
                      </span>
                    </div>

                    {/* Inner Subset: Deadlocked */}
                    <div className="w-26 h-18 rounded-lg bg-red-950/90 border-2 border-red-500/90 flex flex-col items-center justify-center p-1.5 shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                      <Lock className="w-4 h-4 text-red-400 animate-pulse" />
                      <span className="text-[10px] font-black font-mono text-red-300">DEADLOCKED</span>
                      <span className="text-[8px] text-red-400 font-mono">Subset of Unsafe</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Theory Explanation */}
              <div className="md:col-span-7 space-y-2.5 text-xs text-slate-300">
                <div className="p-3 rounded-xl bg-amber-950/25 border border-amber-500/30">
                  <p className="font-bold text-amber-300 mb-1 font-mono text-xs">
                    Operating Systems Reality Check:
                  </p>
                  <p className="text-slate-300 leading-relaxed text-[12px] font-sans">
                    An <strong>Unsafe state</strong> is NOT a synonym for deadlock. In an unsafe state, the operating system simply lacks the mathematical guarantee that all processes can finish if every process suddenly demands its maximum declared claim simultaneously.
                    In production, processes routinely release resources early without demanding maximums, allowing unsafe states to finish safely.
                    <strong> Dijkstra&apos;s Banker&apos;s Algorithm</strong> is intentionally conservative: it refuses transitions into unsafe states to provide an absolute 100% guarantee against deadlock.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-slate-400 pt-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]" /> Safe ⇒ Zero Deadlock Risk
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]" /> Unsafe ⇒ Deadlock Possible
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-400 shadow-[0_0_6px_rgba(239,68,68,0.8)]" /> Deadlock ⊂ Unsafe
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Four Deadlock Handling Strategies */}
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-200 mb-3 flex items-center gap-2 font-mono">
              <Cpu className="w-4 h-4 text-cyan-400" />
              The 4 Classical Operating System Strategies
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Prevention */}
              <div className="p-3.5 rounded-xl cockpit-glass-subtle border border-purple-500/30 hover:border-purple-500/60 transition-all flex flex-col justify-between hover:scale-[1.01]">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono font-black text-purple-400">1. PREVENTION</span>
                    <Shield className="w-4 h-4 text-purple-400" />
                  </div>
                  <p className="text-[11px] text-slate-200 font-medium font-sans">
                    Structurally eliminate ≥ 1 of the 4 Coffman conditions beforehand.
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">
                    Linear Resource Ordering (Havender) or Request-All-At-Once.
                  </p>
                </div>
                {onGoToTab && (
                  <button
                    onClick={() => onGoToTab('prevention')}
                    className="mt-3 text-[11px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 cursor-pointer font-mono"
                  >
                    <span>Inspect Prevention</span> &rarr;
                  </button>
                )}
              </div>

              {/* Avoidance */}
              <div className="p-3.5 rounded-xl cockpit-glass-subtle border border-cyan-500/30 hover:border-cyan-500/60 transition-all flex flex-col justify-between hover:scale-[1.01]">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono font-black text-cyan-400">2. AVOIDANCE</span>
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  </div>
                  <p className="text-[11px] text-slate-200 font-medium font-sans">
                    Inspect every request at runtime; grant only if the resulting state is Safe.
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">
                    Banker&apos;s Algorithm with trial allocation and automatic rollback.
                  </p>
                </div>
                {onGoToTab && (
                  <button
                    onClick={() => onGoToTab('avoidance')}
                    className="mt-3 text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 cursor-pointer font-mono"
                  >
                    <span>Banker&apos;s Lab</span> &rarr;
                  </button>
                )}
              </div>

              {/* Detection */}
              <div className="p-3.5 rounded-xl cockpit-glass-subtle border border-rose-500/30 hover:border-rose-500/60 transition-all flex flex-col justify-between hover:scale-[1.01]">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono font-black text-rose-400">3. DETECTION</span>
                    <Lock className="w-4 h-4 text-rose-400" />
                  </div>
                  <p className="text-[11px] text-slate-200 font-medium font-sans">
                    Let requests proceed optimistically; run detection algorithms periodically.
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">
                    Multi-instance matrix reduction or Wait-For Graph (WFG) cycle detection.
                  </p>
                </div>
                {onGoToTab && (
                  <button
                    onClick={() => onGoToTab('detection')}
                    className="mt-3 text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 cursor-pointer font-mono"
                  >
                    <span>Run Detection</span> &rarr;
                  </button>
                )}
              </div>

              {/* Recovery */}
              <div className="p-3.5 rounded-xl cockpit-glass-subtle border border-emerald-500/30 hover:border-emerald-500/60 transition-all flex flex-col justify-between hover:scale-[1.01]">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono font-black text-emerald-400">4. RECOVERY</span>
                    <Cpu className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-[11px] text-slate-200 font-medium font-sans">
                    Break deadlock after detection: terminate victim processes or preempt resources.
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">
                    Reclaim allocations into Available pool and unblock remaining processes.
                  </p>
                </div>
                {onGoToTab && (
                  <button
                    onClick={() => onGoToTab('detection')}
                    className="mt-3 text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer font-mono"
                  >
                    <span>Simulate Recovery</span> &rarr;
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
