import React from 'react';
import { Play, Check, Clock, AlertTriangle, Lock, Send } from 'lucide-react';

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
    glow: 'hover:shadow-md hover:border-indigo-300',
    border: 'border-slate-200',
    badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
    badgeText: 'Idle',
    icon: Play,
    accentColor: 'text-indigo-600',
  },
  requesting: {
    glow: 'shadow-md ring-1 ring-indigo-400/50',
    border: 'border-indigo-300',
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    badgeText: 'Requesting',
    icon: Play,
    accentColor: 'text-indigo-600',
  },
  waiting: {
    glow: 'shadow-md ring-1 ring-amber-400/50 animate-pulse',
    border: 'border-amber-300',
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-300',
    badgeText: 'Waiting (Queued)',
    icon: Clock,
    accentColor: 'text-amber-600',
  },
  running: {
    glow: 'shadow-md ring-2 ring-emerald-500/40',
    border: 'border-emerald-400',
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    badgeText: 'Executing',
    icon: Play,
    accentColor: 'text-emerald-600',
  },
  finished: {
    glow: 'shadow-xs',
    border: 'border-emerald-200',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    badgeText: 'Simulated Complete',
    icon: Check,
    accentColor: 'text-emerald-600',
  },
  stuck: {
    glow: 'shadow-md ring-1 ring-amber-400/60',
    border: 'border-amber-400',
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-300',
    badgeText: 'Stuck (Need > Work)',
    icon: AlertTriangle,
    accentColor: 'text-amber-600',
  },
  deadlocked: {
    glow: 'shadow-md ring-2 ring-rose-500/50 animate-pulse',
    border: 'border-rose-400',
    badgeBg: 'bg-rose-50 text-rose-800 border-rose-300 font-black',
    badgeText: 'Deadlocked',
    icon: Lock,
    accentColor: 'text-rose-600',
  },
  terminated: {
    glow: 'shadow-none opacity-40',
    border: 'border-slate-200',
    badgeBg: 'bg-slate-100 text-slate-500 border-slate-200',
    badgeText: 'Terminated',
    icon: Lock,
    accentColor: 'text-slate-400',
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
      className={`rounded-2xl p-4 bg-white transition-all duration-300 relative group overflow-hidden border ${config.border} ${config.glow} shadow-2xs ${
        isCurrentStep ? 'scale-[1.02] ring-2 ring-indigo-500 z-10' : ''
      } ${onSelect ? 'cursor-pointer' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-black text-xs shadow-2xs transition-all ${
              isCurrentStep
                ? 'bg-indigo-600 text-white shadow-indigo-500/30'
                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
            }`}
          >
            {name}
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 font-mono tracking-tight block">
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
            className="text-[10px] font-mono px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
            title="Set as Target for Resource-Request Simulation"
          >
            <Send className="w-2.5 h-2.5" />
            <span>Select</span>
          </button>
        )}
      </div>

      {/* Progress Bar (when executing in replay) */}
      {effectiveState === 'running' && (
        <div className="w-full bg-slate-100 rounded-full h-1.5 mb-3 overflow-hidden border border-emerald-200">
          <div
            className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300 shadow-sm"
            style={{ width: `${Math.max(15, progressPercent)}%` }}
          />
        </div>
      )}

      {/* Visual Resource Meters Grid */}
      <div className="space-y-2 text-xs font-mono">
        {/* Allocation Readout */}
        <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
            <span className="uppercase tracking-wider font-semibold text-blue-700">Allocated</span>
            <span className="font-bold">[{allocation.join(', ')}]</span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {allocation.map((val, idx) => (
              <div key={idx} className="bg-white border border-slate-200 rounded px-1.5 py-0.5 flex items-center justify-between">
                <span className="text-[9px] text-slate-500">{resourceNames[idx]}:</span>
                <span className="text-blue-700 font-bold tabular-nums">{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Need Readout */}
        <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
            <span className="uppercase tracking-wider font-semibold text-emerald-700">Remaining Need</span>
            <span className="font-bold">[{need.join(', ')}]</span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {need.map((val, idx) => (
              <div key={idx} className="bg-white border border-slate-200 rounded px-1.5 py-0.5 flex items-center justify-between">
                <span className="text-[9px] text-slate-500">{resourceNames[idx]}:</span>
                <span className="text-emerald-700 font-bold tabular-nums">{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Max Claim Mini Readout */}
        <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-slate-100 text-[10px] text-slate-600 border border-slate-200">
          <span className="uppercase tracking-wider font-semibold">Max Claim [M]:</span>
          <span className="text-purple-700 font-bold font-mono">[{max.join(', ')}]</span>
        </div>
      </div>

      {/* Waiting / Stuck / Deficit Alert Ribbon */}
      {waitingDeficit && (
        <div className="mt-2.5 p-2 rounded-xl bg-amber-50 border border-amber-300 text-[11px] text-amber-900 font-mono">
          <strong className="text-amber-800 font-bold mr-1">Missing Need:</strong>
          <span>{waitingDeficit}</span>
        </div>
      )}

      {stateDetail && !waitingDeficit && (
        <p className="mt-2 text-[10px] text-slate-500 italic line-clamp-2 font-mono">
          {stateDetail}
        </p>
      )}
    </div>
  );
};
