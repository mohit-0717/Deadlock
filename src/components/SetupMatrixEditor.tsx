import React from 'react';
import { Plus, Minus, RotateCcw, AlertTriangle, Check, Sliders, ChevronDown, ChevronUp, Database, FileSpreadsheet } from 'lucide-react';
import { SystemState } from '../engine/types.js';
import { computeNeed } from '../engine/bankers.js';
import { validateSetup, ValidationIssue } from '../engine/validation.js';
import { getScenarioA } from '../engine/scenarios.js';

interface SetupMatrixEditorProps {
  state: SystemState;
  onChange: (newState: SystemState) => void;
  onReset: () => void;
  scenarioActions?: React.ReactNode;
}

type MatrixTab = 'overview' | 'allocation' | 'max' | 'need' | 'available';

export const SetupMatrixEditor: React.FC<SetupMatrixEditorProps> = ({
  state,
  onChange,
  onReset,
  scenarioActions,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<MatrixTab>('overview');
  const [validationIssues, setValidationIssues] = React.useState<ValidationIssue[]>([]);

  // Validate on state change
  React.useEffect(() => {
    const valResult = validateSetup(state);
    setValidationIssues(valResult.issues);
  }, [state]);

  const updateCell = (
    matrixType: 'allocation' | 'max',
    procIdx: number,
    resIdx: number,
    valStr: string
  ) => {
    const val = parseInt(valStr, 10);
    const num = isNaN(val) ? 0 : Math.max(0, val);

    const newAlloc = state.allocation.map((row) => [...row]);
    const newMax = state.max.map((row) => [...row]);

    if (matrixType === 'allocation') {
      newAlloc[procIdx][resIdx] = num;
    } else {
      newMax[procIdx][resIdx] = num;
    }

    const newNeed = computeNeed(newMax, newAlloc);
    onChange({
      ...state,
      allocation: newAlloc,
      max: newMax,
      need: newNeed,
    });
  };

  const updateAvailable = (resIdx: number, valStr: string) => {
    const val = parseInt(valStr, 10);
    const num = isNaN(val) ? 0 : Math.max(0, val);
    const newAvail = [...state.available];
    newAvail[resIdx] = num;

    onChange({
      ...state,
      available: newAvail,
    });
  };

  const updateCapacity = (resIdx: number, valStr: string) => {
    const val = parseInt(valStr, 10);
    const num = isNaN(val) ? 0 : Math.max(0, val);
    const newTotals = state.totalInstances ? [...state.totalInstances] : Array(state.resourceCount).fill(10);
    newTotals[resIdx] = num;

    onChange({
      ...state,
      totalInstances: newTotals,
    });
  };

  const addProcess = () => {
    const newIndex = state.processCount;
    if (newIndex >= 9) return; // Cap at 9 for clean layout
    const newAlloc = [...state.allocation, Array(state.resourceCount).fill(0)];
    const newMax = [...state.max, Array(state.resourceCount).fill(2)];
    const newNeed = computeNeed(newMax, newAlloc);
    const newProcNames = [...state.processNames, `P${newIndex}`];

    onChange({
      ...state,
      processCount: newIndex + 1,
      processNames: newProcNames,
      allocation: newAlloc,
      max: newMax,
      need: newNeed,
    });
  };

  const removeProcess = () => {
    if (state.processCount <= 2) return;
    const newCount = state.processCount - 1;
    const newAlloc = state.allocation.slice(0, newCount);
    const newMax = state.max.slice(0, newCount);
    const newNeed = computeNeed(newMax, newAlloc);
    const newProcNames = state.processNames.slice(0, newCount);

    onChange({
      ...state,
      processCount: newCount,
      processNames: newProcNames,
      allocation: newAlloc,
      max: newMax,
      need: newNeed,
    });
  };

  const addResource = () => {
    const newResIndex = state.resourceCount;
    if (newResIndex >= 6) return; // Cap at 6 (A-F)
    const newChar = String.fromCharCode(65 + newResIndex);
    const newAlloc = state.allocation.map((row) => [...row, 0]);
    const newMax = state.max.map((row) => [...row, 1]);
    const newNeed = computeNeed(newMax, newAlloc);
    const newAvail = [...state.available, 3];
    const newTotals = state.totalInstances ? [...state.totalInstances, 5] : undefined;

    onChange({
      ...state,
      resourceCount: newResIndex + 1,
      resourceNames: [...state.resourceNames, newChar],
      available: newAvail,
      totalInstances: newTotals,
      allocation: newAlloc,
      max: newMax,
      need: newNeed,
    });
  };

  const removeResource = () => {
    if (state.resourceCount <= 2) return;
    const newCount = state.resourceCount - 1;
    const newAlloc = state.allocation.map((row) => row.slice(0, newCount));
    const newMax = state.max.map((row) => row.slice(0, newCount));
    const newNeed = computeNeed(newMax, newAlloc);
    const newAvail = state.available.slice(0, newCount);
    const newTotals = state.totalInstances ? state.totalInstances.slice(0, newCount) : undefined;
    const newResNames = state.resourceNames.slice(0, newCount);

    onChange({
      ...state,
      resourceCount: newCount,
      resourceNames: newResNames,
      available: newAvail,
      totalInstances: newTotals,
      allocation: newAlloc,
      max: newMax,
      need: newNeed,
    });
  };

  const errors = validationIssues.filter((i) => i.severity === 'error');
  const warnings = validationIssues.filter((i) => i.severity === 'warning');

  return (
    <div className="cockpit-glass rounded-2xl shadow-xl overflow-hidden border border-cyan-500/25 transition-all">
      {/* Header Bar with Collapsible Action */}
      <div
        className="px-5 py-3.5 bg-slate-900/80 hover:bg-slate-900/95 flex flex-wrap items-center justify-between gap-3 cursor-pointer transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 text-sm tracking-tight font-mono">
                System Matrix &amp; Dimensions HUD
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
                {state.processCount}P &times; {state.resourceCount}R
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Allocation [A], Maximum Claim [M], Need [N], Available [W]
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {scenarioActions}

          {errors.length > 0 ? (
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-red-950/80 border border-red-500/60 text-red-300 font-mono">
              <AlertTriangle className="w-3.5 h-3.5" />
              {errors.length} Error{errors.length > 1 ? 's' : ''}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 font-mono">
              <Check className="w-3.5 h-3.5" />
              Valid Matrix State
            </span>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            className="text-xs font-mono font-semibold px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
          >
            <span>{isOpen ? 'Close Matrices' : 'Open Matrix Editor'}</span>
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="p-4 sm:p-6 space-y-5 bg-slate-950/40 border-t border-slate-800/80 animate-in fade-in duration-200">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80 text-xs">
            {/* Dimension Steppers */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/70 px-2.5 py-1 rounded-lg">
                <span className="text-slate-400 font-mono text-[11px]">Processes ({state.processCount}):</span>
                <button
                  onClick={addProcess}
                  disabled={state.processCount >= 9}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-cyan-300 cursor-pointer"
                  title="Add Process"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <button
                  onClick={removeProcess}
                  disabled={state.processCount <= 2}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-rose-300 cursor-pointer"
                  title="Remove Process"
                >
                  <Minus className="w-3 h-3" />
                </button>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/70 px-2.5 py-1 rounded-lg">
                <span className="text-slate-400 font-mono text-[11px]">Resources ({state.resourceCount}):</span>
                <button
                  onClick={addResource}
                  disabled={state.resourceCount >= 6}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-cyan-300 cursor-pointer"
                  title="Add Resource Type"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <button
                  onClick={removeResource}
                  disabled={state.resourceCount <= 2}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-rose-300 cursor-pointer"
                  title="Remove Resource Type"
                >
                  <Minus className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onChange(getScenarioA())}
                className="px-3 py-1 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-300 font-mono text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
              >
                <span>Reset Scenario A</span>
              </button>
              <button
                onClick={onReset}
                className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[11px] flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Revert Edits</span>
              </button>
            </div>
          </div>

          {/* Validation Feedback Banners */}
          {errors.length > 0 && (
            <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/60 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-red-300 font-mono uppercase">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span>Matrix Specification Inconsistencies Detected:</span>
              </div>
              <ul className="text-xs text-red-200/90 list-disc list-inside space-y-0.5 font-mono pl-1">
                {errors.map((e, idx) => (
                  <li key={idx}>{e.message}</li>
                ))}
              </ul>
            </div>
          )}

          {warnings.length > 0 && errors.length === 0 && (
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/50 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300 font-mono uppercase">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Telemetry Advisory:</span>
              </div>
              <ul className="text-xs text-amber-200/90 list-disc list-inside space-y-0.5 font-mono pl-1">
                {warnings.map((w, idx) => (
                  <li key={idx}>{w.message}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Segmented Matrix View Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800 max-w-fit">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Matrices Overview
            </button>
            <button
              onClick={() => setActiveTab('allocation')}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                activeTab === 'allocation'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Allocation [A]
            </button>
            <button
              onClick={() => setActiveTab('max')}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                activeTab === 'max'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Max Claim [M]
            </button>
            <button
              onClick={() => setActiveTab('need')}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                activeTab === 'need'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Need [N = M - A]
            </button>
            <button
              onClick={() => setActiveTab('available')}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                activeTab === 'available'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Available &amp; Totals
            </button>
          </div>

          {/* Matrix Content Displays */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Allocation Matrix Table */}
              <div className="p-3.5 rounded-xl cockpit-glass-subtle border border-blue-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-blue-300 uppercase tracking-wider">
                    Allocation [A]
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Editable</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono text-center">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-1 px-1.5 text-left text-slate-500">Proc</th>
                        {state.resourceNames.map((r) => (
                          <th key={r} className="py-1 px-1.5 text-blue-400">{r}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {state.allocation.map((row, pIdx) => (
                        <tr key={pIdx} className="border-b border-slate-800/40 hover:bg-blue-950/20">
                          <td className="py-1 px-1.5 text-left font-bold text-slate-300">{state.processNames[pIdx]}</td>
                          {row.map((val, rIdx) => (
                            <td key={rIdx} className="py-1 px-1">
                              <input
                                type="number"
                                min={0}
                                value={val}
                                onChange={(e) => updateCell('allocation', pIdx, rIdx, e.target.value)}
                                className="w-11 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 focus:border-blue-500 text-center font-mono text-blue-200 focus:outline-none"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Max Claim Matrix Table */}
              <div className="p-3.5 rounded-xl cockpit-glass-subtle border border-purple-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-purple-300 uppercase tracking-wider">
                    Max Claim [M]
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Editable</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono text-center">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-1 px-1.5 text-left text-slate-500">Proc</th>
                        {state.resourceNames.map((r) => (
                          <th key={r} className="py-1 px-1.5 text-purple-400">{r}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {state.max.map((row, pIdx) => (
                        <tr key={pIdx} className="border-b border-slate-800/40 hover:bg-purple-950/20">
                          <td className="py-1 px-1.5 text-left font-bold text-slate-300">{state.processNames[pIdx]}</td>
                          {row.map((val, rIdx) => (
                            <td key={rIdx} className="py-1 px-1">
                              <input
                                type="number"
                                min={0}
                                value={val}
                                onChange={(e) => updateCell('max', pIdx, rIdx, e.target.value)}
                                className="w-11 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 focus:border-purple-500 text-center font-mono text-purple-200 focus:outline-none"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Need Matrix Table (Rule: Auto-computed) */}
              <div className="p-3.5 rounded-xl cockpit-glass-subtle border border-emerald-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-emerald-300 uppercase tracking-wider">
                    Need [N = M - A]
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">Auto-Computed</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono text-center">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-1 px-1.5 text-left text-slate-500">Proc</th>
                        {state.resourceNames.map((r) => (
                          <th key={r} className="py-1 px-1.5 text-emerald-400">{r}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {state.need.map((row, pIdx) => (
                        <tr key={pIdx} className="border-b border-slate-800/40 hover:bg-emerald-950/20">
                          <td className="py-1 px-1.5 text-left font-bold text-slate-300">{state.processNames[pIdx]}</td>
                          {row.map((val, rIdx) => (
                            <td key={rIdx} className="py-1 px-1">
                              <span
                                className={`inline-block w-11 px-1.5 py-0.5 rounded bg-emerald-950/40 border ${
                                  val < 0 ? 'border-red-500 text-red-300' : 'border-emerald-500/30 text-emerald-300'
                                } font-mono font-bold`}
                              >
                                {val}
                              </span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'allocation' && (
            <div className="p-4 rounded-xl cockpit-glass-subtle border border-blue-500/30">
              <h4 className="text-xs font-mono font-bold text-blue-300 uppercase mb-3">
                Allocation Matrix (Resources currently held by each process)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono text-center">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2 px-3 text-left">Process</th>
                      {state.resourceNames.map((r) => (
                        <th key={r} className="py-2 px-3 text-blue-400">Resource {r}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {state.allocation.map((row, pIdx) => (
                      <tr key={pIdx} className="border-b border-slate-800/50 hover:bg-blue-950/20">
                        <td className="py-2 px-3 text-left font-bold text-slate-200">{state.processNames[pIdx]}</td>
                        {row.map((val, rIdx) => (
                          <td key={rIdx} className="py-2 px-3">
                            <input
                              type="number"
                              min={0}
                              value={val}
                              onChange={(e) => updateCell('allocation', pIdx, rIdx, e.target.value)}
                              className="w-16 px-2 py-1 rounded bg-slate-900 border border-slate-700 focus:border-blue-500 text-center font-mono text-blue-200 focus:outline-none"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'max' && (
            <div className="p-4 rounded-xl cockpit-glass-subtle border border-purple-500/30">
              <h4 className="text-xs font-mono font-bold text-purple-300 uppercase mb-3">
                Maximum Claim Matrix (Peak resource claim declared by each process)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono text-center">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2 px-3 text-left">Process</th>
                      {state.resourceNames.map((r) => (
                        <th key={r} className="py-2 px-3 text-purple-400">Resource {r}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {state.max.map((row, pIdx) => (
                      <tr key={pIdx} className="border-b border-slate-800/50 hover:bg-purple-950/20">
                        <td className="py-2 px-3 text-left font-bold text-slate-200">{state.processNames[pIdx]}</td>
                        {row.map((val, rIdx) => (
                          <td key={rIdx} className="py-2 px-3">
                            <input
                              type="number"
                              min={0}
                              value={val}
                              onChange={(e) => updateCell('max', pIdx, rIdx, e.target.value)}
                              className="w-16 px-2 py-1 rounded bg-slate-900 border border-slate-700 focus:border-purple-500 text-center font-mono text-purple-200 focus:outline-none"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'need' && (
            <div className="p-4 rounded-xl cockpit-glass-subtle border border-emerald-500/30">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-mono font-bold text-emerald-300 uppercase">
                  Remaining Need Matrix: Need[i][j] = Max[i][j] - Allocation[i][j]
                </h4>
                <span className="text-[11px] font-mono text-emerald-400">Strict Rule 3: Automatically Computed</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono text-center">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2 px-3 text-left">Process</th>
                      {state.resourceNames.map((r) => (
                        <th key={r} className="py-2 px-3 text-emerald-400">Resource {r}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {state.need.map((row, pIdx) => (
                      <tr key={pIdx} className="border-b border-slate-800/50 hover:bg-emerald-950/20">
                        <td className="py-2 px-3 text-left font-bold text-slate-200">{state.processNames[pIdx]}</td>
                        {row.map((val, rIdx) => (
                          <td key={rIdx} className="py-2 px-3">
                            <span
                              className={`inline-block w-16 px-2 py-1 rounded bg-emerald-950/40 border ${
                                val < 0 ? 'border-red-500 text-red-300' : 'border-emerald-500/30 text-emerald-300'
                              } font-mono font-bold`}
                            >
                              {val}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'available' && (
            <div className="p-4 rounded-xl cockpit-glass-subtle border border-amber-500/30 space-y-4">
              <div>
                <h4 className="text-xs font-mono font-bold text-amber-300 uppercase mb-2">
                  Available Vector [W] (Unallocated instances ready for immediate dispatch)
                </h4>
                <div className="flex flex-wrap gap-3">
                  {state.available.map((amt, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg">
                      <span className="font-mono text-xs text-amber-400 font-bold">{state.resourceNames[idx]}:</span>
                      <input
                        type="number"
                        min={0}
                        value={amt}
                        onChange={(e) => updateAvailable(idx, e.target.value)}
                        className="w-14 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 focus:border-amber-500 text-center font-mono text-amber-200 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {state.totalInstances && (
                <div className="pt-3 border-t border-slate-800">
                  <h4 className="text-xs font-mono font-bold text-cyan-300 uppercase mb-2">
                    Total System Instances [E]
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {state.totalInstances.map((amt, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg">
                        <span className="font-mono text-xs text-cyan-400 font-bold">{state.resourceNames[idx]}:</span>
                        <input
                          type="number"
                          min={0}
                          value={amt}
                          onChange={(e) => updateCapacity(idx, e.target.value)}
                          className="w-14 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 focus:border-cyan-500 text-center font-mono text-cyan-200 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
