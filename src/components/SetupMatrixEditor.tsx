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
    <div className="bg-white rounded-2xl shadow-xs overflow-hidden border border-slate-200 transition-all">
      {/* Header Bar with Collapsible Action */}
      <div
        className="px-4 py-3 bg-slate-50/70 hover:bg-slate-100/60 flex flex-wrap items-center justify-between gap-3 cursor-pointer transition-colors border-b border-slate-200"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-xs tracking-tight font-sans">
                System Matrix Specification &amp; Custom Dimensions
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold">
                {state.processCount}P &times; {state.resourceCount}R
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-sans mt-0.5">
              Allocation [A], Maximum Claim [M], Derived Need [N], Available Pool [W]
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {scenarioActions}

          {errors.length > 0 ? (
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-rose-50 border border-rose-300 text-rose-800 font-sans font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              {errors.length} Error{errors.length > 1 ? 's' : ''}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-sans font-semibold">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              Valid Matrix Invariant
            </span>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            className="text-xs font-sans font-medium px-2.5 py-1 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
          >
            <span>{isOpen ? 'Hide Matrix Editor' : 'Edit Matrices'}</span>
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="p-4 sm:p-6 space-y-5 bg-white border-t border-slate-200 animate-in fade-in duration-200">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 text-xs">
            {/* Dimension Steppers */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                <span className="text-slate-600 font-mono text-[11px] font-semibold">Processes ({state.processCount}):</span>
                <button
                  onClick={addProcess}
                  disabled={state.processCount >= 9}
                  className="p-1 rounded bg-white hover:bg-slate-100 border border-slate-300 disabled:opacity-30 text-indigo-700 cursor-pointer shadow-2xs"
                  title="Add Process"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <button
                  onClick={removeProcess}
                  disabled={state.processCount <= 2}
                  className="p-1 rounded bg-white hover:bg-slate-100 border border-slate-300 disabled:opacity-30 text-rose-600 cursor-pointer shadow-2xs"
                  title="Remove Process"
                >
                  <Minus className="w-3 h-3" />
                </button>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                <span className="text-slate-600 font-mono text-[11px] font-semibold">Resources ({state.resourceCount}):</span>
                <button
                  onClick={addResource}
                  disabled={state.resourceCount >= 6}
                  className="p-1 rounded bg-white hover:bg-slate-100 border border-slate-300 disabled:opacity-30 text-indigo-700 cursor-pointer shadow-2xs"
                  title="Add Resource Type"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <button
                  onClick={removeResource}
                  disabled={state.resourceCount <= 2}
                  className="p-1 rounded bg-white hover:bg-slate-100 border border-slate-300 disabled:opacity-30 text-rose-600 cursor-pointer shadow-2xs"
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
                className="px-3 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-mono text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
              >
                <span>Reset Scenario A</span>
              </button>
              <button
                onClick={onReset}
                className="px-3 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-mono text-[11px] flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Revert Edits</span>
              </button>
            </div>
          </div>

          {/* Validation Feedback Banners */}
          {errors.length > 0 && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-800 font-mono uppercase">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Matrix Specification Inconsistencies Detected:</span>
              </div>
              <ul className="text-xs text-rose-700 list-disc list-inside space-y-0.5 font-mono pl-1">
                {errors.map((e, idx) => (
                  <li key={idx}>{e.message}</li>
                ))}
              </ul>
            </div>
          )}

          {warnings.length > 0 && errors.length === 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-800 font-mono uppercase">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Telemetry Advisory:</span>
              </div>
              <ul className="text-xs text-amber-700 list-disc list-inside space-y-0.5 font-mono pl-1">
                {warnings.map((w, idx) => (
                  <li key={idx}>{w.message}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Segmented Matrix View Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 max-w-fit">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-white text-indigo-700 border border-slate-200 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Matrices Overview
            </button>
            <button
              onClick={() => setActiveTab('allocation')}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                activeTab === 'allocation'
                  ? 'bg-white text-blue-700 border border-slate-200 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Allocation [A]
            </button>
            <button
              onClick={() => setActiveTab('max')}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                activeTab === 'max'
                  ? 'bg-white text-purple-700 border border-slate-200 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Max Claim [M]
            </button>
            <button
              onClick={() => setActiveTab('need')}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                activeTab === 'need'
                  ? 'bg-white text-emerald-700 border border-slate-200 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Need [N = M - A]
            </button>
            <button
              onClick={() => setActiveTab('available')}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                activeTab === 'available'
                  ? 'bg-white text-amber-700 border border-slate-200 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Available &amp; Totals
            </button>
          </div>

          {/* Matrix Content Displays */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Allocation Matrix Table */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-blue-700 uppercase tracking-wider">
                    Allocation [A]
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono font-semibold">Editable</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono text-center">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-1 px-1.5 text-left text-slate-600">Proc</th>
                        {state.resourceNames.map((r) => (
                          <th key={r} className="py-1 px-1.5 text-blue-700 font-bold">{r}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {state.allocation.map((row, pIdx) => (
                        <tr key={pIdx} className="border-b border-slate-100 hover:bg-blue-50/50">
                          <td className="py-1 px-1.5 text-left font-bold text-slate-800">{state.processNames[pIdx]}</td>
                          {row.map((val, rIdx) => (
                            <td key={rIdx} className="py-1 px-1">
                              <input
                                type="number"
                                min={0}
                                value={val}
                                onChange={(e) => updateCell('allocation', pIdx, rIdx, e.target.value)}
                                className="w-11 px-1.5 py-0.5 rounded bg-white border border-slate-300 focus:border-indigo-500 text-center font-mono font-bold text-blue-800 focus:outline-none shadow-2xs"
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
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-purple-700 uppercase tracking-wider">
                    Max Claim [M]
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono font-semibold">Editable</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono text-center">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-1 px-1.5 text-left text-slate-600">Proc</th>
                        {state.resourceNames.map((r) => (
                          <th key={r} className="py-1 px-1.5 text-purple-700 font-bold">{r}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {state.max.map((row, pIdx) => (
                        <tr key={pIdx} className="border-b border-slate-100 hover:bg-purple-50/50">
                          <td className="py-1 px-1.5 text-left font-bold text-slate-800">{state.processNames[pIdx]}</td>
                          {row.map((val, rIdx) => (
                            <td key={rIdx} className="py-1 px-1">
                              <input
                                type="number"
                                min={0}
                                value={val}
                                onChange={(e) => updateCell('max', pIdx, rIdx, e.target.value)}
                                className="w-11 px-1.5 py-0.5 rounded bg-white border border-slate-300 focus:border-indigo-500 text-center font-mono font-bold text-purple-800 focus:outline-none shadow-2xs"
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
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-emerald-800 uppercase tracking-wider">
                    Need [N = M - A]
                  </span>
                  <span className="text-[10px] text-emerald-700 font-mono font-semibold">Auto-Computed</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono text-center">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-1 px-1.5 text-left text-slate-600">Proc</th>
                        {state.resourceNames.map((r) => (
                          <th key={r} className="py-1 px-1.5 text-emerald-700 font-bold">{r}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {state.need.map((row, pIdx) => (
                        <tr key={pIdx} className="border-b border-slate-100 hover:bg-emerald-50/50">
                          <td className="py-1 px-1.5 text-left font-bold text-slate-800">{state.processNames[pIdx]}</td>
                          {row.map((val, rIdx) => (
                            <td key={rIdx} className="py-1 px-1">
                              <span
                                className={`inline-block w-11 px-1.5 py-0.5 rounded bg-white border ${
                                  val < 0 ? 'border-rose-400 text-rose-700' : 'border-emerald-300 text-emerald-800'
                                } font-mono font-bold shadow-2xs`}
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
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs">
              <h4 className="text-xs font-mono font-bold text-blue-700 uppercase mb-3">
                Allocation Matrix (Resources currently held by each process)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono text-center">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2 px-3 text-left">Process</th>
                      {state.resourceNames.map((r) => (
                        <th key={r} className="py-2 px-3 text-blue-700 font-bold">Resource {r}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {state.allocation.map((row, pIdx) => (
                      <tr key={pIdx} className="border-b border-slate-100 hover:bg-blue-50/50">
                        <td className="py-2 px-3 text-left font-bold text-slate-800">{state.processNames[pIdx]}</td>
                        {row.map((val, rIdx) => (
                          <td key={rIdx} className="py-2 px-3">
                            <input
                              type="number"
                              min={0}
                              value={val}
                              onChange={(e) => updateCell('allocation', pIdx, rIdx, e.target.value)}
                              className="w-16 px-2 py-1 rounded bg-white border border-slate-300 focus:border-indigo-500 text-center font-mono font-bold text-blue-800 focus:outline-none shadow-2xs"
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
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs">
              <h4 className="text-xs font-mono font-bold text-purple-700 uppercase mb-3">
                Maximum Claim Matrix (Peak resource claim declared by each process)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono text-center">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2 px-3 text-left">Process</th>
                      {state.resourceNames.map((r) => (
                        <th key={r} className="py-2 px-3 text-purple-700 font-bold">Resource {r}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {state.max.map((row, pIdx) => (
                      <tr key={pIdx} className="border-b border-slate-100 hover:bg-purple-50/50">
                        <td className="py-2 px-3 text-left font-bold text-slate-800">{state.processNames[pIdx]}</td>
                        {row.map((val, rIdx) => (
                          <td key={rIdx} className="py-2 px-3">
                            <input
                              type="number"
                              min={0}
                              value={val}
                              onChange={(e) => updateCell('max', pIdx, rIdx, e.target.value)}
                              className="w-16 px-2 py-1 rounded bg-white border border-slate-300 focus:border-indigo-500 text-center font-mono font-bold text-purple-800 focus:outline-none shadow-2xs"
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
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-mono font-bold text-emerald-800 uppercase">
                  Remaining Need Matrix: Need[i][j] = Max[i][j] - Allocation[i][j]
                </h4>
                <span className="text-[11px] font-mono text-emerald-700 font-semibold">Strict Rule 3: Automatically Computed</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono text-center">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2 px-3 text-left">Process</th>
                      {state.resourceNames.map((r) => (
                        <th key={r} className="py-2 px-3 text-emerald-700 font-bold">Resource {r}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {state.need.map((row, pIdx) => (
                      <tr key={pIdx} className="border-b border-slate-100 hover:bg-emerald-50/50">
                        <td className="py-2 px-3 text-left font-bold text-slate-800">{state.processNames[pIdx]}</td>
                        {row.map((val, rIdx) => (
                          <td key={rIdx} className="py-2 px-3">
                            <span
                              className={`inline-block w-16 px-2 py-1 rounded bg-white border ${
                                val < 0 ? 'border-rose-400 text-rose-700' : 'border-emerald-300 text-emerald-800'
                              } font-mono font-bold shadow-2xs`}
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
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs space-y-4">
              <div>
                <h4 className="text-xs font-mono font-bold text-amber-800 uppercase mb-2">
                  Available Vector [W] (Unallocated instances ready for immediate dispatch)
                </h4>
                <div className="flex flex-wrap gap-3">
                  {state.available.map((amt, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs">
                      <span className="font-mono text-xs text-amber-800 font-bold">{state.resourceNames[idx]}:</span>
                      <input
                        type="number"
                        min={0}
                        value={amt}
                        onChange={(e) => updateAvailable(idx, e.target.value)}
                        className="w-14 px-1.5 py-0.5 rounded bg-slate-50 border border-slate-300 focus:border-indigo-500 text-center font-mono font-bold text-slate-900 focus:outline-none shadow-2xs"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {state.totalInstances && (
                <div className="pt-3 border-t border-slate-200">
                  <h4 className="text-xs font-mono font-bold text-indigo-700 uppercase mb-2">
                    Total System Instances [E]
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {state.totalInstances.map((amt, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs">
                        <span className="font-mono text-xs text-indigo-700 font-bold">{state.resourceNames[idx]}:</span>
                        <input
                          type="number"
                          min={0}
                          value={amt}
                          onChange={(e) => updateCapacity(idx, e.target.value)}
                          className="w-14 px-1.5 py-0.5 rounded bg-slate-50 border border-slate-300 focus:border-indigo-500 text-center font-mono font-bold text-slate-900 focus:outline-none shadow-2xs"
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
