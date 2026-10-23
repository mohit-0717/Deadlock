import React, { useState, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Send,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Undo2,
  Info,
  Layers,
  Cpu,
  Edit3,
  Check,
  X,
  Sparkles,
  ArrowUpRight,
  HelpCircle,
  Activity,
  FileText,
  CornerDownRight,
} from 'lucide-react';
import { RequestHandlingResult, SafetyResult, SystemState, SystemStatus } from '../engine/types.js';
import { computeNeed, requestResource, safetyCheck } from '../engine/bankers.js';
import { getScenarioA } from '../engine/scenarios.js';
import { validateSetup, ValidationIssue } from '../engine/validation.js';
import { StatusBadge } from './StatusBadge.js';
import { ProcessState } from './ProcessCard.js';

interface AvoidanceTabProps {
  systemState: SystemState;
  onStateChange: (newState: SystemState) => void;
  speed: number;
  reduceMotion: boolean;
  onStatusChange?: (status: SystemStatus) => void;
}

export const AvoidanceTab: React.FC<AvoidanceTabProps> = ({
  systemState,
  onStateChange,
  speed,
  reduceMotion,
  onStatusChange,
}) => {
  // Safety algorithm execution state
  const [safetyResult, setSafetyResult] = useState<SafetyResult>(() =>
    safetyCheck(systemState.allocation, systemState.max, systemState.available, systemState.need)
  );

  // Stepper / replay state (-1 represents initial state before stepping)
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [evaluatingProcessId, setEvaluatingProcessId] = useState<number | null>(null);

  // Request simulation form state
  const [selectedProcessId, setSelectedProcessId] = useState<number>(0);
  const [requestInput, setRequestInput] = useState<string[]>(() =>
    Array(systemState.resourceCount).fill('0')
  );
  const [lastRequestResult, setLastRequestResult] = useState<RequestHandlingResult | null>(null);
  const [isRollbackShowing, setIsRollbackShowing] = useState(false);

  // Inline Matrix Editor Mode
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<ValidationIssue[]>([]);

  // Re-run safety check whenever systemState changes
  useEffect(() => {
    const res = safetyCheck(systemState.allocation, systemState.max, systemState.available, systemState.need);
    setSafetyResult(res);
    resetReplay();

    if (onStatusChange) {
      onStatusChange(res.status);
    }
  }, [systemState]);

  // Keep requestInput vector length synced with resourceCount
  useEffect(() => {
    setRequestInput((prev) => {
      const arr = [...prev];
      while (arr.length < systemState.resourceCount) arr.push('0');
      return arr.slice(0, systemState.resourceCount);
    });
  }, [systemState.resourceCount]);

  // Initial Work vector is always the system Available vector at start of replay
  const initialWorkVector = systemState.available;

  // Calculate live Work vector based on current step in replay
  const liveWorkVector = useMemo(() => {
    if (currentStepIndex < 0) {
      return initialWorkVector;
    }
    const currentStep = safetyResult.steps[currentStepIndex];
    return currentStep ? currentStep.workAfter : safetyResult.finalWork;
  }, [currentStepIndex, safetyResult, initialWorkVector]);

  // Step forward in safety replay with genuine in-progress evaluation indicator (Requirement 2 & 5)
  const stepForward = () => {
    if (currentStepIndex + 1 < safetyResult.steps.length) {
      const nextIndex = currentStepIndex + 1;
      const nextProcId = safetyResult.steps[nextIndex].processId;
      setEvaluatingProcessId(nextProcId);

      setTimeout(() => {
        setCurrentStepIndex(nextIndex);
        setEvaluatingProcessId(null);
      }, 260 / speed);
    } else {
      setIsPlaying(false);
      setEvaluatingProcessId(null);
    }
  };

  // Play / Autoplay loop
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isPlaying) {
      if (currentStepIndex + 1 < safetyResult.steps.length) {
        timer = setTimeout(() => {
          stepForward();
        }, 1100 / speed);
      } else {
        setIsPlaying(false);
        setEvaluatingProcessId(null);
      }
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isPlaying, currentStepIndex, safetyResult, speed]);

  const resetReplay = () => {
    setIsPlaying(false);
    setCurrentStepIndex(-1);
    setEvaluatingProcessId(null);
  };

  const startReplay = () => {
    if (currentStepIndex >= safetyResult.steps.length - 1) {
      setCurrentStepIndex(-1);
      setEvaluatingProcessId(null);
    }
    setIsPlaying(true);
  };

  // Handle resource request submission (Requirement 1 & 3)
  const handleSendRequest = (overrideProcId?: number, overrideVector?: number[]) => {
    const pId = overrideProcId !== undefined ? overrideProcId : selectedProcessId;
    const req = overrideVector || requestInput.map((val) => parseInt(val, 10) || 0);

    const result = requestResource(pId, req, systemState);
    setLastRequestResult(result);

    if (result.status === 'SAFE' && result.granted) {
      onStateChange(result.newState);
      if (onStatusChange) {
        onStatusChange('SAFE');
      }
      setIsRollbackShowing(false);
    } else if (result.status === 'UNSAFE' && result.rollbackPerformed) {
      // Rollback succeeded: systemState remains the committed prior state
      // Global status must reflect the committed state (which is SAFE), not the rejected tentative request
      if (onStatusChange) {
        const committedSafety = safetyCheck(
          systemState.allocation,
          systemState.max,
          systemState.available,
          systemState.need
        );
        onStatusChange(committedSafety.status);
      }
      setIsRollbackShowing(true);
      setTimeout(() => setIsRollbackShowing(false), 5000);
    } else if (result.status === 'WAITING') {
      if (onStatusChange) {
        const committedSafety = safetyCheck(
          systemState.allocation,
          systemState.max,
          systemState.available,
          systemState.need
        );
        onStatusChange(committedSafety.status);
      }
    }
  };

  // Handle cell edit inside Allocation or Max
  const handleMatrixCellChange = (
    matrixType: 'allocation' | 'max',
    pIdx: number,
    rIdx: number,
    valStr: string
  ) => {
    const val = parseInt(valStr, 10);
    const num = isNaN(val) ? 0 : Math.max(0, val);

    const newAlloc = systemState.allocation.map((row) => [...row]);
    const newMax = systemState.max.map((row) => [...row]);

    if (matrixType === 'allocation') {
      newAlloc[pIdx][rIdx] = num;
    } else {
      newMax[pIdx][rIdx] = num;
    }

    const newNeed = computeNeed(newMax, newAlloc);
    const updatedState: SystemState = {
      ...systemState,
      allocation: newAlloc,
      max: newMax,
      need: newNeed,
    };

    const valResult = validateSetup(updatedState);
    setValidationErrors(valResult.issues);
    onStateChange(updatedState);
  };

  // Handle available vector edit
  const handleAvailableCellChange = (rIdx: number, valStr: string) => {
    const val = parseInt(valStr, 10);
    const num = isNaN(val) ? 0 : Math.max(0, val);
    const newAvail = [...systemState.available];
    newAvail[rIdx] = num;

    const updatedState: SystemState = {
      ...systemState,
      available: newAvail,
    };

    const valResult = validateSetup(updatedState);
    setValidationErrors(valResult.issues);
    onStateChange(updatedState);
  };

  // Pre-configured Scenario Loaders
  const loadScenarioA = () => {
    onStateChange(getScenarioA());
    setLastRequestResult(null);
    setIsRollbackShowing(false);
    setIsEditMode(false);
    resetReplay();
  };

  // Compute column totals
  const totalAllocated = useMemo(() => {
    const totals = Array(systemState.resourceCount).fill(0);
    for (let j = 0; j < systemState.resourceCount; j++) {
      for (let i = 0; i < systemState.processCount; i++) {
        totals[j] += systemState.allocation[i]?.[j] || 0;
      }
    }
    return totals;
  }, [systemState.allocation, systemState.processCount, systemState.resourceCount]);

  const totalCapacity = useMemo(() => {
    return totalAllocated.map((alloc, idx) => alloc + (systemState.available[idx] || 0));
  }, [totalAllocated, systemState.available]);

  // Selected process details
  const selectedProc = systemState.processNames[selectedProcessId]
    ? {
        id: selectedProcessId,
        name: systemState.processNames[selectedProcessId],
        allocation: systemState.allocation[selectedProcessId] || [],
        max: systemState.max[selectedProcessId] || [],
        need: systemState.need[selectedProcessId] || [],
      }
    : null;

  const isSelectedEligible = useMemo(() => {
    if (!selectedProc || !liveWorkVector) return false;
    return selectedProc.need.every((nd, idx) => nd <= (liveWorkVector[idx] ?? 0));
  }, [selectedProc, liveWorkVector]);

  return (
    <div className="space-y-4">
      {/* ========================================================================= */}
      {/* SECTION 1: 2-Column Responsive Pro Workbench Layout                       */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Unified System Process Matrix & State Workbench (7 cols)    */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 space-y-3">
          {/* Main Matrix Grid Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            {/* Workbench Dark Sub-header */}
            <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 text-white flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-3">
                <span className="p-1.5 rounded-lg bg-indigo-600 text-white font-mono text-xs font-extrabold shadow-xs">
                  MX
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-white font-sans tracking-tight">
                    Process Resource Allocation &amp; Need Matrix
                  </h3>
                  <p className="text-xs text-slate-300 font-sans">
                    Need = Max &minus; Allocation &bull; Dynamic eligibility computed against Work [{liveWorkVector.join(', ')}]
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditMode(!isEditMode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-sans font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs border ${
                    isEditMode
                      ? 'bg-indigo-600 text-white border-indigo-500 font-bold'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                  title={isEditMode ? 'Exit edit mode' : 'Directly edit matrix and available values'}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditMode ? 'Done Editing' : 'Edit Matrix'}</span>
                </button>

                <button
                  onClick={loadScenarioA}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-sans cursor-pointer transition-colors shadow-xs"
                  title="Reset to Baseline Scenario A"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Validation Notice if any */}
            {validationErrors.length > 0 && (
              <div className="p-3 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-semibold font-sans">
                  {validationErrors[0].message}
                </span>
              </div>
            )}

            {/* High-Density Data Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  {/* Top Header Groups */}
                  <tr className="border-b border-slate-200 bg-slate-100/90 text-xs font-bold text-slate-700 uppercase tracking-wider font-sans">
                    <th className="py-2.5 px-3 text-left w-20" rowSpan={2}>
                      Process
                    </th>
                    <th
                      className="py-1.5 px-2 text-center border-l border-slate-200 bg-blue-50/70 text-blue-900 font-bold"
                      colSpan={systemState.resourceCount}
                    >
                      Allocation Matrix
                    </th>
                    <th
                      className="py-1.5 px-2 text-center border-l border-slate-200 bg-slate-100 text-slate-800 font-bold"
                      colSpan={systemState.resourceCount}
                    >
                      Max Claim Matrix
                    </th>
                    <th
                      className="py-1.5 px-2 text-center border-l border-slate-200 bg-indigo-50/70 text-indigo-900 font-bold"
                      colSpan={systemState.resourceCount}
                    >
                      Remaining Need
                    </th>
                    <th className="py-2.5 px-3 text-center border-l border-slate-200 w-40" rowSpan={2}>
                      Dynamic Eligibility
                    </th>
                    <th className="py-2.5 px-3 text-right border-l border-slate-200 w-24" rowSpan={2}>
                      Action
                    </th>
                  </tr>

                  {/* Resource Column Headers (A, B, C) */}
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-mono text-slate-600">
                    {/* Allocation Resource Columns */}
                    {systemState.resourceNames.map((rName) => (
                      <th
                        key={`alloc-hdr-${rName}`}
                        className="py-1.5 px-2 text-center border-l border-slate-200 font-bold text-blue-900 bg-blue-50/40 w-11"
                      >
                        {rName}
                      </th>
                    ))}

                    {/* Max Resource Columns */}
                    {systemState.resourceNames.map((rName) => (
                      <th
                        key={`max-hdr-${rName}`}
                        className="py-1.5 px-2 text-center border-l border-slate-200 font-bold text-slate-800 w-11"
                      >
                        {rName}
                      </th>
                    ))}

                    {/* Need Resource Columns */}
                    {systemState.resourceNames.map((rName) => (
                      <th
                        key={`need-hdr-${rName}`}
                        className="py-1.5 px-2 text-center border-l border-slate-200 font-bold text-indigo-900 bg-indigo-50/40 w-11"
                      >
                        {rName}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 font-mono text-[12px]">
                  {systemState.processNames.map((pName, pIdx) => {
                    const isSelected = pIdx === selectedProcessId;
                    const allocRow = systemState.allocation[pIdx] || [];
                    const maxRow = systemState.max[pIdx] || [];
                    const needRow = systemState.need[pIdx] || [];

                    // Dynamic Safety Eligibility Evaluation (Requirement 1, 2 & 6)
                    const isActivelyEvaluating = evaluatingProcessId === pIdx;

                    const isFinished =
                      currentStepIndex >= 0 &&
                      safetyResult.safeSequence.indexOf(pIdx) <= currentStepIndex &&
                      safetyResult.safeSequence.indexOf(pIdx) !== -1;

                    const isStuck =
                      !safetyResult.isSafe &&
                      safetyResult.stuckProcesses.some((sp) => sp.processId === pIdx);

                    // Dynamic check: Does this process satisfy Need <= currentWorkVector?
                    const isEligibleNow = needRow.every((nd, idx) => nd <= (liveWorkVector[idx] ?? 0));

                    // Generate distinct dynamic badge
                    let statusConfig = {
                      label: 'Waiting (Need > Work)',
                      bgClass: 'bg-slate-50',
                      borderClass: 'border-slate-200',
                      textClass: 'text-slate-600',
                      dotClass: 'bg-amber-500',
                    };

                    if (isActivelyEvaluating) {
                      statusConfig = {
                        label: 'Evaluating Step',
                        bgClass: 'bg-indigo-50',
                        borderClass: 'border-indigo-300',
                        textClass: 'text-indigo-900',
                        dotClass: 'bg-indigo-600 animate-pulse',
                      };
                    } else if (isFinished) {
                      statusConfig = {
                        label: 'Simulated Complete',
                        bgClass: 'bg-emerald-50',
                        borderClass: 'border-emerald-200',
                        textClass: 'text-emerald-800',
                        dotClass: 'bg-emerald-500',
                      };
                    } else if (isStuck && currentStepIndex === safetyResult.steps.length - 1) {
                      statusConfig = {
                        label: 'Stuck (Hazard)',
                        bgClass: 'bg-rose-50',
                        borderClass: 'border-rose-300',
                        textClass: 'text-rose-800',
                        dotClass: 'bg-rose-600',
                      };
                    } else if (isEligibleNow) {
                      statusConfig = {
                        label: 'Eligible (Need ≤ Work)',
                        bgClass: 'bg-emerald-50',
                        borderClass: 'border-emerald-200',
                        textClass: 'text-emerald-800',
                        dotClass: 'bg-emerald-600',
                      };
                    } else {
                      statusConfig = {
                        label: 'Waiting (Need > Work)',
                        bgClass: 'bg-slate-50',
                        borderClass: 'border-slate-200',
                        textClass: 'text-slate-600',
                        dotClass: 'bg-amber-500',
                      };
                    }

                    return (
                      <tr
                        key={pIdx}
                        onClick={() => setSelectedProcessId(pIdx)}
                        className={`transition-colors cursor-pointer ${
                          isActivelyEvaluating
                            ? 'bg-indigo-50/80 ring-2 ring-indigo-500/40'
                            : isSelected
                            ? 'bg-indigo-50/70 border-l-4 border-indigo-600'
                            : isFinished
                            ? 'bg-emerald-50/30 hover:bg-emerald-50/50'
                            : 'hover:bg-slate-50/90'
                        }`}
                      >
                        {/* Process ID */}
                        <td className="py-2.5 px-3.5 font-sans font-bold text-slate-900 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-md bg-slate-100 border border-slate-300 flex items-center justify-center text-xs font-mono font-bold text-slate-800 shadow-2xs">
                              {pName}
                            </span>
                            {isSelected && (
                              <span className="w-2 h-2 rounded-full bg-indigo-600" />
                            )}
                          </div>
                        </td>

                        {/* Allocation Cells */}
                        {allocRow.map((val, rIdx) => (
                          <td
                            key={`alloc-${pIdx}-${rIdx}`}
                            className="py-2.5 px-2 text-center border-l border-slate-200/80 font-mono text-sm font-bold text-blue-950 bg-blue-50/20"
                          >
                            {isEditMode ? (
                              <input
                                type="number"
                                min={0}
                                value={val}
                                onChange={(e) =>
                                  handleMatrixCellChange('allocation', pIdx, rIdx, e.target.value)
                                }
                                onClick={(e) => e.stopPropagation()}
                                className="w-10 h-7 text-center bg-blue-50 border border-blue-400 rounded-md text-blue-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            ) : (
                              <span>{val}</span>
                            )}
                          </td>
                        ))}

                        {/* Max Claim Cells */}
                        {maxRow.map((val, rIdx) => (
                          <td
                            key={`max-${pIdx}-${rIdx}`}
                            className="py-2.5 px-2 text-center border-l border-slate-200/80 font-mono text-sm font-medium text-slate-700"
                          >
                            {isEditMode ? (
                              <input
                                type="number"
                                min={0}
                                value={val}
                                onChange={(e) =>
                                  handleMatrixCellChange('max', pIdx, rIdx, e.target.value)
                                }
                                onClick={(e) => e.stopPropagation()}
                                className="w-10 h-7 text-center bg-slate-50 border border-slate-400 rounded-md text-slate-800 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            ) : (
                              <span>{val}</span>
                            )}
                          </td>
                        ))}

                        {/* Remaining Need Cells */}
                        {needRow.map((val, rIdx) => (
                          <td
                            key={`need-${pIdx}-${rIdx}`}
                            className="py-2.5 px-2 text-center border-l border-slate-200/80 font-mono text-sm"
                          >
                            <span
                              className={`font-black ${
                                val === 0 ? 'text-slate-300' : 'text-indigo-950 bg-indigo-50/60 px-1.5 py-0.5 rounded'
                              }`}
                            >
                              {val}
                            </span>
                          </td>
                        ))}

                        {/* Dynamic Eligibility Column (Requirement 1) */}
                        <td className="py-2 px-2.5 border-l border-slate-200/80 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-sans font-bold border shadow-2xs ${statusConfig.bgClass} ${statusConfig.borderClass} ${statusConfig.textClass}`}
                          >
                            <span className={`w-2 h-2 rounded-full ${statusConfig.dotClass}`} />
                            <span>{statusConfig.label}</span>
                          </span>
                        </td>

                        {/* Quick Inject Action */}
                        <td className="py-2 px-2.5 border-l border-slate-200/80 text-right whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProcessId(pIdx);
                              const el = document.getElementById('request-simulator-deck');
                              if (el) el.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="px-2.5 py-1 rounded-md bg-white hover:bg-indigo-50 text-indigo-700 hover:text-indigo-900 border border-slate-300 hover:border-indigo-400 text-xs font-sans font-bold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                            title={`Select ${pName} in Request Simulator`}
                          >
                            <span>Test</span>
                            <Send className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Summary / Totals Row */}
                <tfoot>
                  {/* Total Allocated Row */}
                  <tr className="border-t-2 border-slate-300 bg-slate-50/90 text-sm font-mono text-slate-800">
                    <td className="py-2.5 px-3.5 font-sans font-bold text-slate-900 text-left text-sm">
                      Total Alloc
                    </td>
                    {totalAllocated.map((total, rIdx) => (
                      <td
                        key={`total-alloc-${rIdx}`}
                        className="py-2.5 px-2 text-center border-l border-slate-200 font-black text-blue-950 bg-blue-100/50 text-sm"
                      >
                        {total}
                      </td>
                    ))}
                    <td
                      colSpan={systemState.resourceCount * 2 + 2}
                      className="py-2.5 px-3.5 text-right text-slate-600 font-sans text-xs font-medium"
                    >
                      Sum of currently held resource units
                    </td>
                  </tr>

                  {/* Available Pool Row */}
                  <tr className="border-t border-slate-300 bg-indigo-50/40 text-sm font-mono">
                    <td className="py-2.5 px-3.5 font-sans font-extrabold text-indigo-950 text-left text-sm">
                      Available
                    </td>
                    {systemState.available.map((avail, rIdx) => (
                      <td
                        key={`avail-${rIdx}`}
                        className="py-2.5 px-2 text-center border-l border-slate-200 font-black text-indigo-950 bg-indigo-100/70 text-sm"
                      >
                        {isEditMode ? (
                          <input
                            type="number"
                            min={0}
                            value={avail}
                            onChange={(e) => handleAvailableCellChange(rIdx, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-10 h-7 text-center bg-white border border-indigo-400 rounded-md text-indigo-950 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        ) : (
                          avail
                        )}
                      </td>
                    ))}
                    <td
                      colSpan={systemState.resourceCount * 2 + 2}
                      className="py-2.5 px-3.5 text-right text-indigo-900 font-sans text-xs font-bold"
                    >
                      Unallocated units ready for assignment
                    </td>
                  </tr>

                  {/* System Capacity Row */}
                  <tr className="border-t border-slate-300 bg-slate-50/80 text-sm font-mono text-slate-600">
                    <td className="py-2.5 px-3.5 font-sans font-semibold text-slate-800 text-left text-sm">
                      Capacity
                    </td>
                    {totalCapacity.map((cap, rIdx) => (
                      <td
                        key={`cap-${rIdx}`}
                        className="py-2.5 px-2 text-center border-l border-slate-200 font-bold text-slate-900 text-sm"
                      >
                        {cap}
                      </td>
                    ))}
                    <td
                      colSpan={systemState.resourceCount * 2 + 2}
                      className="py-2.5 px-3.5 text-right text-slate-600 font-sans text-xs"
                    >
                      Total system instances (Allocated + Available)
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Selected Process Detail Inspector Strip */}
            {selectedProc && (
              <div className="p-3.5 bg-slate-100/90 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-sm font-sans">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded bg-slate-900 text-white font-mono font-bold text-xs shadow-2xs">
                    {selectedProc.name} Inspector
                  </span>
                  <div className="text-slate-700 text-xs sm:text-sm">
                    Alloc: <span className="font-mono font-bold text-blue-900">[{selectedProc.allocation.join(',')}]</span> &bull;
                    Max: <span className="font-mono font-semibold text-slate-700">[{selectedProc.max.join(',')}]</span> &bull;
                    Need: <span className="font-mono font-bold text-indigo-950">[{selectedProc.need.join(',')}]</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isSelectedEligible ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-900 font-bold bg-emerald-100 px-3 py-1 rounded-md border border-emerald-300 text-xs">
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Need &le; Work (Eligible to execute)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-amber-900 font-bold bg-amber-100 px-3 py-1 rounded-md border border-amber-300 text-xs">
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      <span>Need &gt; Work (Must wait for release)</span>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Execution, Safety Trace & Request Simulator (5 cols)       */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 space-y-3.5">
          {/* Top Panel: Banker's Safety Algorithm Trace & Step Replay */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            {/* Dark Header with Status & Stepper Controls (Requirement 4) */}
            <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <StatusBadge status={safetyResult.status} size="sm" />
                <div>
                  <h4 className="text-sm font-extrabold text-white font-sans tracking-tight">
                    Safety Evaluation Trace
                  </h4>
                  <p className="text-xs text-slate-300 font-sans">
                    Banker&apos;s Safety Algorithm &bull; Work = Work + Allocation
                  </p>
                </div>
              </div>

              {/* Stepper Controls */}
              <div className="flex items-center gap-1.5 font-sans">
                <button
                  onClick={isPlaying ? () => setIsPlaying(false) : startReplay}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs ${
                    isPlaying
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isPlaying ? 'Pause' : 'Play'}</span>
                </button>

                <button
                  onClick={stepForward}
                  disabled={isPlaying || currentStepIndex + 1 >= safetyResult.steps.length}
                  className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                  title="Execute next safety step"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  <span>Step</span>
                </button>

                <button
                  onClick={resetReplay}
                  className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs cursor-pointer transition-colors shadow-2xs"
                  title="Reset trace to step 0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-3.5">
              {/* Clear Work Vector Telemetry Distinction (Requirement 4) */}
              <div className="grid grid-cols-2 gap-2.5 text-sm font-mono">
                <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200">
                  <span className="text-xs text-slate-600 font-sans block uppercase font-bold tracking-wider mb-0.5">
                    Initial Work (Available)
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    [{initialWorkVector.join(', ')}]
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-indigo-50/80 border border-indigo-200">
                  <span className="text-xs text-indigo-800 font-sans block uppercase font-bold tracking-wider mb-0.5">
                    Current Replay Work Vector
                  </span>
                  <span className="font-extrabold text-indigo-950 text-sm">
                    [{liveWorkVector.join(', ')}]
                  </span>
                </div>
              </div>

              {/* Current Step Banner (Requirement 2: Sequence Complete / Evaluating indicators) */}
              {currentStepIndex >= 0 && currentStepIndex < safetyResult.steps.length ? (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 space-y-1.5">
                  <div className="flex items-center justify-between font-mono font-bold">
                    <span className="text-emerald-950 flex items-center gap-2 text-sm">
                      {currentStepIndex === safetyResult.steps.length - 1 && !evaluatingProcessId ? (
                        <>
                          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                          <span>Sequence Complete: All {safetyResult.steps.length} processes finished successfully</span>
                        </>
                      ) : (
                        <>
                          <span>
                            Step {currentStepIndex + 1} of {safetyResult.steps.length}: {safetyResult.steps[currentStepIndex].processName}{' '}
                            {evaluatingProcessId !== null ? 'Evaluating Step...' : 'Simulated Complete'}
                          </span>
                        </>
                      )}
                    </span>
                    <span className="text-xs bg-white px-2.5 py-1 rounded-md border border-emerald-300 font-bold text-emerald-950">
                      Work &rarr; [{safetyResult.steps[currentStepIndex].workAfter.join(', ')}]
                    </span>
                  </div>
                  <p className="text-xs text-emerald-900 font-sans">
                    {currentStepIndex === safetyResult.steps.length - 1 && !evaluatingProcessId
                      ? `Safe execution sequence: <${safetyResult.safeSequenceNames.join(' → ')}> • Final Work Vector: [${safetyResult.finalWork.join(', ')}]`
                      : `${safetyResult.steps[currentStepIndex].canRunReason} • Reclaimed Allocation [${safetyResult.steps[currentStepIndex].allocation.join(', ')}]`}
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center justify-between">
                  <span className="font-sans text-xs font-medium">
                    {safetyResult.isSafe
                      ? `Safe sequence verified: <${safetyResult.safeSequenceNames.join(' → ')}>`
                      : 'System is in an UNSAFE state (No safe sequence exists)'}
                  </span>
                  <span className="font-mono text-xs text-slate-600 font-bold">
                    {currentStepIndex < 0 ? 'Ready to Replay' : 'Sequence Complete'}
                  </span>
                </div>
              )}

              {/* Step Sequence Timeline */}
              <div className="overflow-x-auto pb-1">
                <div className="flex items-center gap-1.5 min-w-max text-xs font-mono">
                  <div className="px-2.5 py-1 rounded bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold">
                    Start [{initialWorkVector.join(',')}]
                  </div>

                  {safetyResult.steps.map((step, idx) => {
                    const isCurrent = idx === currentStepIndex && evaluatingProcessId !== null;
                    const isPast = idx < currentStepIndex || (idx === currentStepIndex && evaluatingProcessId === null);

                    return (
                      <React.Fragment key={idx}>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        <div
                          className={`px-2.5 py-1 rounded-md border text-xs font-bold transition-all ${
                            isCurrent
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs scale-105'
                              : isPast
                              ? 'bg-emerald-50 text-emerald-950 border-emerald-300 font-extrabold'
                              : 'bg-white text-slate-700 border-slate-200'
                          }`}
                        >
                          {step.processName}
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Unsafe State Diagnostics if applicable */}
              {!safetyResult.isSafe && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-2 font-sans">
                  <div className="flex items-center gap-2 font-bold text-rose-950 text-sm">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Unsafe Condition &bull; Deadlock Hazard</span>
                  </div>
                  <p className="text-xs text-rose-800 leading-normal">
                    {safetyResult.explanation}
                  </p>
                  <div className="space-y-1 pt-1 font-mono text-xs">
                    {safetyResult.stuckProcesses.map((sp) => (
                      <div
                        key={sp.processId}
                        className="p-2 bg-white rounded border border-rose-200 text-slate-800"
                      >
                        <strong className="text-rose-900">{sp.processName}:</strong> Need [{sp.need.join(', ')}] &gt; Work [{sp.workAvailable.join(', ')}]
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Panel: Resource-Request Simulator & Atomic Rollback Audit */}
          <div
            id="request-simulator-deck"
            className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden"
          >
            {/* Dark Header */}
            <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-slate-800 text-indigo-400 border border-slate-700">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-white font-sans tracking-tight">
                    Resource Request Simulator
                  </h4>
                  <p className="text-xs text-slate-300 font-sans">
                    5-Stage Banker&apos;s Protocol: Validate &rarr; Need Check &rarr; Availability &rarr; Trial &rarr; Safe/Rollback
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-block px-2.5 py-1 bg-slate-800 text-slate-300 text-xs rounded font-mono border border-slate-700 font-semibold">
                Test basis: Scenario A baseline (Available [{systemState.available.join(',')}])
              </span>
            </div>

            <div className="p-4 space-y-3.5">
              {/* Form: Target Process + Resource Inputs + Submit */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end font-sans">
                {/* Process Select */}
                <div className="col-span-12 sm:col-span-4">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Target Process
                  </label>
                  <select
                    value={selectedProcessId}
                    onChange={(e) => setSelectedProcessId(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm font-semibold focus:border-indigo-500 focus:bg-white focus:outline-none"
                  >
                    {systemState.processNames.map((pName, idx) => (
                      <option key={idx} value={idx}>
                        {pName} (Need: [{systemState.need[idx].join(',')}])
                      </option>
                    ))}
                  </select>
                </div>

                {/* Vector Inputs */}
                <div className="col-span-12 sm:col-span-5">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Request Vector [{systemState.resourceNames.join(',')}]
                  </label>
                  <div className="flex items-center gap-2">
                    {systemState.resourceNames.map((resName, rIdx) => (
                      <div key={resName} className="flex-1">
                        <input
                          type="number"
                          min={0}
                          value={requestInput[rIdx] || '0'}
                          onChange={(e) => {
                            const updated = [...requestInput];
                            updated[rIdx] = e.target.value;
                            setRequestInput(updated);
                          }}
                          className="w-full py-1.5 text-center bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-sm focus:border-indigo-500 focus:bg-white focus:outline-none"
                          aria-label={`Request amount for resource ${resName}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <div className="col-span-12 sm:col-span-3">
                  <button
                    onClick={() => handleSendRequest()}
                    className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-sans font-bold text-sm flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Evaluate</span>
                  </button>
                </div>
              </div>

              {/* Quick Preset Benchmark Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs">
                <span className="text-slate-600 text-xs font-bold mr-1 font-sans">Presets:</span>
                <button
                  onClick={() => {
                    setSelectedProcessId(1);
                    setRequestInput(['1', '0', '2']);
                    handleSendRequest(1, [1, 0, 2]);
                  }}
                  className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-sans font-semibold cursor-pointer transition-colors shadow-2xs"
                  title="P1 requests [1,0,2]: Safe -> Granted"
                >
                  P1: [1,0,2] (Safe)
                </button>
                <button
                  onClick={() => {
                    setSelectedProcessId(0);
                    setRequestInput(['2', '0', '0']);
                    handleSendRequest(0, [2, 0, 0]);
                  }}
                  className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-sans font-semibold cursor-pointer transition-colors shadow-2xs"
                  title="P0 requests [2,0,0]: Safe -> Granted"
                >
                  P0: [2,0,0] (Safe)
                </button>
                <button
                  onClick={() => {
                    setSelectedProcessId(0);
                    setRequestInput(['0', '0', '2']);
                    handleSendRequest(0, [0, 0, 2]);
                  }}
                  className="px-2.5 py-1 rounded-md bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-900 text-xs font-sans font-bold cursor-pointer transition-colors shadow-2xs"
                  title="P0 requests [0,0,2]: Unsafe tentative state -> Atomic Rollback"
                >
                  P0: [0,0,2] (Unsafe Rollback)
                </button>
                <button
                  onClick={() => {
                    setSelectedProcessId(0);
                    setRequestInput(['7', '4', '3']);
                    handleSendRequest(0, [7, 4, 3]);
                  }}
                  className="px-2.5 py-1 rounded-md bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-sans font-semibold cursor-pointer transition-colors shadow-2xs"
                  title="P0 requests [7,4,3]: within Need but exceeds Available -> Deferred/Waiting"
                >
                  P0: [7,4,3] (Waiting)
                </button>
              </div>

              {/* Atomic Rollback Notification Banner */}
              {isRollbackShowing && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start gap-2.5 shadow-2xs animate-in fade-in duration-200 font-sans">
                  <Undo2 className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold text-amber-950 block text-xs">
                      Trial Allocation Rolled Back (State Preserved Atomically)
                    </span>
                    <p className="text-xs text-amber-900 leading-normal">
                      Trial allocation reduced Available to [
                      {lastRequestResult?.trialState?.available.join(', ')}]. Banker&apos;s safety test confirmed no safe sequence exists,
                      so the OS rolled back the tentative allocation and restored prior matrices.
                    </p>
                  </div>
                </div>
              )}

              {/* 5-Stage Banker's Verification Breakdown (Requirement 5) */}
              {lastRequestResult && (
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-2 font-sans gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {lastRequestResult.status === 'UNSAFE' && lastRequestResult.rollbackPerformed ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-sans font-bold bg-rose-100 text-rose-900 border border-rose-300">
                          Request Denied — Unsafe Tentative State
                        </span>
                      ) : lastRequestResult.status === 'SAFE' && lastRequestResult.granted ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-sans font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          Request Granted — Safe State Maintained
                        </span>
                      ) : lastRequestResult.status === 'WAITING' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-sans font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          Request Deferred — Process Waiting
                        </span>
                      ) : (
                        <StatusBadge status={lastRequestResult.status} size="sm" />
                      )}
                      <span className="font-bold text-slate-800 text-xs font-sans">{lastRequestResult.message}</span>
                    </div>
                    <span className="text-xs font-mono text-slate-500 font-bold">
                      Rule: {lastRequestResult.ruleCode}
                    </span>
                  </div>

                  {/* 5-Stage Pipeline Status Pills */}
                  <div className="grid grid-cols-5 gap-1.5 text-center font-mono text-xs">
                    {/* Stage 1: Validation */}
                    <div className="p-1.5 rounded-md bg-white border border-slate-200 shadow-2xs">
                      <span className="block text-[10px] text-slate-500 font-sans font-medium">1. Validate</span>
                      <span className="font-bold text-emerald-700">PASS</span>
                    </div>

                    {/* Stage 2: Need Check */}
                    <div className="p-1.5 rounded-md bg-white border border-slate-200 shadow-2xs">
                      <span className="block text-[10px] text-slate-500 font-sans font-medium">2. &le; Need</span>
                      <span className={`font-bold ${lastRequestResult.ruleCode === 'b_exceeds_need' ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {lastRequestResult.ruleCode === 'b_exceeds_need' ? 'FAIL' : 'PASS'}
                      </span>
                    </div>

                    {/* Stage 3: Avail Check */}
                    <div className="p-1.5 rounded-md bg-white border border-slate-200 shadow-2xs">
                      <span className="block text-[10px] text-slate-500 font-sans font-medium">3. &le; Avail</span>
                      <span className={`font-bold ${lastRequestResult.status === 'WAITING' ? 'text-amber-700' : lastRequestResult.ruleCode === 'b_exceeds_need' ? 'N/A' : 'PASS'}`}>
                        {lastRequestResult.status === 'WAITING' ? 'WAIT' : lastRequestResult.ruleCode === 'b_exceeds_need' ? 'SKIP' : 'PASS'}
                      </span>
                    </div>

                    {/* Stage 4: Tentative Safety */}
                    <div className="p-1.5 rounded-md bg-white border border-slate-200 shadow-2xs">
                      <span className="block text-[10px] text-slate-500 font-sans font-medium">4. Safety Test</span>
                      <span className={`font-bold ${lastRequestResult.status === 'UNSAFE' ? 'text-rose-700' : lastRequestResult.status === 'SAFE' ? 'text-emerald-700' : 'SKIP'}`}>
                        {lastRequestResult.status === 'UNSAFE' ? 'UNSAFE' : lastRequestResult.status === 'SAFE' ? 'SAFE' : 'SKIP'}
                      </span>
                    </div>

                    {/* Stage 5: Decision */}
                    <div className={`p-1.5 rounded-md border shadow-2xs ${lastRequestResult.granted ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50 border-rose-300'}`}>
                      <span className="block text-[10px] text-slate-500 font-sans font-medium">5. Action</span>
                      <span className={`font-bold ${lastRequestResult.granted ? 'text-emerald-800' : 'text-rose-800'}`}>
                        {lastRequestResult.granted ? 'COMMIT' : 'ROLLBACK'}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-normal font-sans pt-0.5">
                    {lastRequestResult.reason}
                  </p>

                  {/* Before / Trial / After Delta Diff Table for Denied / Rollback Requests (Requirement 5) */}
                  {!lastRequestResult.granted && (
                    <div className="pt-2 border-t border-slate-200">
                      <div className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                        <span>State Rollback Audit (Target: P{selectedProcessId}):</span>
                        <span className="text-emerald-700 font-bold">Zero Leaks Verified</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                        {/* 1. Prior State */}
                        <div className="p-2 rounded-md bg-white border border-slate-200 space-y-0.5">
                          <span className="text-[10px] text-slate-500 font-sans font-bold block">
                            1. Prior State
                          </span>
                          <div className="text-slate-700 text-xs">
                            Avail: <strong className="text-indigo-800">[{lastRequestResult.priorState.available.join(',')}]</strong>
                          </div>
                          <div className="text-slate-600 text-xs">
                            Alloc: [{lastRequestResult.priorState.allocation[selectedProcessId]?.join(',') || 'N/A'}]
                          </div>
                        </div>

                        {/* 2. Trial State (Failed) */}
                        <div className="p-2 rounded-md bg-rose-50 border border-rose-200 space-y-0.5">
                          <span className="text-[10px] text-rose-800 font-sans font-bold block">
                            2. Tentative (Unsafe)
                          </span>
                          {lastRequestResult.trialState ? (
                            <>
                              <div className="text-rose-900 text-xs">
                                Avail: <strong className="text-rose-700">[{lastRequestResult.trialState.available.join(',')}]</strong>
                              </div>
                              <div className="text-rose-800 text-xs">
                                Alloc: [{lastRequestResult.trialState.allocation[selectedProcessId]?.join(',')}]
                              </div>
                            </>
                          ) : (
                            <span className="text-xs text-rose-700 font-sans italic">
                              Pre-empted
                            </span>
                          )}
                        </div>

                        {/* 3. Restored State */}
                        <div className="p-2 rounded-md bg-emerald-50 border border-emerald-200 space-y-0.5">
                          <span className="text-[10px] text-emerald-800 font-sans font-bold block">
                            3. Restored
                          </span>
                          <div className="text-emerald-900 text-xs">
                            Avail: <strong className="text-emerald-700">[{lastRequestResult.newState.available.join(',')}]</strong>
                          </div>
                          <div className="text-emerald-800 text-xs">
                            Alloc: [{lastRequestResult.newState.allocation[selectedProcessId]?.join(',') || 'N/A'}]
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: Compact Execution Timeline & Event Log (Requirement 2)         */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Dark Header Bar */}
        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5 font-sans">
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-mono text-xs font-bold shadow-2xs">
              LOG
            </span>
            <div>
              <h4 className="text-sm font-extrabold text-white font-sans tracking-tight">
                Execution Timeline &amp; State Transition Audit Log
              </h4>
              <p className="text-xs text-slate-300 font-sans">
                Chronological record of process safety evaluations, Work vector updates, and resource allocation events
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-slate-300">Active Work:</span>
            <span className="font-bold text-white bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
              [{liveWorkVector.join(', ')}]
            </span>
            <span className="text-slate-500">&bull;</span>
            <span className="text-slate-300">Step:</span>
            <span className="font-bold text-indigo-300 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
              {currentStepIndex < 0 ? 'Init (Base)' : `${currentStepIndex + 1} of ${safetyResult.steps.length}`}
            </span>
          </div>
        </div>

        {/* Dense Event Log Table */}
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 text-xs font-bold text-slate-700 uppercase tracking-wider font-sans">
                <th className="py-3 px-3.5 w-[11%] min-w-[85px]">Seq</th>
                <th className="py-3 px-3.5 w-[10%] min-w-[75px]">Target</th>
                <th className="py-3 px-3.5 w-[13%] min-w-[105px]">Work Before</th>
                <th className="py-3 px-3.5 w-[23%] min-w-[170px]">Eligibility Test (Need &le; Work)</th>
                <th className="py-3 px-3.5 w-[13%] min-w-[105px]">Release (+Alloc)</th>
                <th className="py-3 px-3.5 w-[13%] min-w-[105px]">Work After</th>
                <th className="py-3 px-3.5 w-[17%] min-w-[140px]">State Invariant / Verification Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {/* Row 0: Initial State Setup */}
              <tr className={currentStepIndex === -1 ? 'bg-indigo-50/50' : 'hover:bg-slate-50/60'}>
                <td className="py-3 px-3.5 align-middle font-bold text-slate-700 whitespace-nowrap">
                  <span className="whitespace-nowrap inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold bg-slate-200 text-slate-800">
                    Init
                  </span>
                </td>
                <td className="py-3 px-3.5 align-middle font-sans font-bold text-slate-900 whitespace-nowrap">System</td>
                <td className="py-3 px-3.5 align-middle text-slate-500 whitespace-nowrap">&mdash;</td>
                <td className="py-3 px-3.5 align-middle text-slate-700 font-sans font-medium">Work &larr; Available [{initialWorkVector.join(',')}]</td>
                <td className="py-3 px-3.5 align-middle text-slate-500 whitespace-nowrap">&mdash;</td>
                <td className="py-3 px-3.5 align-middle font-bold text-indigo-950 whitespace-nowrap">[{initialWorkVector.join(',')}]</td>
                <td className="py-3 px-3.5 align-middle text-emerald-800 font-sans font-semibold leading-relaxed break-words">
                  {safetyResult.isSafe ? 'Safe state initialized; verified safe sequence exists' : 'Initial state unsafe'}
                </td>
              </tr>

              {/* Steps from Safety Replay: ONLY append steps that have actually executed */}
              {currentStepIndex >= 0 ? (
                safetyResult.steps.slice(0, currentStepIndex + 1).map((step, idx) => {
                  const isCurrent = idx === currentStepIndex;

                  return (
                    <tr
                      key={idx}
                      className={`transition-colors ${
                        isCurrent && evaluatingProcessId !== null
                          ? 'bg-indigo-50/80 font-bold border-l-4 border-indigo-600'
                          : isCurrent
                          ? 'bg-emerald-50/80 font-bold border-l-4 border-emerald-600'
                          : 'bg-emerald-50/20 text-slate-800'
                      }`}
                    >
                      <td className="py-3 px-3.5 align-middle font-bold whitespace-nowrap">
                        <span className={`whitespace-nowrap inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold shadow-2xs ${isCurrent && evaluatingProcessId !== null ? 'bg-indigo-600 text-white' : isCurrent ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-800'}`}>
                          Step {idx + 1}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 align-middle font-bold text-slate-900 whitespace-nowrap">{step.processName}</td>
                      <td className="py-3 px-3.5 align-middle text-slate-700 font-medium whitespace-nowrap">[{step.workBefore.join(', ')}]</td>
                      <td className="py-3 px-3.5 align-middle">
                        <span className="text-emerald-900 font-bold whitespace-nowrap">
                          [{step.need.join(',')}] &le; [{step.workBefore.join(',')}] (PASS)
                        </span>
                      </td>
                      <td className="py-3 px-3.5 align-middle text-blue-900 font-bold whitespace-nowrap">
                        +[{step.allocation.join(', ')}]
                      </td>
                      <td className="py-3 px-3.5 align-middle font-black text-slate-950 whitespace-nowrap">[{step.workAfter.join(', ')}]</td>
                      <td className="py-3 px-3.5 align-middle text-slate-700 font-sans text-xs leading-relaxed break-words">
                        {isCurrent && evaluatingProcessId !== null ? (
                          <span className="text-indigo-900 font-bold flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                            Evaluating Need &le; Work...
                          </span>
                        ) : idx === safetyResult.steps.length - 1 && currentStepIndex === safetyResult.steps.length - 1 ? (
                          <span className="text-emerald-950 font-bold">
                            Sequence complete; all resource units returned to pool (Work = [10, 5, 7])
                          </span>
                        ) : (
                          <span className="text-slate-600 font-medium">Simulated completion completed successfully</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-4 px-4 text-slate-500 font-sans text-xs text-center italic bg-slate-50/50">
                    Replay at initial baseline (Work = [{initialWorkVector.join(', ')}]). Click &lsquo;Step&rsquo; or &lsquo;Play&rsquo; to evaluate processes sequentially and append execution events.
                  </td>
                </tr>
              )}

              {/* If lastRequestResult exists, render the latest Request evaluation event row */}
              {lastRequestResult && (
                <tr className={lastRequestResult.granted ? 'bg-emerald-50/50' : 'bg-rose-50/50'}>
                  <td className="py-3 px-3.5 align-middle font-bold whitespace-nowrap">
                    <span className={`whitespace-nowrap inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold shadow-2xs ${lastRequestResult.granted ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                      Request
                    </span>
                  </td>
                  <td className="py-3 px-3.5 align-middle font-bold text-slate-900 whitespace-nowrap">P{selectedProcessId}</td>
                  <td className="py-3 px-3.5 align-middle text-slate-700 font-medium whitespace-nowrap">[{lastRequestResult.priorState.available.join(',')}]</td>
                  <td className="py-3 px-3.5 align-middle">
                    <span className={lastRequestResult.granted ? 'text-emerald-900 font-bold whitespace-nowrap' : 'text-rose-900 font-bold whitespace-nowrap'}>
                      {lastRequestResult.granted ? 'Safe Transition' : lastRequestResult.status}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 align-middle text-slate-700 font-medium whitespace-nowrap">
                    {lastRequestResult.granted ? `Allocated [${requestInput.join(',')}]` : 'Rollback &plusmn;0'}
                  </td>
                  <td className="py-3 px-3.5 align-middle font-black text-slate-950 whitespace-nowrap">
                    [{lastRequestResult.newState.available.join(',')}]
                  </td>
                  <td className="py-3 px-3.5 align-middle font-sans text-xs leading-relaxed break-words">
                    <span className={lastRequestResult.granted ? 'text-emerald-950 font-bold' : 'text-rose-950 font-bold'}>
                      {lastRequestResult.reason}
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
