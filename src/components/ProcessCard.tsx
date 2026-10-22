import React from 'react';
import { Play, Check, Clock, AlertTriangle, Lock, Skull, Send, Cpu } from 'lucide-react';

export type ProcessState =
  | 'idle'
  | 'requesting'
  | 'waiting'
  | 'running'
  | 'finished'
  | 'stuck'
  | 'deadlocked'
  | 'terminated';

interface ProcessCardProps {
  id: number;
  name: string;
  allocation: number[];
  max: number[];
  need: number[];
  resourceNames: string[];
  state: ProcessState;
  stateDetail?: string;
  isCurrentStep?: boolean;
  progressPercent?: number;
  onSelect?: () => void;
  waitingDeficit?: string;
  isTerminated?: boolean;
  onQuickRequest?: (procId: number) => void;
}

const STATE_CONFIGS: Record<
  ProcessState,
  {
    glow: string;
    border: string;
    badgeBg: string;
    badgeText: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
  }
> = {
  idle: {
    glow: 'hover:shadow-[0_0_15px_rgba(6,182,212,0.2)]',
    border: 'border-slate-800 hover:border-cyan-500/40',
    badgeBg: 'bg-slate-800/90 text-slate-300 border-slate-700',
    badgeText: 'Idle',
    icon: Play,
    accentColor: 'text-cyan-400',
  },
  requesting: {
    glow: 'shadow-[0_0_20px_rgba(6,182,212,0.35)] ring-1 ring-cyan-500/60',
    border: 'border-cyan-500/70',
    badgeBg: 'bg-cyan-950/90 text-cyan-300 border-cyan-500/50',
    badgeText: 'Requesting',
    icon: Play,
    accentColor: 'text-cyan-400',
  },
  waiting: {
    glow: 'shadow-[0_0_20px_rgba(245,158,11,0.35)] ring-1 ring-amber-500/70 animate-pulse',
    border: 'border-amber-500/80',
    badgeBg: 'bg-amber-950/90 text-amber-300 border-amber-500/50',
    badgeText: 'Waiting (Queued)',
    icon: Clock,
    accentColor: 'text-amber-400',
  },
  running: {
    glow: 'shadow-[0_0_25px_rgba(16,185,129,0.45)] ring-2 ring-emerald-400/80',
    border: 'border-emerald-500/90',
    badgeBg: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50',
    badgeText: 'Executing',
    icon: Play,
    accentColor: 'text-emerald-400',
  },
  finished: {
    glow: 'shadow-[0_0_15px_rgba(16,185,129,0.2)]',
    border: 'border-emerald-700/50',
    badgeBg: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/40',
    badgeText: 'Finished (Released)',
    icon: Check,
    accentColor: 'text-emerald-400',
  },
  stuck: {
    glow: 'shadow-[0_0_20px_rgba(245,158,11,0.4)] ring-1 ring-amber-500/80',
    border: 'border-amber-500/80',
    badgeBg: 'bg-amber-950/90 text-amber-300 border-amber-500/50',
    badgeText: 'Stuck (Need > Work)',
    icon: AlertTriangle,
    accentColor: 'text-amber-400',
  },
  deadlocked: {
    glow: 'shadow-[0_0_25px_rgba(239,68,68,0.45)] ring-2 ring-red-500/80 animate-pulse',
    border: 'border-red-500/90',
    badgeBg: 'bg-red-950/90 text-red-300 border-red-500/60 font-black',
    badgeText: 'Deadlocked',
    icon: Lock,
    accentColor: 'text-red-400',
  },
  terminated: {
    glow: 'shadow-none opacity-40',
    border: 'border-slate-800',
    badgeBg: 'bg-slate-900 text-slate-500 border-slate-800',
    badgeText: 'Terminated',
    icon: Skull,
    accentColor: 'text-slate-500',
  },
};

