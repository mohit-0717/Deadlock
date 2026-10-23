import React from 'react';
import {
  Info,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Shield,
  Cpu,
  Compass,
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
  if (!isOpen && !isUnsafe) {
    return null;
  }

  return (
    <div
      className={`rounded-xl transition-all duration-300 bg-white border shadow-2xs overflow-hidden ${
        isUnsafe
          ? 'border-amber-300 ring-1 ring-amber-300/40'
          : 'border-slate-200'
      }`}
    >
      {/* Header Bar */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer bg-slate-50/70 hover:bg-slate-100/60 transition-colors border-b border-slate-200"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`p-1.5 rounded-lg border ${
              isUnsafe
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            {isUnsafe ? <AlertTriangle className="w-4 h-4 text-amber-600" /> : <Info className="w-4 h-4 text-slate-600" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight font-sans flex items-center gap-2">
                Theoretical Concept Card: Safe vs. Unsafe Invariants
              </h3>
              <span
                className={`text-[10px] font-sans px-2 py-0.5 rounded-md border font-semibold ${
                  isUnsafe
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}
              >
                {isUnsafe ? 'Hazard Alert' : 'Venn Invariant & Coffman Rules'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-sans mt-0.5">
              Why Unsafe ≠ Deadlocked &amp; The 4 Classical Deadlock Handling Strategies.
            </p>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="text-xs font-sans font-medium px-2.5 py-1 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
          aria-expanded={isOpen}
        >
          <span>{isOpen ? 'Collapse' : 'Expand'}</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {isOpen && (
        <div className="p-4 sm:p-5 space-y-4 bg-white animate-in fade-in duration-200">
          {/* Prominent Concept Highlight Banner (Required exact quote) */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-50/90 via-white to-amber-50/90 border-2 border-amber-400 text-amber-900 flex items-center gap-3 shadow-2xs">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0 border border-amber-300">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-black text-amber-800 uppercase tracking-widest block">
                Fundamental Operating Systems Rule:
              </span>
              <p className="font-bold text-slate-900 text-sm mt-0.5">
                &ldquo;Unsafe means a deadlock is possible, not that it has happened.&rdquo;
              </p>
              <p className="text-xs text-slate-600 mt-0.5 font-sans">
                An unsafe state simply means the OS cannot guarantee completion if every process simultaneously claims its maximum declared demand.
              </p>
            </div>
          </div>

          {/* State Topology Diagram */}
          <div className="rounded-xl p-4 border border-slate-200 bg-slate-50/70">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2 font-mono">
                <Compass className="w-4 h-4 text-indigo-600" />
                Dijkstra / Silberschatz State Space Topology
              </h4>
              <span className="text-[11px] font-mono text-indigo-700 font-semibold">Deadlock ⊂ Unsafe ⊂ All States</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
              {/* Visual Venn Graphic */}
              <div className="md:col-span-5 flex justify-center py-2">
                <div className="w-full max-w-[340px] h-52 relative flex items-center justify-center p-3 rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

                  {/* Outer: All System States */}
                  <div className="absolute inset-1.5 border border-dashed border-slate-300 rounded-xl pointer-events-none">
                    <span className="absolute top-1 left-2 text-[8px] uppercase font-mono tracking-widest text-slate-500 font-bold">
                      Total State Space [S]
                    </span>
                  </div>

                  {/* Safe Region */}
                  <div className="w-28 h-36 rounded-xl bg-emerald-50 border-2 border-emerald-400 flex flex-col items-center justify-center p-2 text-center mr-2 shadow-sm relative z-10 transition-transform hover:scale-105">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mb-1" />
                    <span className="text-[11px] font-black font-mono text-emerald-800">SAFE</span>
                    <span className="text-[9px] text-emerald-700 leading-tight mt-0.5 font-sans font-medium">
                      Guaranteed Sequence Exists
                    </span>
                  </div>

                  {/* Unsafe Region (Enclosing Deadlock) */}
                  <div className="w-34 h-38 rounded-xl bg-amber-50 border-2 border-amber-400 flex flex-col items-center justify-between p-2 text-center shadow-sm relative z-10 transition-transform hover:scale-105">
                    <div className="flex flex-col items-center">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span className="text-[11px] font-black font-mono text-amber-800">UNSAFE</span>
                      <span className="text-[9px] text-amber-700 leading-tight font-sans font-medium">
                        Hazard / Risk
                      </span>
                    </div>

                    {/* Inner Subset: Deadlocked */}
                    <div className="w-full h-15 rounded-lg bg-rose-50 border-2 border-rose-400 flex flex-col items-center justify-center p-1 shadow-xs">
                      <Lock className="w-3 h-3 text-rose-600" />
                      <span className="text-[9px] font-black font-mono text-rose-800">DEADLOCKED</span>
                      <span className="text-[7.5px] text-rose-600 font-mono">Subset of Unsafe</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Theory Explanation */}
              <div className="md:col-span-7 space-y-2 text-xs text-slate-700">
                <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200">
                  <p className="font-bold text-amber-900 mb-1 font-mono text-xs">
                    Operating Systems Reality Check:
                  </p>
                  <p className="text-slate-700 leading-relaxed text-[11px] font-sans">
                    An <strong>Unsafe state</strong> is NOT a synonym for deadlock. In an unsafe state, the operating system simply lacks the mathematical guarantee that all processes can finish if every process suddenly demands its maximum declared claim simultaneously.
                    <strong> Banker&apos;s Safety Algorithm</strong> is conservative: it refuses transitions into unsafe states to provide an absolute 100% guarantee against deadlock.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-600 pt-1">
                  <span className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Safe ⇒ 0% Risk
                  </span>
                  <span className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> Unsafe ⇒ Risk
                  </span>
                  <span className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> Deadlock ⊂ Unsafe
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Four Deadlock Handling Strategies */}
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 mb-2.5 flex items-center gap-2 font-mono">
              <Cpu className="w-4 h-4 text-indigo-600" />
              The 4 Classical Operating System Strategies
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Prevention */}
              <div className="p-3 rounded-xl bg-white border border-purple-200 hover:border-purple-300 transition-all flex flex-col justify-between shadow-2xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-black text-purple-700">1. PREVENTION</span>
                    <Shield className="w-4 h-4 text-purple-600" />
                  </div>
                  <p className="text-[11px] text-slate-800 font-medium font-sans">
                    Structurally eliminate ≥ 1 of the 4 Coffman conditions beforehand.
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">
                    Linear Resource Ordering (Havender) or Request-All-At-Once.
                  </p>
                </div>
                {onGoToTab && (
                  <button
                    onClick={() => onGoToTab('prevention')}
                    className="mt-2.5 text-[11px] text-purple-700 hover:text-purple-900 font-semibold flex items-center gap-1 cursor-pointer font-mono"
                  >
                    <span>Inspect Prevention</span> &rarr;
                  </button>
                )}
              </div>

              {/* Avoidance */}
              <div className="p-3 rounded-xl bg-white border border-cyan-200 hover:border-cyan-300 transition-all flex flex-col justify-between shadow-2xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-black text-cyan-800">2. AVOIDANCE</span>
                    <CheckCircle2 className="w-4 h-4 text-cyan-600" />
                  </div>
                  <p className="text-[11px] text-slate-800 font-medium font-sans">
                    Inspect every request at runtime; grant only if the resulting state is Safe.
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">
                    Banker&apos;s Algorithm with trial allocation and automatic rollback.
                  </p>
                </div>
                {onGoToTab && (
                  <button
                    onClick={() => onGoToTab('avoidance')}
                    className="mt-2.5 text-[11px] text-cyan-700 hover:text-cyan-900 font-semibold flex items-center gap-1 cursor-pointer font-mono"
                  >
                    <span>Banker&apos;s Lab</span> &rarr;
                  </button>
                )}
              </div>

              {/* Detection */}
              <div className="p-3 rounded-xl bg-white border border-rose-200 hover:border-rose-300 transition-all flex flex-col justify-between shadow-2xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-black text-rose-700">3. DETECTION</span>
                    <Lock className="w-4 h-4 text-rose-600" />
                  </div>
                  <p className="text-[11px] text-slate-800 font-medium font-sans">
                    Let requests proceed optimistically; run detection algorithms periodically.
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">
                    Multi-instance matrix reduction or Wait-For Graph (WFG) cycle detection.
                  </p>
                </div>
                {onGoToTab && (
                  <button
                    onClick={() => onGoToTab('detection')}
                    className="mt-2.5 text-[11px] text-rose-700 hover:text-rose-900 font-semibold flex items-center gap-1 cursor-pointer font-mono"
                  >
                    <span>Run Detection</span> &rarr;
                  </button>
                )}
              </div>

              {/* Recovery */}
              <div className="p-3 rounded-xl bg-white border border-emerald-200 hover:border-emerald-300 transition-all flex flex-col justify-between shadow-2xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-black text-emerald-800">4. RECOVERY</span>
                    <Cpu className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-[11px] text-slate-800 font-medium font-sans">
                    Break deadlock after detection: terminate victim processes or preempt resources.
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">
                    Reclaim allocations into Available pool and unblock remaining processes.
                  </p>
                </div>
                {onGoToTab && (
                  <button
                    onClick={() => onGoToTab('detection')}
                    className="mt-2.5 text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1 cursor-pointer font-mono"
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
