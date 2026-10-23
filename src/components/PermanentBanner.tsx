import React, { useState } from 'react';
import { ShieldAlert, BookOpen, ChevronDown, ChevronUp, ArrowRight, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';

interface PermanentBannerProps {
  onLearnMore?: () => void;
  onNavigateToTab?: (tab: string) => void;
  activeTab?: string;
}

export const PermanentBanner: React.FC<PermanentBannerProps> = ({
  onLearnMore,
  onNavigateToTab,
  activeTab = 'avoidance',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const isDetection = activeTab === 'detection';
  const isPrevention = activeTab === 'prevention';
  const isTestLab = activeTab === 'testlab';

  return (
    <div className="w-full bg-slate-800 border-b border-slate-700/80 text-sm shadow-xs transition-all">
      {/* Slim Contextual Axiom Bar */}
      <div className="w-full max-w-[1920px] mx-auto px-4 lg:px-6 py-2 flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 rounded-lg bg-slate-700 text-indigo-300 border border-slate-600 shrink-0 shadow-xs">
            <ShieldAlert className="w-4 h-4 text-indigo-400" />
          </span>
          <p className="font-medium text-slate-200 text-sm leading-normal">
            <span className="text-indigo-400 font-bold uppercase font-mono mr-2 text-xs tracking-wider">
              {isDetection ? 'OS Detection Theorem:' : isPrevention ? 'Havender Theorem:' : isTestLab ? 'Verification Lab:' : 'OS Axiom:'}
            </span>
            {isDetection ? (
              <>
                In single-instance RAGs, a cycle is <strong className="text-emerald-400 font-bold underline decoration-emerald-400/60">NECESSARY &amp; SUFFICIENT</strong> for deadlock. In multi-instance RAGs, a cycle is <strong className="text-rose-400 font-bold underline decoration-rose-400/60">NOT SUFFICIENT</strong> &mdash; matrix reduction (<span className="font-mono">&Omicron;(m&middot;n&sup2;)</span>) is required.
              </>
            ) : isPrevention ? (
              <>
                Deadlock is <strong className="text-emerald-400 font-bold underline decoration-emerald-400/60">PREVENTED</strong> by invalidating at least one of Coffman&apos;s 4 necessary conditions (e.g. strict linear resource hierarchy eliminates circular wait).
              </>
            ) : isTestLab ? (
              <>
                Dynamic regression test suite verifies safety invariants, resource requests, graph cycle topology and matrix reduction.
              </>
            ) : (
              <>
                Banker&apos;s Algorithm <strong className="text-emerald-400 font-bold underline decoration-emerald-400/60">AVOIDS</strong> deadlocks by pre-testing tentative states before allocation. It does <strong className="text-rose-400 font-bold underline decoration-rose-400/60">NOT</strong> detect existing deadlocks.
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="px-3 py-1.5 rounded-lg bg-slate-700/80 hover:bg-slate-700 border border-slate-600 text-slate-200 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
            aria-expanded={isExpanded}
            aria-controls="axiom-deep-dive"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span>{isExpanded ? 'Collapse Theory' : 'Expand Theory'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          {onNavigateToTab && (
            <button
              onClick={() => onNavigateToTab(isDetection ? 'avoidance' : 'detection')}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
            >
              <span>{isDetection ? "Banker's Avoidance" : 'Detection Lab'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Integrated Expandable Theoretical Deep-Dive Drawer */}
      {isExpanded && (
        <div
          id="axiom-deep-dive"
          className="border-t border-slate-700 bg-slate-900 px-4 lg:px-6 py-4 animate-in slide-in-from-top-2 duration-200"
        >
          <div className="w-full max-w-[1920px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
            {/* Column 1: Avoidance vs Detection */}
            <div className="p-4 rounded-xl bg-slate-800/90 border border-slate-700 space-y-2 shadow-xs">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <span className="p-1 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 font-mono text-[11px]">
                  STRATEGY 1
                </span>
                <span className="font-mono">Deadlock Avoidance</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-xs">
                Requires declared <em>Maximum Claims</em> up front. The OS runs Banker&apos;s Safety Algorithm before granting requests. If a tentative allocation cannot guarantee completion of all processes, the request is denied and state is preserved.
              </p>
              <div className="text-xs font-mono text-emerald-300 font-semibold bg-emerald-950/60 px-2.5 py-1.5 rounded border border-emerald-800/80">
                Rule: Tentative Available &ge; Need in some sequence.
              </div>
            </div>

            {/* Column 2: Detection & Recovery */}
            <div className="p-4 rounded-xl bg-slate-800/90 border border-slate-700 space-y-2 shadow-xs">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <span className="p-1 rounded bg-rose-950/80 text-rose-300 border border-rose-700/60 font-mono text-[11px]">
                  STRATEGY 2
                </span>
                <span className="font-mono">Deadlock Detection</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-xs">
                Does <strong>not</strong> require maximum claim declarations. Requests are granted immediately if available. Periodically runs cycle reduction (single-instance) or matrix reduction (multi-instance). If a deadlock occurs, victim processes are terminated.
              </p>
              <div className="text-xs font-mono text-rose-300 font-semibold bg-rose-950/60 px-2.5 py-1.5 rounded border border-rose-800/80">
                Rule: Detects after the fact; requires preemption.
              </div>
            </div>

            {/* Column 3: State Topology & Coffman Invariant */}
            <div className="p-4 rounded-xl bg-slate-800/90 border border-slate-700 space-y-2 shadow-xs">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <span className="p-1 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 font-mono text-[11px]">
                  TOPOLOGY
                </span>
                <span className="font-mono">Venn State Invariant</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-xs">
                <code>Deadlocked &sub; Unsafe &sub; All System States</code>. An unsafe state is <em>not</em> deadlock yet&mdash;it means the OS cannot guarantee avoiding one under worst-case requests. A safe state guarantees zero deadlock risk.
              </p>
              <div className="text-xs font-mono text-indigo-300 font-semibold bg-indigo-950/60 px-2.5 py-1.5 rounded border border-indigo-800/80">
                Invariant: Safe &cap; Deadlocked = &empty;
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
