import React, { useState, useEffect, useMemo } from 'react';
import {
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
  Plus,
  Minus,
  Calculator,
  X,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { RequestHandlingResult, SafetyResult, SystemState, SystemStatus } from '../engine/types.js';
import { computeNeed, requestResource, safetyCheck } from '../engine/bankers.js';
import { getScenarioA } from '../engine/scenarios.js';
import { validateSetup, ValidationIssue } from '../engine/validation.js';
import { RAGGraphView } from './RAGGraphView.js';
import { buildRAG } from '../engine/detection.js';
import { CheckStatusBadge } from './StatusBadge.js';

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
  // Tracks whether the safety algorithm has been executed for the current matrices
  const [isSafetyEvaluated, setIsSafetyEvaluated] = useState<boolean>(true);
  const [isAnalysisStale, setIsAnalysisStale] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  // Accounting Mode: 'available_direct' (Exam/Direct) vs 'total_instances' (Capacity)
  const [accountingMode, setAccountingMode] = useState<'available_direct' | 'total_instances'>(
    () => systemState.accountingMode || 'available_direct'
  );

  // Step pop-up modal state
  const [stepPopup, setStepPopup] = useState<{
    isOpen: boolean;
    stepNumber: number;
    totalSteps: number;
    processName: string;
    workBefore: number[];
    need: number[];
    allocation: number[];
    workAfter: number[];
    safeSequenceSoFar: string[];
    isFinalStep: boolean;
    isSystemSafe: boolean;
    haltReason?: string;
    stuckProcessNames?: string[];
  } | null>(null);

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
    if (!isSafetyEvaluated || currentStepIndex < 0) {
      return initialWorkVector;
    }
    const currentStep = safetyResult.steps[currentStepIndex];
    return currentStep ? currentStep.workAfter : safetyResult.finalWork;
  }, [isSafetyEvaluated, currentStepIndex, safetyResult, initialWorkVector]);

  // Steps that have been executed one by one so far
  const executedSteps = useMemo(() => {
    if (!isSafetyEvaluated || currentStepIndex < 0) return [];
    return safetyResult.steps.slice(0, currentStepIndex + 1);
  }, [isSafetyEvaluated, currentStepIndex, safetyResult]);

  // Verified safe sequence assembled step-by-step
  const verifiedSequenceSoFar = useMemo(() => {
    return executedSteps.map((s) => s.processName);
  }, [executedSteps]);

  // Executes the safety check on demand when user presses button
  const runSafetyEvaluation = () => {
    const res = safetyCheck(
      systemState.allocation,
      systemState.max,
      systemState.available,
      systemState.need
    );
    setSafetyResult(res);
    setIsSafetyEvaluated(true);
    setIsAnalysisStale(false);
    return res;
  };

  // Step forward: executes exactly ONE process, updates trace, sequence, and opens popup!
  const stepForward = () => {
    let activeRes = safetyResult;
    if (!isSafetyEvaluated || isAnalysisStale) {
      activeRes = runSafetyEvaluation();
    }

    if (activeRes.steps.length === 0) {
      if (onStatusChange) {
        onStatusChange('UNSAFE');
      }
      const stuckNames = activeRes.stuckProcesses ? activeRes.stuckProcesses.map((p) => p.processName) : [];
      setStepPopup({
        isOpen: true,
        stepNumber: 0,
        totalSteps: 0,
        processName: 'None',
        workBefore: systemState.available,
        need: [],
        allocation: [],
        workAfter: systemState.available,
        safeSequenceSoFar: [],
        isFinalStep: true,
        isSystemSafe: false,
        haltReason: 'No process has Need ≤ Available Work. The system is immediately in an UNSAFE state.',
        stuckProcessNames: stuckNames,
      });
      return;
    }

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < activeRes.steps.length) {
      setCurrentStepIndex(nextIndex);
      const step = activeRes.steps[nextIndex];
      const seqSoFar = activeRes.steps.slice(0, nextIndex + 1).map((s) => s.processName);
      const isFinal = nextIndex === activeRes.steps.length - 1;

      if (isFinal && onStatusChange) {
        onStatusChange(activeRes.status);
      }

      const stuckNames = activeRes.stuckProcesses ? activeRes.stuckProcesses.map((p) => p.processName) : [];
      let haltReason = '';
      if (isFinal && !activeRes.isSafe) {
        if (activeRes.stuckProcesses && activeRes.stuckProcesses.length > 0) {
          const stuck = activeRes.stuckProcesses[0];
          const deficitList = stuck.failingResources
            .map((f) => `Resource ${f.resourceName} (Need ${f.needAmount} > Work ${f.workAmount})`)
            .join(', ');
          haltReason = `Process ${stuck.processName} cannot execute because its Need exceeds available Work for ${deficitList}. With no remaining process able to finish, the system halts in an Unsafe state.`;
        } else {
          haltReason = activeRes.explanation || 'Remaining process(es) have Need > Work. No further process can proceed, leaving the system in an Unsafe state.';
        }
      }

      setStepPopup({
        isOpen: true,
        stepNumber: nextIndex + 1,
        totalSteps: activeRes.steps.length,
        processName: step.processName,
        workBefore: step.workBefore,
        need: step.need,
        allocation: step.allocation,
        workAfter: step.workAfter,
        safeSequenceSoFar: seqSoFar,
        isFinalStep: isFinal,
        isSystemSafe: activeRes.isSafe,
        haltReason,
        stuckProcessNames: stuckNames,
      });
    }
  };

  const resetSteps = () => {
    setCurrentStepIndex(-1);
    setStepPopup(null);
  };

  // Handle resource request submission (only evaluates when button is pressed)
  const handleSendRequest = (overrideProcId?: number, overrideVector?: number[]) => {
    const pId = overrideProcId !== undefined ? overrideProcId : selectedProcessId;
    const req = overrideVector || requestInput.map((val) => parseInt(val, 10) || 0);

    const result = requestResource(pId, req, systemState);
    setLastRequestResult(result);

    if (result.status === 'SAFE' && result.granted) {
      onStateChange(result.newState);
      if (result.safetyResult) {
        setSafetyResult(result.safetyResult);
        setIsSafetyEvaluated(true);
        setCurrentStepIndex(-1);
      }
      if (onStatusChange) {
        onStatusChange('SAFE');
      }
    } else {
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
    const colAlloc = newAlloc.reduce((sum, row) => sum + (row[rIdx] || 0), 0);
    const newTotal = systemState.totalInstances
      ? [...systemState.totalInstances]
      : systemState.available.map((a, i) => a + (totalAllocated[i] || 0));

    if (accountingMode === 'total_instances') {
      // In total_instances mode, total is fixed; Available = Total - Allocated
      const tot = newTotal[rIdx] ?? (colAlloc + (systemState.available[rIdx] || 0));
      const newAvail = [...systemState.available];
      newAvail[rIdx] = Math.max(0, tot - colAlloc);
      const updatedState: SystemState = {
        ...systemState,
        allocation: newAlloc,
        max: newMax,
        need: newNeed,
        available: newAvail,
        totalInstances: newTotal,
        accountingMode,
      };
      const valResult = validateSetup(updatedState);
      setValidationErrors(valResult.issues);
      setIsSafetyEvaluated(false);
      setIsAnalysisStale(true);
      setLastRequestResult(null);
      setCurrentStepIndex(-1);
      if (onStatusChange) onStatusChange('ANALYSIS_OUT_OF_DATE');
      onStateChange(updatedState);
      return;
    }

    // In available_direct mode, Available is fixed; Total = Allocated + Available
    if (matrixType === 'allocation') {
      newTotal[rIdx] = colAlloc + (systemState.available[rIdx] || 0);
    }

    const updatedState: SystemState = {
      ...systemState,
      allocation: newAlloc,
      max: newMax,
      need: newNeed,
      totalInstances: newTotal,
      accountingMode,
    };

    const valResult = validateSetup(updatedState);
    setValidationErrors(valResult.issues);
    setIsSafetyEvaluated(false);
    setIsAnalysisStale(true);
    setLastRequestResult(null);
    setCurrentStepIndex(-1);
    if (onStatusChange) onStatusChange('ANALYSIS_OUT_OF_DATE');
    onStateChange(updatedState);
  };

  // Handle available vector edit (Mode 1: Available Directly)
  const handleAvailableCellChange = (rIdx: number, valStr: string) => {
    const val = parseInt(valStr, 10);
    const num = isNaN(val) ? 0 : Math.max(0, val);
    const newAvail = [...systemState.available];
    newAvail[rIdx] = num;

    const colAlloc = systemState.allocation.reduce((sum, row) => sum + (row[rIdx] || 0), 0);
    const newTotal = systemState.totalInstances
      ? [...systemState.totalInstances]
      : systemState.available.map((a, i) => a + (totalAllocated[i] || 0));
    newTotal[rIdx] = num + colAlloc;

    const updatedState: SystemState = {
      ...systemState,
      available: newAvail,
      totalInstances: newTotal,
      accountingMode: 'available_direct',
    };

    const valResult = validateSetup(updatedState);
    setValidationErrors(valResult.issues);
    setIsSafetyEvaluated(false);
    setIsAnalysisStale(true);
    setLastRequestResult(null);
    setCurrentStepIndex(-1);
    if (onStatusChange) onStatusChange('ANALYSIS_OUT_OF_DATE');
    onStateChange(updatedState);
  };

  // Handle total instances edit (Mode 2: Total Instances)
  const handleTotalInstanceCellChange = (rIdx: number, valStr: string) => {
    const val = parseInt(valStr, 10);
    const num = isNaN(val) ? 0 : Math.max(0, val);
    const newTotals = systemState.totalInstances
      ? [...systemState.totalInstances]
      : systemState.available.map((a, i) => a + (totalAllocated[i] || 0));
    newTotals[rIdx] = num;

    const colAlloc = systemState.allocation.reduce((sum, row) => sum + (row[rIdx] || 0), 0);
    const newAvail = [...systemState.available];
    newAvail[rIdx] = Math.max(0, num - colAlloc);

    const updatedState: SystemState = {
      ...systemState,
      available: newAvail,
      totalInstances: newTotals,
      accountingMode: 'total_instances',
    };

    const valResult = validateSetup(updatedState);
    setValidationErrors(valResult.issues);
    setIsSafetyEvaluated(false);
    setIsAnalysisStale(true);
    setLastRequestResult(null);
    setCurrentStepIndex(-1);
    if (onStatusChange) onStatusChange('ANALYSIS_OUT_OF_DATE');
    onStateChange(updatedState);
  };

  // Switch between Mode 1 (Available Directly) and Mode 2 (Total Instances)
  const handleSwitchAccountingMode = (mode: 'available_direct' | 'total_instances') => {
    setAccountingMode(mode);
    const updatedState: SystemState = {
      ...systemState,
      accountingMode: mode,
    };
    const valResult = validateSetup(updatedState);
    setValidationErrors(valResult.issues);
    onStateChange(updatedState);
  };

  // Preset Loaders
  const loadScenario = (type: 'A' | 'B' | 'C') => {
    setLastRequestResult(null);
    setIsEditMode(false);
    setIsAnalysisStale(false);
    resetSteps();

    let targetState = getScenarioA();
    if (type === 'A') {
      targetState = getScenarioA();
      onStateChange(targetState);
    } else if (type === 'B') {
      const base = getScenarioA();
      const res = requestResource(0, [7, 4, 3], base);
      setSelectedProcessId(0);
      setRequestInput(['7', '4', '3']);
      setLastRequestResult(res);
      targetState = res.newState;
      onStateChange(targetState);
    } else if (type === 'C') {
      const base = getScenarioA();
      const res = requestResource(0, [0, 0, 2], base);
      setSelectedProcessId(0);
      setRequestInput(['0', '0', '2']);
      setLastRequestResult(res);
      targetState = res.newState;
      onStateChange(targetState);
    }

    const res = safetyCheck(targetState.allocation, targetState.max, targetState.available, targetState.need);
    setSafetyResult(res);
    setIsSafetyEvaluated(true);
    if (onStatusChange) {
      onStatusChange(res.status);
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

  // Dimension and Total Instance Helper state
  const [showTotalHelper, setShowTotalHelper] = useState(false);
  const [totalInputs, setTotalInputs] = useState<string[]>(() =>
    systemState.resourceNames.map((_, idx) =>
      String(systemState.totalInstances?.[idx] ?? (systemState.available[idx] + (totalAllocated[idx] || 0)))
    )
  );

  // Keep totalInputs vector length synced with resourceCount
  useEffect(() => {
    setTotalInputs((prev) => {
      const arr = [...prev];
      while (arr.length < systemState.resourceCount) {
        const rIdx = arr.length;
        const fallback = (systemState.available[rIdx] || 0) + (totalAllocated[rIdx] || 0);
        arr.push(String(fallback || 10));
      }
      return arr.slice(0, systemState.resourceCount);
    });
  }, [systemState.resourceCount]);

  const handleAddProcess = () => {
    if (systemState.processCount >= 8) return;
    const newCount = systemState.processCount + 1;
    const newProcName = `P${systemState.processCount}`;
    const newAllocRow = Array(systemState.resourceCount).fill(0);
    const newMaxRow = Array(systemState.resourceCount).fill(0);
    const newAlloc = [...systemState.allocation, newAllocRow];
    const newMax = [...systemState.max, newMaxRow];
    const newNeed = computeNeed(newMax, newAlloc);
    const newProcNames = [...systemState.processNames, newProcName];

    const updatedState: SystemState = {
      ...systemState,
      processCount: newCount,
      processNames: newProcNames,
      allocation: newAlloc,
      max: newMax,
      need: newNeed,
      accountingMode,
    };
    const valResult = validateSetup(updatedState);
    setValidationErrors(valResult.issues);
    setIsSafetyEvaluated(false);
    setIsAnalysisStale(true);
    setLastRequestResult(null);
    setCurrentStepIndex(-1);
    if (onStatusChange) onStatusChange('ANALYSIS_OUT_OF_DATE');
    onStateChange(updatedState);
  };

  const handleRemoveProcess = () => {
    if (systemState.processCount <= 2) return;
    const newCount = systemState.processCount - 1;
    const newAlloc = systemState.allocation.slice(0, newCount);
    const newMax = systemState.max.slice(0, newCount);
    const newNeed = computeNeed(newMax, newAlloc);
    const newProcNames = systemState.processNames.slice(0, newCount);

    const updatedState: SystemState = {
      ...systemState,
      processCount: newCount,
      processNames: newProcNames,
      allocation: newAlloc,
      max: newMax,
      need: newNeed,
      accountingMode,
    };
    if (selectedProcessId >= newCount) {
      setSelectedProcessId(0);
    }
    const valResult = validateSetup(updatedState);
    setValidationErrors(valResult.issues);
    setIsSafetyEvaluated(false);
    setIsAnalysisStale(true);
    setLastRequestResult(null);
    setCurrentStepIndex(-1);
    if (onStatusChange) onStatusChange('ANALYSIS_OUT_OF_DATE');
    onStateChange(updatedState);
  };

  const handleAddResource = () => {
    if (systemState.resourceCount >= 6) return;
    const newCount = systemState.resourceCount + 1;
    const nextLetter = String.fromCharCode(65 + systemState.resourceCount);
    const newResNames = [...systemState.resourceNames, nextLetter];
    const newAlloc = systemState.allocation.map((row) => [...row, 0]);
    const newMax = systemState.max.map((row) => [...row, 0]);
    const newAvail = [...systemState.available, 0];
    const newNeed = computeNeed(newMax, newAlloc);
    const newTotal = systemState.totalInstances ? [...systemState.totalInstances, 0] : undefined;

    const updatedState: SystemState = {
      ...systemState,
      resourceCount: newCount,
      resourceNames: newResNames,
      allocation: newAlloc,
      max: newMax,
      need: newNeed,
      available: newAvail,
      totalInstances: newTotal,
      accountingMode,
    };
    const valResult = validateSetup(updatedState);
    setValidationErrors(valResult.issues);
    setIsSafetyEvaluated(false);
    setIsAnalysisStale(true);
    setLastRequestResult(null);
    setCurrentStepIndex(-1);
    if (onStatusChange) onStatusChange('ANALYSIS_OUT_OF_DATE');
    onStateChange(updatedState);
  };

  const handleRemoveResource = () => {
    if (systemState.resourceCount <= 1) return;
    const newCount = systemState.resourceCount - 1;
    const newResNames = systemState.resourceNames.slice(0, newCount);
    const newAlloc = systemState.allocation.map((row) => row.slice(0, newCount));
    const newMax = systemState.max.map((row) => row.slice(0, newCount));
    const newAvail = systemState.available.slice(0, newCount);
    const newNeed = computeNeed(newMax, newAlloc);
    const newTotal = systemState.totalInstances ? systemState.totalInstances.slice(0, newCount) : undefined;

    const updatedState: SystemState = {
      ...systemState,
      resourceCount: newCount,
      resourceNames: newResNames,
      allocation: newAlloc,
      max: newMax,
      need: newNeed,
      available: newAvail,
      totalInstances: newTotal,
      accountingMode,
    };
    const valResult = validateSetup(updatedState);
    setValidationErrors(valResult.issues);
    setIsSafetyEvaluated(false);
    setIsAnalysisStale(true);
    setLastRequestResult(null);
    setCurrentStepIndex(-1);
    if (onStatusChange) onStatusChange('ANALYSIS_OUT_OF_DATE');
    onStateChange(updatedState);
  };

  const applyTotalInstances = () => {
    const parsedTotals = totalInputs.map((val) => Math.max(0, parseInt(val, 10) || 0));
    const newAvail = parsedTotals.map((tot, rIdx) => Math.max(0, tot - (totalAllocated[rIdx] || 0)));
    const updatedState: SystemState = {
      ...systemState,
      available: newAvail,
      totalInstances: parsedTotals,
      accountingMode: 'total_instances',
    };
    const valResult = validateSetup(updatedState);
    setValidationErrors(valResult.issues);
    setIsSafetyEvaluated(false);
    setIsAnalysisStale(true);
    setLastRequestResult(null);
    setCurrentStepIndex(-1);
    if (onStatusChange) onStatusChange('ANALYSIS_OUT_OF_DATE');
    onStateChange(updatedState);
  };

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

      {/* Dedicated Prominent Available Vector Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-sm font-bold text-slate-800">
                Resource Accounting &amp; Available Pool
              </h3>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                Work starts here
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {accountingMode === 'available_direct'
                ? 'Mode 1 (Exam Mode): Enter Available directly. Total instances are implied (Total = Allocated + Available).'
                : 'Mode 2 (Capacity Mode): Enter Total instances. Available pool is calculated (Available = Total - Allocated).'}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="inline-flex rounded-lg p-1 bg-slate-100 border border-slate-200 shrink-0">
            <button
              onClick={() => handleSwitchAccountingMode('available_direct')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                accountingMode === 'available_direct'
                  ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mode 1: Available Directly
            </button>
            <button
              onClick={() => handleSwitchAccountingMode('total_instances')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                accountingMode === 'total_instances'
                  ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mode 2: Total Instances
            </button>
          </div>
        </div>

        {/* Input Controls */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-3 flex-wrap">
          {accountingMode === 'available_direct' ? (
            systemState.resourceNames.map((rName, rIdx) => {
              const avail = systemState.available[rIdx] ?? 0;
              const allocated = totalAllocated[rIdx] ?? 0;
              const total = avail + allocated;

              return (
                <div
                  key={rName}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs shadow-2xs"
                >
                  <span className="font-bold text-emerald-950 font-mono text-sm">{rName}:</span>
                  <input
                    type="number"
                    min={0}
                    value={avail}
                    onChange={(e) => handleAvailableCellChange(rIdx, e.target.value)}
                    className="w-14 h-7 text-center bg-white border border-emerald-300 rounded font-bold text-emerald-950 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    title={`Free available instances of resource ${rName}`}
                  />
                  <span className="text-[10px] text-emerald-700 font-sans">
                    (Alloc: {allocated}, Implied Tot: {total})
                  </span>
                </div>
              );
            })
          ) : (
            systemState.resourceNames.map((rName, rIdx) => {
              const allocated = totalAllocated[rIdx] ?? 0;
              const total = systemState.totalInstances?.[rIdx] ?? (systemState.available[rIdx] + allocated);
              const avail = systemState.available[rIdx] ?? 0;
              const isShort = total < allocated;

              return (
                <div
                  key={rName}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs shadow-2xs ${
                    isShort
                      ? 'bg-rose-50 border-rose-300 text-rose-950'
                      : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  }`}
                >
                  <span className="font-bold font-mono text-sm">{rName}:</span>
                  <input
                    type="number"
                    min={0}
                    value={total}
                    onChange={(e) => handleTotalInstanceCellChange(rIdx, e.target.value)}
                    className={`w-14 h-7 text-center bg-white border rounded font-bold text-sm focus:ring-2 focus:outline-none ${
                      isShort
                        ? 'border-rose-400 text-rose-950 focus:ring-rose-500'
                        : 'border-emerald-300 text-emerald-950 focus:ring-emerald-500'
                    }`}
                    title={`Total instances of resource ${rName}`}
                  />
                  <span className={`text-[10px] font-sans ${isShort ? 'text-rose-700 font-bold' : 'text-emerald-700'}`}>
                    (Alloc: {allocated}, Calc Avail: {avail})
                  </span>
                </div>
              );
            })
          )}
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
              onClick={() => setShowResetConfirm(true)}
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

        {/* Dynamic Dimensions & Helpers Toolbar in Edit Mode */}
        {isEditMode && (
          <div className="p-3 bg-indigo-50/50 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              {/* Process Count */}
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">Processes:</span>
                <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-300 text-slate-800">
                  {systemState.processCount}
                </span>
                <div className="inline-flex rounded-md shadow-2xs">
                  <button
                    onClick={handleRemoveProcess}
                    disabled={systemState.processCount <= 2}
                    className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-l disabled:opacity-40 disabled:cursor-not-allowed font-bold cursor-pointer"
                    title="Remove last process (min 2)"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={handleAddProcess}
                    disabled={systemState.processCount >= 8}
                    className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-l-0 border-slate-300 rounded-r disabled:opacity-40 disabled:cursor-not-allowed font-bold cursor-pointer"
                    title="Add new process (max 8)"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Resource Count */}
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">Resources:</span>
                <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-300 text-slate-800">
                  {systemState.resourceCount} ({systemState.resourceNames.join(', ')})
                </span>
                <div className="inline-flex rounded-md shadow-2xs">
                  <button
                    onClick={handleRemoveResource}
                    disabled={systemState.resourceCount <= 1}
                    className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-l disabled:opacity-40 disabled:cursor-not-allowed font-bold cursor-pointer"
                    title="Remove last resource (min 1)"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={handleAddResource}
                    disabled={systemState.resourceCount >= 6}
                    className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-l-0 border-slate-300 rounded-r disabled:opacity-40 disabled:cursor-not-allowed font-bold cursor-pointer"
                    title="Add new resource (e.g. D, E; max 6)"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Helper: Compute from Total Instances */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTotalHelper(!showTotalHelper)}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 border transition-colors cursor-pointer ${
                  showTotalHelper
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                }`}
                title="If your question gives Total Instances instead of Available, click here to compute Available"
              >
                <Calculator className="w-3.5 h-3.5 text-amber-700" />
                <span>Calculate from Total Instances</span>
              </button>
            </div>
          </div>
        )}

        {/* Total Instances Calculator Sub-Panel */}
        {isEditMode && showTotalHelper && (
          <div className="p-3 bg-amber-50/70 border-b border-amber-200 text-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-amber-950">Enter Total Instances (Total &minus; Allocated = Available):</span>
              <div className="flex items-center gap-2">
                {systemState.resourceNames.map((rName, rIdx) => (
                  <div key={rIdx} className="flex items-center gap-1 font-mono">
                    <span className="font-bold text-amber-900">{rName}:</span>
                    <input
                      type="number"
                      min={0}
                      value={totalInputs[rIdx] ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTotalInputs((prev) => {
                          const next = [...prev];
                          next[rIdx] = val;
                          return next;
                        });
                      }}
                      className="w-12 h-6 text-center bg-white border border-amber-300 rounded text-slate-900 font-bold"
                      placeholder="Tot"
                    />
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={applyTotalInstances}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold cursor-pointer transition-colors shadow-2xs"
            >
              Apply to Available
            </button>
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
                const isStepFinished = isSafetyEvaluated && currentStepIndex >= 0 && safetyResult.steps.slice(0, currentStepIndex + 1).some(s => s.processId === pIdx);
                const isCurrentActiveStep = isSafetyEvaluated && currentStepIndex >= 0 && safetyResult.steps[currentStepIndex]?.processId === pIdx;

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
            {/* Table Footer: Column Totals & Available Pool */}
            <tfoot>
              {/* Row 1: Total Allocated */}
              <tr className="border-t-2 border-slate-200 bg-slate-50 font-mono text-xs">
                <td className="py-2.5 px-4 font-sans font-bold text-slate-700 text-left">
                  Total Allocated
                </td>
                {totalAllocated.map((total, rIdx) => (
                  <td key={`total-alloc-${rIdx}`} className="py-2.5 px-2 text-center border-l border-slate-200 text-blue-900 font-bold bg-blue-50/40">
                    {total}
                  </td>
                ))}
                <td colSpan={systemState.resourceCount * 2 + 1} className="py-2.5 px-4 text-left border-l border-slate-200 text-slate-500 font-sans text-xs">
                  Sum of resources currently held across all processes
                </td>
              </tr>
              {/* Row 2: Available Pool */}
              <tr className="border-t border-slate-200 bg-emerald-50/40 font-mono text-xs">
                <td className="py-3 px-4 font-sans font-bold text-emerald-950 text-left flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  <span>Available Pool</span>
                </td>
                {systemState.available.map((avail, rIdx) => (
                  <td key={`avail-cell-${rIdx}`} className="py-3 px-2 text-center border-l border-emerald-200 font-extrabold text-emerald-950 bg-emerald-100/60 text-sm">
                    {isEditMode ? (
                      <input
                        type="number"
                        min={0}
                        value={avail}
                        onChange={(e) => handleAvailableCellChange(rIdx, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-10 h-6 text-center bg-white border border-emerald-500 rounded text-emerald-950 font-bold shadow-2xs"
                      />
                    ) : (
                      avail
                    )}
                  </td>
                ))}
                <td colSpan={systemState.resourceCount * 2 + 1} className="py-3 px-4 text-left border-l border-emerald-200 font-sans text-xs text-emerald-900">
                  <span className="font-semibold">Work starts at: [{systemState.available.join(', ')}]</span> &bull; Free instances available for execution
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

            {/* Step Controls (No 'Run Full Check') */}
            <div className="flex items-center gap-2">
              <button
                onClick={stepForward}
                disabled={isSafetyEvaluated && currentStepIndex >= 0 && currentStepIndex + 1 >= safetyResult.steps.length}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title="Execute next process in safe sequence and view pop-up"
              >
                <SkipForward className="w-3.5 h-3.5" />
                <span>
                  {currentStepIndex < 0
                    ? 'Start Step 1'
                    : currentStepIndex + 1 < safetyResult.steps.length
                    ? `Next Step (${currentStepIndex + 2})`
                    : 'All Steps Completed'}
                </span>
              </button>

              <button
                onClick={resetSteps}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-300 transition-colors cursor-pointer"
                title="Reset stepper"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Verified Sequence Banner — updates step-by-step as processes execute */}
          {isAnalysisStale || !isSafetyEvaluated ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-amber-600 animate-spin" />
                  <span className="font-bold text-sm text-amber-900">
                    ANALYSIS OUT OF DATE
                  </span>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                  Input State Changed
                </span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                System inputs have been modified since the last check. Previous safe sequence and step trace are cleared.
                Click <strong>&ldquo;Start Step 1&rdquo;</strong> to recalculate safety on the updated matrices.
              </p>
            </div>
          ) : currentStepIndex < 0 ? (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                  <span className="font-bold text-sm text-slate-900">
                    Step-by-Step Execution Ready
                  </span>
                </div>
                <span className="text-xs font-mono text-slate-500">
                  Work = [{initialWorkVector.join(', ')}]
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <span className="text-xs font-semibold text-slate-600">Verified Sequence:</span>
                <span className="font-mono text-xs font-medium text-slate-400 italic">
                  None yet &mdash; Click &ldquo;Start Step 1&rdquo; to execute
                </span>
              </div>
            </div>
          ) : (
            <div
              className={`p-4 rounded-xl border space-y-2 ${
                currentStepIndex + 1 === safetyResult.steps.length
                  ? safetyResult.isSafe
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : 'bg-rose-50 border-rose-200 text-rose-950'
                  : 'bg-indigo-50/70 border-indigo-200 text-indigo-950'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {currentStepIndex + 1 === safetyResult.steps.length && safetyResult.isSafe ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : currentStepIndex + 1 === safetyResult.steps.length && !safetyResult.isSafe ? (
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
                  )}
                  <span className="font-bold text-sm text-slate-900">
                    {currentStepIndex + 1 === safetyResult.steps.length
                      ? safetyResult.isSafe
                        ? 'SYSTEM VERIFIED SAFE (ALL PROCESSES FINISHED)'
                        : 'SYSTEM UNSAFE (HALTED)'
                      : `STEPPING: PROCESS ${safetyResult.steps[currentStepIndex]?.processName} EXECUTED`}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 shadow-2xs">
                  Step {currentStepIndex + 1} of {safetyResult.steps.length}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs font-semibold text-slate-700">Verified Sequence:</span>
                <span className="font-mono text-sm font-bold bg-white px-3 py-1 rounded-lg border border-indigo-200 text-indigo-950 shadow-2xs">
                  &lt; {verifiedSequenceSoFar.join(' → ')} &gt;
                </span>
              </div>

              {currentStepIndex + 1 === safetyResult.steps.length && !safetyResult.isSafe && (
                <div className="mt-2.5 p-3 rounded-lg bg-rose-50 border border-rose-300 text-xs text-rose-950 space-y-1 shadow-2xs">
                  <div className="flex items-center gap-1.5 font-bold text-rose-800">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>
                      Algorithm Halted: System is in an UNSAFE State{' '}
                      {safetyResult.stuckProcesses && safetyResult.stuckProcesses.length > 0
                        ? `(Halted Process: ${safetyResult.stuckProcesses.map((p) => p.processName).join(', ')})`
                        : ''}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-700 leading-relaxed font-sans">
                    <strong>Reason:</strong>{' '}
                    {safetyResult.explanation ||
                      'Remaining process(es) have Need > Work. No further process can proceed, halting the safety algorithm.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Execution Steps Trace Table — rows appear one by one as executed */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 block">
                Execution Steps Trace (Work = Work + Allocation):
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {executedSteps.length} of {safetyResult.steps.length} executed
              </span>
            </div>

            {executedSteps.length === 0 ? (
              <div className="p-4 rounded-lg bg-slate-50 border border-dashed border-slate-300 text-center text-xs text-slate-500">
                Click <strong>&ldquo;Start Step 1&rdquo;</strong> to execute and reveal steps one by one.
              </div>
            ) : (
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
                    {executedSteps.map((step, idx) => {
                      const isLatest = idx === currentStepIndex;

                      return (
                        <tr
                          key={idx}
                          className={`transition-colors ${
                            isLatest
                              ? 'bg-emerald-50/80 font-bold text-emerald-950'
                              : 'bg-white text-slate-700'
                          }`}
                        >
                          <td className="py-2 px-3 font-sans">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 font-sans font-bold text-indigo-900">
                            {step.processName}
                          </td>
                          <td className="py-2 px-3 text-slate-600">
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
            )}
          </div>
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

              {lastRequestResult.outcome === 'GRANTED' ? (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>REQUEST GRANTED</span>
                  </div>
                  <p className="text-xs text-emerald-800">
                    {lastRequestResult.reason}
                  </p>
                </div>
              ) : lastRequestResult.outcome === 'WAITING' ? (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-950 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>WAITING / DEFERRED</span>
                  </div>
                  <p className="text-xs text-amber-800">
                    {lastRequestResult.reason}
                  </p>
                </div>
              ) : lastRequestResult.outcome === 'INVALID_INPUT' ? (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-rose-950 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-rose-900 text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>INVALID INPUT</span>
                  </div>
                  <p className="text-xs text-rose-800">
                    {lastRequestResult.reason}
                  </p>
                </div>
              ) : lastRequestResult.outcome === 'INVALID_REQUEST' ? (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-rose-950 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-rose-900 text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>INVALID REQUEST (EXCEEDS NEED)</span>
                  </div>
                  <p className="text-xs text-rose-800">
                    {lastRequestResult.reason}
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-rose-950 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-rose-900 text-xs">
                    <Undo2 className="w-4 h-4 text-rose-600" />
                    <span>DENIED — UNSAFE (ROLLED BACK)</span>
                  </div>
                  <p className="text-xs text-rose-800">
                    {lastRequestResult.reason}
                  </p>
                </div>
              )}

              {/* 4 Verification Stages Table with Badges */}
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] space-y-2 font-sans">
                <span className="font-bold text-slate-700 block text-[11px]">
                  4 Verification Stages:
                </span>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-600">1. Format &amp; Bounds:</span>
                    <CheckStatusBadge
                      status={lastRequestResult.checks?.format.status || 'NOT_EVALUATED'}
                      customText={
                        lastRequestResult.checks?.format.status === 'FAILED'
                          ? 'FAILED (Negative / Malformed)'
                          : undefined
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-600">2. Request &le; Need:</span>
                    <CheckStatusBadge
                      status={lastRequestResult.checks?.need.status || 'NOT_EVALUATED'}
                      customText={
                        lastRequestResult.checks?.need.status === 'FAILED'
                          ? 'FAILED (Exceeds Need)'
                          : undefined
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-600">3. Request &le; Available:</span>
                    <CheckStatusBadge
                      status={lastRequestResult.checks?.available.status || 'NOT_EVALUATED'}
                      customText={
                        lastRequestResult.checks?.available.status === 'WAITING'
                          ? 'WAITING (Insufficient Free Pool)'
                          : undefined
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-600">4. Tentative Safety Check:</span>
                    <CheckStatusBadge
                      status={lastRequestResult.checks?.safety.status || 'NOT_EVALUATED'}
                      customText={
                        lastRequestResult.checks?.safety.status === 'FAILED'
                          ? 'FAILED (Unsafe State)'
                          : undefined
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Explain This Result Callout Box */}
              {lastRequestResult.explanation && (
                <div className="p-3 rounded-lg bg-indigo-50/70 border border-indigo-200 text-xs text-indigo-950 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-900 text-xs">
                    <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Explain This Result:</span>
                  </div>
                  <p className="text-[11px] text-indigo-950 font-sans leading-relaxed whitespace-pre-line">
                    {lastRequestResult.explanation}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 space-y-3.5">
            <div className="flex items-center gap-2.5 text-amber-600 font-bold text-sm">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <span className="text-slate-900 font-bold text-base">Reset Matrices to Baseline?</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              This will restore the standard 5-process, 3-resource Silberschatz textbook scenario (Scenario A). All custom matrix edits and request simulation results will be reset.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowResetConfirm(false);
                  loadScenario('A');
                }}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step Execution Pop-up Modal */}
      {stepPopup && stepPopup.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl ${
                    stepPopup.isFinalStep && stepPopup.isSystemSafe
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-indigo-100 text-indigo-800'
                  }`}
                >
                  {stepPopup.isFinalStep && stepPopup.isSystemSafe ? (
                    <Sparkles className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
                      Step {stepPopup.stepNumber} of {stepPopup.totalSteps}
                    </span>
                    {stepPopup.isFinalStep && (
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          stepPopup.isSystemSafe
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {stepPopup.isSystemSafe ? 'Final Step — Safe' : 'Halted — Unsafe'}
                      </span>
                    )}
                  </div>
                  <h4 className="text-base font-bold text-slate-900 mt-1">
                    Process {stepPopup.processName} Executed
                  </h4>
                </div>
              </div>

              <button
                onClick={() => setStepPopup(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close pop-up"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: The 3 Core Formula Steps */}
            <div className="space-y-3 text-xs">
              {/* Check Condition */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-slate-700 block">
                  1. Condition Verified: Need &le; Work
                </span>
                <p className="font-mono text-slate-800">
                  {stepPopup.processName} Need [{stepPopup.need.join(', ')}] &le; Work [{stepPopup.workBefore.join(', ')}]
                </p>
                <p className="text-[11px] text-emerald-700 font-sans font-semibold">
                  ✓ Resources are available. Process runs and finishes execution.
                </p>
              </div>

              {/* Resource Release */}
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 space-y-1">
                <span className="font-bold text-blue-950 block">
                  2. Resources Released Back to Pool:
                </span>
                <p className="font-mono text-blue-900">
                  Work = Work + Allocation = [{stepPopup.workBefore.join(', ')}] + [{stepPopup.allocation.join(', ')}]
                </p>
                <p className="font-mono font-bold text-emerald-800 text-xs">
                  &rarr; New Work Available = [{stepPopup.workAfter.join(', ')}]
                </p>
              </div>

              {/* Verified Sequence So Far */}
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
                <span className="font-bold text-emerald-950 block">
                  3. Verified Safe Sequence So Far:
                </span>
                <div className="font-mono font-bold text-sm bg-white px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-900 shadow-2xs">
                  &lt; {stepPopup.safeSequenceSoFar.join(' → ')} &gt;
                </div>
              </div>

              {stepPopup.isFinalStep && stepPopup.isSystemSafe && (
                <div className="p-3 rounded-xl bg-emerald-100/60 border border-emerald-300 text-emerald-950 text-xs font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>All processes safely executed. The system is verified deadlock-free!</span>
                </div>
              )}

              {stepPopup.isFinalStep && !stepPopup.isSystemSafe && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-950 text-xs space-y-1.5 shadow-2xs">
                  <div className="flex items-center gap-2 font-bold text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      State: Halted in UNSAFE State{' '}
                      {stepPopup.stuckProcessNames && stepPopup.stuckProcessNames.length > 0
                        ? `(Halted Process: ${stepPopup.stuckProcessNames.join(', ')})`
                        : ''}
                    </span>
                  </div>
                  <p className="text-slate-700 leading-relaxed font-sans">
                    <strong>Reason:</strong>{' '}
                    {stepPopup.haltReason ||
                      'Remaining process(es) have Need > Work. No further process can proceed, leaving the system in an Unsafe state.'}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setStepPopup(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                Close
              </button>

              {!stepPopup.isFinalStep && (
                <button
                  onClick={() => {
                    stepForward();
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <span>Next Process</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