export const ProcessCard: React.FC<ProcessCardProps> = ({
  id,
  name,
  allocation,
  max,
  need,
  resourceNames,
  state,
  stateDetail,
  isCurrentStep = false,
  progressPercent = 0,
  onSelect,
  waitingDeficit,
  isTerminated = false,
  onQuickRequest,
}) => {
  const effectiveState: ProcessState = isTerminated ? 'terminated' : state;
  const config = STATE_CONFIGS[effectiveState] || STATE_CONFIGS.idle;
  const Icon = config.icon;

  return (
    <div
      onClick={onSelect}
      className={`rounded-2xl p-4 cockpit-glass transition-all duration-300 relative group overflow-hidden border ${config.border} ${config.glow} ${
        isCurrentStep ? 'scale-[1.02] ring-2 ring-cyan-400 z-10' : ''
      } ${onSelect ? 'cursor-pointer' : ''}`}
    >
      {/* Background radial glow */}
      <div className="absolute top-0 right-0 w-28 h-28 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-black text-xs shadow-md transition-all ${
              isCurrentStep
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.6)]'
                : 'bg-slate-850 text-cyan-300 border border-cyan-500/30'
            }`}
          >
            {name}
          </div>
          <div>
            <span className="text-xs font-bold text-slate-100 font-mono tracking-tight block">
              {name}
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-mono inline-flex items-center gap-1 border ${config.badgeBg}`}
            >
              <Icon className="w-2.5 h-2.5" />
              {config.badgeText}
            </span>
          </div>
        </div>

        {/* Action Button: Quick Request Trigger */}
        {onQuickRequest && !isTerminated && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuickRequest(id);
            }}
            className="text-[10px] font-mono px-2 py-1 rounded-lg bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 flex items-center gap-1 cursor-pointer transition-all shadow-sm opacity-90 group-hover:opacity-100"
            title="Set as Target for Resource-Request Simulation"
          >
            <Send className="w-2.5 h-2.5" />
            <span>Select</span>
          </button>
        )}
      </div>

      {/* Progress Bar (when executing in replay) */}
      {effectiveState === 'running' && (
        <div className="w-full bg-slate-950 rounded-full h-1.5 mb-3 overflow-hidden border border-emerald-500/30">
          <div
            className="bg-emerald-400 h-1.5 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
            style={{ width: `${Math.max(15, progressPercent)}%` }}
          />
        </div>
      )}

      {/* Visual Resource Meters Grid */}
      <div className="space-y-2 text-xs font-mono">
        {/* Allocation Readout */}
        <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
            <span className="uppercase tracking-wider font-semibold text-blue-400">Allocated</span>
            <span>[{allocation.join(', ')}]</span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {allocation.map((val, idx) => (
              <div key={idx} className="bg-blue-950/40 border border-blue-500/30 rounded px-1.5 py-0.5 flex items-center justify-between">
                <span className="text-[9px] text-slate-400">{resourceNames[idx]}:</span>
                <span className="text-blue-300 font-bold tabular-nums">{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Need Readout */}
        <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
            <span className="uppercase tracking-wider font-semibold text-emerald-400">Remaining Need</span>
            <span>[{need.join(', ')}]</span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {need.map((val, idx) => (
              <div key={idx} className="bg-emerald-950/40 border border-emerald-500/30 rounded px-1.5 py-0.5 flex items-center justify-between">
                <span className="text-[9px] text-slate-400">{resourceNames[idx]}:</span>
                <span className="text-emerald-300 font-bold tabular-nums">{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Max Claim Mini Readout */}
        <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-slate-900/60 text-[10px] text-slate-400 border border-slate-800">
          <span className="uppercase tracking-wider">Max Claim [M]:</span>
          <span className="text-purple-300 font-bold font-mono">[{max.join(', ')}]</span>
        </div>
      </div>

      {/* Waiting / Stuck / Deficit Alert Ribbon */}
      {waitingDeficit && (
        <div className="mt-2.5 p-2 rounded-xl bg-amber-950/70 border border-amber-500/60 text-[11px] text-amber-200 font-mono">
          <strong className="text-amber-400 font-bold mr-1">Missing Need:</strong>
          <span>{waitingDeficit}</span>
        </div>
      )}

      {stateDetail && !waitingDeficit && (
        <p className="mt-2 text-[10px] text-slate-400 italic line-clamp-2 font-mono">
          {stateDetail}
        </p>
      )}
    </div>
  );
};
