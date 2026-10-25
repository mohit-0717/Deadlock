import React, { useState, useEffect, useMemo } from 'react';
import {
  Play,
  SkipForward,
  RotateCcw,
  Send,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Edit3,
  Check,
  Undo2,
  Info,
  GitBranch,
} from 'lucide-react';
import { RequestHandlingResult, SafetyResult, SystemState, SystemStatus } from '../engine/types.js';
import { computeNeed, requestResource, safetyCheck } from '../engine/bankers.js';
import { getScenarioA } from '../engine/scenarios.js';
import { validateSetup, ValidationIssue } from '../engine/validation.js';
import { RAGGraphView } from './RAGGraphView.js';
import { buildRAG } from '../engine/detection.js';

interface AvoidanceTabProps {
  systemState: SystemState;
  onStateChange: (newState: SystemState) => void;
  speed?: number;
  reduceMotion?: boolean;
  onStatusChange?: (status: SystemStatus) => void;
}

export const AvoidanceTab: React.FC<AvoidanceTabProps> = ({
  systemState,
  onStateChange,
  onStatusChange,
}) => {
  // Safety algorithm execution state
  const [safetyResult, setSafetyResult] = useState<SafetyResult>(() =>
    safetyCheck(systemState.allocation, systemState.max, systemState.available, systemState.need)
  );

  // Stepper state (-1 represents initial state before stepping)
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);

  // Request simulation form state
  const [selectedProcessId, setSelectedProcessId] = useState<number>(0);
  const [requestInput, setRequestInput] = useState<string[]>(() =>
    Array(systemState.resourceCount).fill('0')
  );
  const [lastRequestResult, setLastRequestResult] = useState<RequestHandlingResult | null>(null);

  // Inline Matrix Editor Mode
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [showRAGGraph, setShowRAGGraph] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<ValidationIssue[]>([]);

  // Compute live RAG graph directly from Banker's current state
  const ragGraph = useMemo(() => {
    return buildRAG(
      systemState.allocation,
      systemState.need,
      systemState.available,
      systemState.totalInstances,
      systemState.processNames,
      systemState.resourceNames
    );
  }, [systemState]);

  // Re-run safety check whenever systemState changes
  useEffect(() => {
    const res = safetyCheck(systemState.allocation, systemState.max, systemState.available, systemState.need);
    setSafetyResult(res);
    setCurrentStepIndex(-1);

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

  // Initial Work vector is always the system Available vector at start
  const initialWorkVector = systemState.available;

  // Calculate live Work vector based on current step in replay
  const liveWorkVector = useMemo(() => {
    if (currentStepIndex < 0) {
      return initialWorkVector;
    }
    const currentStep = safetyResult.steps[currentStepIndex];
    return currentStep ? currentStep.workAfter : safetyResult.finalWork;
  }, [currentStepIndex, safetyResult, initialWorkVector]);

  // Step forward in safety algorithm
  const stepForward = () => {
    if (currentStepIndex + 1 < safetyResult.steps.length) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const runAllSteps = () => {
    setCurrentStepIndex(safetyResult.steps.length - 1);
  };

  const resetSteps = () => {
    setCurrentStepIndex(-1);
  };

  // Handle resource request submission
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
    } else {
      // Unsafe or Waiting: keep system in prior committed state
      if (onStatusChange) {
        onStatusChange(safetyResult.status);
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

  // Preset Loaders
  const loadScenario = (type: 'A' | 'B' | 'C') => {
    setLastRequestResult(null);
    setIsEditMode(false);
    resetSteps();

    if (type === 'A') {
      onStateChange(getScenarioA());
    } else if (type === 'B') {
      const base = getScenarioA();
      const res = requestResource(0, [7, 4, 3], base);
      setSelectedProcessId(0);
      setRequestInput(['7', '4', '3']);
      setLastRequestResult(res);
      onStateChange(res.newState);
    } else if (type === 'C') {
      const base = getScenarioA();
      const res = requestResource(0, [0, 0, 2], base);
      setSelectedProcessId(0);
      setRequestInput(['0', '0', '2']);
      setLastRequestResult(res);
      onStateChange(res.newState);
    }
  };

  // Total allocated per resource
  const totalAllocated = useMemo(() => {
    const totals = Array(systemState.resourceCount).fill(0);
    for (let j = 0; j < systemState.resourceCount; j++) {
      for (let i = 0; i < systemState.processCount; i++) {
        totals[j] += systemState.allocation[i]?.[j] || 0;
      }
    }
    return totals;
  }, [systemState.allocation, systemState.processCount, systemState.resourceCount]);

  return (
    <div className="space-y-6">
      {/* 1. Academic Header & Scenario Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                Banker&apos;s Algorithm (Deadlock Avoidance)
              </h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Silberschatz Textbook Model
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl">
              The Banker&apos;s Algorithm avoids deadlock by testing every resource allocation before granting it.
              A request is only granted if the resulting system state remains <strong>SAFE</strong> (i.e. at least one sequence of process execution exists that guarantees all processes finish).
            </p>
          </div>

          {/* Clean Academic Scenario Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-600">Preset Examples:</span>
            <button
              onClick={() => loadScenario('A')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer"
              title="Baseline Safe State (P0-P4 with Available [3, 3, 2])"
            >
              1. Safe State (Baseline)
            </button>
            <button
              onClick={() => loadScenario('B')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
              title="Request exceeds available: Process must wait"
            >
              2. Waiting Request
            </button>
            <button
              onClick={() => loadScenario('C')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
              title="Unsafe Request P0 [0,0,2] -> Denied and Rolled Back"
            >
              3. Unsafe (Rollback)
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main System Matrices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Table Title Bar */}
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              System Resource Matrices
            </h3>
            <p className="text-xs text-slate-500">
              Need = Max &minus; Allocation &bull; Work starts at Available = [{initialWorkVector.join(', ')}]
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRAGGraph(!showRAGGraph)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors cursor-pointer ${
                showRAGGraph
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-300 font-bold'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
              title="Toggle live Resource Allocation Graph for these Banker's inputs"
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>{showRAGGraph ? 'Hide RAG Graph' : 'Show Live RAG Graph'}</span>
            </button>

            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors cursor-pointer ${
                isEditMode
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditMode ? 'Done Editing' : 'Edit Matrices'}</span>
            </button>

            <button
              onClick={() => loadScenario('A')}
              className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Reset to default values"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Validation Errors Notice */}
        {validationErrors.length > 0 && (
          <div className="p-3 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{validationErrors[0].message}</span>
          </div>
        )}

        {/* Crisp Academic Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-4 text-left w-24">Process</th>
                <th className="py-2.5 px-3 text-center border-l border-slate-200 bg-blue-50/60 text-blue-900" colSpan={systemState.resourceCount}>
                  Allocation (Held)
                </th>
                <th className="py-2.5 px-3 text-center border-l border-slate-200 text-slate-800" colSpan={systemState.resourceCount}>
                  Max (Claim)
                </th>
                <th className="py-2.5 px-3 text-center border-l border-slate-200 bg-indigo-50/60 text-indigo-900" colSpan={systemState.resourceCount}>
                  Need (Max &minus; Alloc)
                </th>
                <th className="py-2.5 px-4 text-center border-l border-slate-200 w-44">
                  Eligibility (Need &le; Work)
                </th>
              </tr>
              <tr className="bg-slate-50 text-slate-600 font-mono text-xs border-b border-slate-200">
                <th className="py-1 px-4 text-left text-slate-400">P_i</th>
                {systemState.resourceNames.map((r) => (
                  <th key={`alloc-h-${r}`} className="py-1 px-2 text-center border-l border-slate-200 text-blue-800 bg-blue-50/30 w-12">
                    {r}
                  </th>
                ))}
                {systemState.resourceNames.map((r) => (
                  <th key={`max-h-${r}`} className="py-1 px-2 text-center border-l border-slate-200 text-slate-700 w-12">
                    {r}
                  </th>
                ))}
                {systemState.resourceNames.map((r) => (
                  <th key={`need-h-${r}`} className="py-1 px-2 text-center border-l border-slate-200 text-indigo-800 bg-indigo-50/30 w-12">
                    {r}
                  </th>
                ))}
                <th className="py-1 px-4 text-center border-l border-slate-200 text-slate-400 font-sans text-[11px]">
                  Work = [{liveWorkVector.join(', ')}]
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {systemState.processNames.map((pName, pIdx) => {
                const isSelected = selectedProcessId === pIdx;
                const need = systemState.need[pIdx];
                const canRun = need.every((nd, rIdx) => nd <= (liveWorkVector[rIdx] ?? 0));
                const isStepFinished = currentStepIndex >= 0 && safetyResult.steps.slice(0, currentStepIndex + 1).some(s => s.processId === pIdx);
                const isCurrentActiveStep = currentStepIndex >= 0 && safetyResult.steps[currentStepIndex]?.processId === pIdx;

                return (
                  <tr
                    key={pIdx}
                    onClick={() => setSelectedProcessId(pIdx)}
                    className={`cursor-pointer transition-colors ${
                      isCurrentActiveStep
                        ? 'bg-indigo-50/90 font-bold'
                        : isStepFinished
                        ? 'bg-emerald-50/50'
                        : isSelected
                        ? 'bg-slate-50'
                        : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <td className="py-2.5 px-4 font-sans font-bold text-slate-900 flex items-center gap-2">
                      <span>{pName}</span>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                      )}
                    </td>

                    {/* Allocation Cells */}
                    {systemState.resourceNames.map((_, rIdx) => (
                      <td key={`alloc-${pIdx}-${rIdx}`} className="py-2 px-2 text-center border-l border-slate-100 text-blue-900 font-semibold bg-blue-50/20">
                        {isEditMode ? (
                          <input
                            type="number"
                            min={0}
                            value={systemState.allocation[pIdx][rIdx]}
                            onChange={(e) => handleMatrixCellChange('allocation', pIdx, rIdx, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-10 h-6 text-center bg-white border border-slate-300 rounded text-slate-900 font-bold"
                          />
                        ) : (
                          systemState.allocation[pIdx][rIdx]
                        )}
                      </td>
                    ))}

                    {/* Max Cells */}
                    {systemState.resourceNames.map((_, rIdx) => (
                      <td key={`max-${pIdx}-${rIdx}`} className="py-2 px-2 text-center border-l border-slate-100 text-slate-700">
                        {isEditMode ? (
                          <input
                            type="number"
                            min={0}
                            value={systemState.max[pIdx][rIdx]}
                            onChange={(e) => handleMatrixCellChange('max', pIdx, rIdx, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-10 h-6 text-center bg-white border border-slate-300 rounded text-slate-900 font-bold"
                          />
                        ) : (
                          systemState.max[pIdx][rIdx]
                        )}
                      </td>
                    ))}

                    {/* Need Cells */}
                    {systemState.resourceNames.map((_, rIdx) => (
                      <td key={`need-${pIdx}-${rIdx}`} className="py-2 px-2 text-center border-l border-slate-100 text-indigo-900 font-bold bg-indigo-50/20">
                        {systemState.need[pIdx][rIdx]}
                      </td>
                    ))}

                    {/* Eligibility Badge */}
                    <td className="py-2 px-4 text-center border-l border-slate-100 font-sans">
                      {isStepFinished ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <Check className="w-3 h-3" />
                          <span>Finished</span>
                        </span>
                      ) : canRun ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <span>Need &le; Work (Can Run)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          <span>Need &gt; Work (Must Wait)</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Table Footer: Available Pool */}
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50 font-mono text-xs">
                <td className="py-3 px-4 font-sans font-bold text-slate-800 text-left">
                  Available
                </td>
                {/* Total Allocated */}
                {totalAllocated.map((total, rIdx) => (
                  <td key={`total-alloc-${rIdx}`} className="py-3 px-2 text-center border-l border-slate-200 text-slate-500 text-xs">
                    (Tot: {total})
                  </td>
                ))}
                {/* Empty max spacer */}
                <td colSpan={systemState.resourceCount} className="border-l border-slate-200 bg-slate-50/50"></td>
                {/* Available Pool Values */}
                {systemState.available.map((avail, rIdx) => (
                  <td key={`avail-${rIdx}`} className="py-3 px-2 text-center border-l border-slate-200 font-extrabold text-emerald-700 bg-emerald-50/60 text-sm">
                    {isEditMode ? (
                      <input
                        type="number"
                        min={0}
                        value={avail}
                        onChange={(e) => handleAvailableCellChange(rIdx, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-10 h-6 text-center bg-white border border-emerald-400 rounded text-emerald-950 font-bold"
                      />
                    ) : (
                      avail
                    )}
                  </td>
                ))}
                <td className="py-3 px-4 text-center border-l border-slate-200 font-sans text-xs text-slate-500 font-medium">
                  Free instances available
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Optional Live RAG Graph corresponding to Banker's matrices */}
      {showRAGGraph && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-indigo-600" />
              <h4 className="text-sm font-bold text-slate-800">
                Live Resource Allocation Graph (from Banker&apos;s Allocation &amp; Need)
              </h4>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Solid edges = Holding (Allocation) &bull; Dashed edges = Requesting (Need)
            </span>
          </div>
          <div className="p-4">
            <RAGGraphView
              graph={ragGraph}
              hasDeadlock={!safetyResult.isSafe}
              deadlockedProcessNames={
                !safetyResult.isSafe
                  ? safetyResult.stuckProcesses.map((p) => p.processName)
                  : []
              }
              isSingleInstance={false}
            />
          </div>
        </div>
      )}

      {/* 3. Safety Check & Step-by-Step Execution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Safety Result & Execution Stepper (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3.5">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Safety Algorithm Execution
              </h3>
              <p className="text-xs text-slate-500">
                Searches for a safe sequence where each process can finish and release its allocation to Work.
              </p>
            </div>

            {/* Simple Step Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={runAllSteps}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title="Run complete algorithm to find safe sequence"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Run Full Check</span>
              </button>

              <button
                onClick={stepForward}
                disabled={currentStepIndex + 1 >= safetyResult.steps.length}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Execute next process in safe sequence"
              >
                <SkipForward className="w-3.5 h-3.5" />
                <span>Step Process</span>
              </button>

              <button
                onClick={resetSteps}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-300 transition-colors cursor-pointer"
                title="Reset step counter"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Big, Obvious Result Banner */}
          {safetyResult.isSafe ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="font-bold text-sm text-emerald-900">
                  SYSTEM IS IN A SAFE STATE
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs font-semibold text-emerald-800">Verified Safe Sequence:</span>
                <span className="font-mono text-sm font-bold bg-white px-3 py-1 rounded-lg border border-emerald-300 text-emerald-900 shadow-2xs">
                  &lt; {safetyResult.safeSequenceNames.join(' → ')} &gt;
                </span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed pt-1">
                A safe sequence exists. Every process can obtain its maximum needed resources, complete execution, and release resources back into the available pool. No deadlock can occur.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <span className="font-bold text-sm text-rose-900">
                  SYSTEM IS IN AN UNSAFE STATE
                </span>
              </div>
              <p className="text-xs text-rose-800 leading-relaxed">
                {safetyResult.explanation || 'No safe sequence exists. The remaining processes have resource requirements that exceed the currently available pool.'}
              </p>
            </div>
          )}

          {/* Clean Step-by-Step Table */}
          {safetyResult.steps.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-slate-700 block">
                Execution Steps Trace (Work = Work + Allocation):
              </span>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold text-left border-b border-slate-200">
                      <th className="py-2 px-3 w-16">Step</th>
                      <th className="py-2 px-3 w-20">Process</th>
                      <th className="py-2 px-3">Work Before</th>
                      <th className="py-2 px-3">Allocation Released</th>
                      <th className="py-2 px-3">New Work Available</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-xs">
                    {safetyResult.steps.map((step, idx) => {
                      const isExecuted = idx <= currentStepIndex;

                      return (
                        <tr
                          key={idx}
                          className={`transition-colors ${
                            isExecuted
                              ? 'bg-emerald-50/60 font-semibold text-emerald-950'
                              : 'text-slate-400'
                          }`}
                        >
                          <td className="py-2 px-3 font-sans">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 font-sans font-bold">
                            {step.processName}
                          </td>
                          <td className="py-2 px-3">
                            [{step.workBefore.join(', ')}]
                          </td>
                          <td className="py-2 px-3 text-blue-800">
                            +[{step.allocation.join(', ')}]
                          </td>
                          <td className="py-2 px-3 font-bold text-emerald-800">
                            [{step.workAfter.join(', ')}]
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right: Resource-Request Algorithm Tester (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="border-b border-slate-200 pb-3.5">
            <h3 className="text-sm font-bold text-slate-900">
              Test Resource Request
            </h3>
            <p className="text-xs text-slate-500">
              Test if a process request can be granted using Banker&apos;s 3-step check.
            </p>
          </div>

          {/* Form */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Select Requesting Process:
              </label>
              <select
                value={selectedProcessId}
                onChange={(e) => setSelectedProcessId(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs font-semibold focus:border-indigo-500 focus:bg-white focus:outline-none"
              >
                {systemState.processNames.map((pName, idx) => (
                  <option key={idx} value={idx}>
                    {pName} (Need: [{systemState.need[idx].join(', ')}], Alloc: [{systemState.allocation[idx].join(', ')}])
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Requested Quantities [{systemState.resourceNames.join(', ')}]:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {systemState.resourceNames.map((rName, rIdx) => (
                  <div key={rName} className="text-center">
                    <span className="text-[11px] font-bold text-slate-500 block mb-0.5">{rName}</span>
                    <input
                      type="number"
                      min={0}
                      value={requestInput[rIdx] || '0'}
                      onChange={(e) => {
                        const copy = [...requestInput];
                        copy[rIdx] = e.target.value;
                        setRequestInput(copy);
                      }}
                      className="w-full py-1.5 text-center bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-sm focus:border-indigo-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleSendRequest()}
              className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Evaluate Resource Request</span>
            </button>

            {/* Quick Test Chips */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] font-bold text-slate-500 mr-1">Quick Test:</span>
              <button
                onClick={() => {
                  setSelectedProcessId(1);
                  setRequestInput(['1', '0', '2']);
                  handleSendRequest(1, [1, 0, 2]);
                }}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium cursor-pointer"
              >
                P1: [1, 0, 2] (Safe)
              </button>
              <button
                onClick={() => {
                  setSelectedProcessId(0);
                  setRequestInput(['0', '0', '2']);
                  handleSendRequest(0, [0, 0, 2]);
                }}
                className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-semibold cursor-pointer"
              >
                P0: [0, 0, 2] (Unsafe)
              </button>
              <button
                onClick={() => {
                  setSelectedProcessId(0);
                  setRequestInput(['7', '4', '3']);
                  handleSendRequest(0, [7, 4, 3]);
                }}
                className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-medium cursor-pointer"
              >
                P0: [7, 4, 3] (Wait)
              </button>
            </div>
          </div>

          {/* Request Result Explanation */}
          {lastRequestResult && (
            <div className="pt-2 space-y-2.5 text-xs border-t border-slate-200">
              <span className="font-bold text-slate-700 block">
                Banker&apos;s Algorithm Decision:
              </span>

              {lastRequestResult.granted ? (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>REQUEST GRANTED</span>
                  </div>
                  <p className="text-xs text-emerald-800">
                    {lastRequestResult.reason}
                  </p>
                </div>
              ) : lastRequestResult.status === 'WAITING' ? (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-950 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>PROCESS MUST WAIT</span>
                  </div>
                  <p className="text-xs text-amber-800">
                    {lastRequestResult.reason}
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-rose-950 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-rose-900 text-xs">
                    <Undo2 className="w-4 h-4 text-rose-600" />
                    <span>REQUEST DENIED (ROLLED BACK)</span>
                  </div>
                  <p className="text-xs text-rose-800">
                    {lastRequestResult.reason}
                  </p>
                </div>
              )}

              {/* 3 Verification Checks */}
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] space-y-1 font-sans">
                <div className="flex items-center justify-between">
                  <span>1. Request &le; Need:</span>
                  <span className={`font-bold ${lastRequestResult.ruleCode === 'b_exceeds_need' ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {lastRequestResult.ruleCode === 'b_exceeds_need' ? 'FAILED' : 'PASSED'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>2. Request &le; Available:</span>
                  <span className={`font-bold ${lastRequestResult.status === 'WAITING' ? 'text-amber-700' : 'text-emerald-700'}`}>
                    {lastRequestResult.status === 'WAITING' ? 'WAIT (Not enough free)' : 'PASSED'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>3. Tentative Safety Check:</span>
                  <span className={`font-bold ${lastRequestResult.status === 'UNSAFE' ? 'text-rose-700' : lastRequestResult.status === 'SAFE' ? 'text-emerald-700' : 'SKIPPED'}`}>
                    {lastRequestResult.status === 'UNSAFE' ? 'UNSAFE (Deny)' : lastRequestResult.status === 'SAFE' ? 'SAFE (Grant)' : 'SKIPPED'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
