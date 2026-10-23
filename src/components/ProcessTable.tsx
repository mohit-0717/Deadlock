import React from 'react';
import {
  Play,
  Check,
  Clock,
  AlertTriangle,
  Lock,
  Send,
  ChevronRight,
  Cpu,
  Info,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { ProcessState } from './ProcessCard.js';

export interface ProcessTableItem {
  id: number;
  name: string;
  allocation: number[];
  max: number[];
  need: number[];
  state: ProcessState;
  isCurrentStep?: boolean;
  waitingDeficit?: string;
}

interface ProcessTableProps {
  processes: ProcessTableItem[];
  resourceNames: string[];
  selectedProcessId: number;
  onSelectProcess: (id: number) => void;
  onQuickRequest?: (id: number) => void;
  currentWorkVector?: number[];
}

const STATE_CONFIG: Record<
  ProcessState,
  {
    label: string;
    bgClass: string;
    borderClass: string;
    textClass: string;
    dotClass: string;
  }
> = {
  idle: {
    label: 'Ready / Idle',
    bgClass: 'bg-slate-50',
    borderClass: 'border-slate-200',
    textClass: 'text-slate-700',
    dotClass: 'bg-slate-400',
  },
  requesting: {
    label: 'Requesting',
    bgClass: 'bg-indigo-50',
    borderClass: 'border-indigo-200',
    textClass: 'text-indigo-800',
    dotClass: 'bg-indigo-600',
  },
  waiting: {
    label: 'Waiting (Queued)',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-300',
    textClass: 'text-amber-900',
    dotClass: 'bg-amber-600',
  },
  running: {
    label: 'Executing Step',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-300',
    textClass: 'text-emerald-900',
    dotClass: 'bg-emerald-600 animate-pulse',
  },
  finished: {
    label: 'Simulated Complete',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-200',
    textClass: 'text-emerald-800',
    dotClass: 'bg-emerald-500',
  },
  stuck: {
    label: 'Stuck (Need > Work)',
    bgClass: 'bg-rose-50',
    borderClass: 'border-rose-300',
    textClass: 'text-rose-900',
    dotClass: 'bg-rose-600',
  },
  deadlocked: {
    label: 'Deadlocked',
    bgClass: 'bg-rose-50',
    borderClass: 'border-rose-400',
    textClass: 'text-rose-900',
    dotClass: 'bg-rose-600 animate-pulse',
  },
  terminated: {
    label: 'Preempted / Terminated',
    bgClass: 'bg-slate-100',
    borderClass: 'border-slate-300',
    textClass: 'text-slate-500',
    dotClass: 'bg-slate-400',
  },
};

export const ProcessTable: React.FC<ProcessTableProps> = ({
  processes,
  resourceNames,
  selectedProcessId,
  onSelectProcess,
  onQuickRequest,
  currentWorkVector,
}) => {
  const selectedProc = processes.find((p) => p.id === selectedProcessId) || processes[0];

  return (
    <div className="space-y-3">
      {/* Table Container Card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        {/* Table Header HUD */}
        <div className="px-4 py-2.5 border-b border-slate-200/90 bg-slate-50/60 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-600" />
            <span className="font-bold text-slate-900 font-sans tracking-tight">
              Process Allocation &amp; Need Monitor
            </span>
            <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-mono font-semibold">
              {processes.length} Active Processes
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-500 font-sans">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Complete
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Waiting
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Stuck
            </span>
          </div>
        </div>

        {/* Dense Tabular Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider font-sans">
                <th className="py-2 px-3 w-16">PID</th>
                <th className="py-2 px-3">
                  Allocation <span className="font-mono text-slate-500">[{resourceNames.join(',')}]</span>
                </th>
                <th className="py-2 px-3">
                  Max Claim <span className="font-mono text-slate-500">[{resourceNames.join(',')}]</span>
                </th>
                <th className="py-2 px-3">
                  Remaining Need <span className="font-mono text-slate-500">[{resourceNames.join(',')}]</span>
                </th>
                <th className="py-2 px-3">Safety Status</th>
                <th className="py-2 px-3 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processes.map((proc) => {
                const isSelected = proc.id === selectedProcessId;
                const statusCfg = STATE_CONFIG[proc.state] || STATE_CONFIG.idle;

                // Check if process currently satisfies Need <= Work
                let canRun = false;
                if (currentWorkVector && proc.need.length === currentWorkVector.length) {
                  canRun = proc.need.every((nd, idx) => nd <= currentWorkVector[idx]);
                }

                return (
                  <tr
                    key={proc.id}
                    onClick={() => onSelectProcess(proc.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-indigo-50/70 border-l-4 border-indigo-600'
                        : proc.isCurrentStep
                        ? 'bg-emerald-50/50 hover:bg-emerald-50'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Process Identifier */}
                    <td className="py-2 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="w-6 h-6 rounded bg-slate-100 border border-slate-300 flex items-center justify-center text-xs text-slate-800">
                          {proc.name}
                        </span>
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
                        )}
                      </div>
                    </td>

                    {/* Allocation Vector */}
                    <td className="py-2 px-3 font-mono text-slate-800 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {proc.allocation.map((val, idx) => (
                          <span
                            key={idx}
                            className="w-6 h-6 rounded bg-slate-50 border border-slate-200 flex items-center justify-center font-bold text-[11px] text-slate-800"
                          >
                            {val}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Max Claim Vector */}
                    <td className="py-2 px-3 font-mono text-slate-600 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {proc.max.map((val, idx) => (
                          <span
                            key={idx}
                            className="w-6 h-6 rounded bg-slate-50 border border-slate-200 flex items-center justify-center text-[11px] text-slate-700"
                          >
                            {val}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Remaining Need Vector */}
                    <td className="py-2 px-3 font-mono whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {proc.need.map((val, idx) => (
                          <span
                            key={idx}
                            className={`w-6 h-6 rounded border flex items-center justify-center font-bold text-[11px] ${
                              val === 0
                                ? 'bg-slate-50 border-slate-200 text-slate-400'
                                : 'bg-indigo-50 border-indigo-200 text-indigo-900'
                            }`}
                          >
                            {val}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Safety Status Pill */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-sans font-semibold">
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotClass}`} />
                        <span className={statusCfg.textClass}>{statusCfg.label}</span>
                        {canRun && proc.state !== 'finished' && (
                          <span className="text-[10px] text-emerald-800 font-mono font-bold bg-emerald-100 px-1 rounded ml-1">
                            Need ≤ Work
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Quick Action Button */}
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectProcess(proc.id);
                          if (onQuickRequest) onQuickRequest(proc.id);
                        }}
                        className="px-2.5 py-1 rounded-md bg-white hover:bg-indigo-50 text-indigo-700 hover:text-indigo-900 border border-slate-300 hover:border-indigo-300 font-sans text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                        title={`Select P${proc.id} and prefill request simulator`}
                      >
                        <Send className="w-3 h-3" />
                        <span>Inject</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Process Detail Inspector Panel */}
      {selectedProc && (
        <div className="rounded-xl border border-indigo-200/90 bg-gradient-to-r from-indigo-50/40 via-white to-slate-50 p-3.5 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100/80 pb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-mono font-bold text-xs">
                {selectedProc.name} Detail Inspector
              </span>
              <span className="text-xs text-slate-600 font-sans">
                Allocation: [{selectedProc.allocation.join(', ')}] &bull; Max: [{selectedProc.max.join(', ')}]
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-sans">
                Remaining Need:
              </span>
              <span className="font-mono font-bold text-indigo-900 text-xs px-2 py-0.5 bg-white border border-indigo-200 rounded">
                [{selectedProc.need.join(', ')}]
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-sans">
            {/* 1. Resource Breakdown */}
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1 shadow-2xs">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                Resource Allocation vs. Claim
              </span>
              <div className="space-y-1 font-mono text-[11px]">
                {resourceNames.map((rName, idx) => (
                  <div key={rName} className="flex justify-between items-center text-slate-700">
                    <span>Res {rName}:</span>
                    <span>
                      <strong className="text-slate-900">{selectedProc.allocation[idx]}</strong> held of{' '}
                      <strong>{selectedProc.max[idx]}</strong> max (Need: {selectedProc.need[idx]})
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Work Vector Comparison */}
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1 shadow-2xs">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                Safety Work Test (Need ≤ Work)
              </span>
              {currentWorkVector ? (
                <div className="space-y-1 text-[11px] font-mono">
                  <div className="text-slate-600">
                    Live Work: [{currentWorkVector.join(', ')}]
                  </div>
                  {selectedProc.need.every((nd, idx) => nd <= currentWorkVector[idx]) ? (
                    <div className="text-emerald-800 font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Process can execute immediately!</span>
                    </div>
                  ) : (
                    <div className="text-rose-800 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Deficit exists; process must wait.</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">
                  Initial Available: [{selectedProc.allocation.map(() => '?').join(', ')}]
                </p>
              )}
            </div>

            {/* 3. Pre-fill Request Simulator Trigger */}
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex flex-col justify-between gap-2 shadow-2xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Interactive Simulator
                </span>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Pre-fill vector inputs in Request Simulator for {selectedProc.name}.
                </p>
              </div>
              <button
                onClick={() => {
                  if (onQuickRequest) onQuickRequest(selectedProc.id);
                  const el = document.getElementById('request-simulator-deck');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full py-1.5 px-3 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-sans text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <span>Prefill Simulator for {selectedProc.name}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
