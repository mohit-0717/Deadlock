import React, { useState, useMemo, useEffect } from 'react';
import {
  Lock,
  Skull,
  RotateCcw,
  CheckCircle2,
  GitBranch,
  AlertTriangle,
  Edit3,
  Zap,
} from 'lucide-react';
import {
  DetectionResult,
  DetectionStep,
  RAGGraph,
  SystemState,
  SystemStatus,
} from '../engine/types.js';
import {
  buildRAG,
  detectDeadlockMultiInstance,
  detectDeadlockSingleInstance,
  terminateProcessAndRecover,
} from '../engine/detection.js';
import {
  getScenarioD1,
  getScenarioD2,
  getScenarioD2Variant,
  getScenarioD3,
} from '../engine/scenarios.js';
import { StatusBadge } from './StatusBadge.js';
import { RAGGraphView } from './RAGGraphView.js';

export interface DetectionContextData {
  scenarioPreset: ExamplePreset;
  scenarioName: string;
  method: string;
  available: number[];
  work: number[];
  deadlockedNames: string[];
  hasDeadlock: boolean;
}

interface DetectionTabProps {
  speed?: number;
  reduceMotion?: boolean;
  onStatusChange?: (status: SystemStatus) => void;
  onDetectionContextChange?: (ctx: DetectionContextData) => void;
  systemState?: SystemState;
}

type ExamplePreset = 'BANKER' | 'D1' | 'D2' | 'D2_VARIANT' | 'D3' | 'CUSTOM';

export const DetectionTab: React.FC<DetectionTabProps> = ({
  speed = 1.0,
  onStatusChange,
  onDetectionContextChange,
  systemState,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<ExamplePreset>('D2');
  const [isEditMode, setIsEditMode] = useState(false);

  const [allocation, setAllocation] = useState<number[][]>(() => getScenarioD2().allocation);
  const [request, setRequest] = useState<number[][]>(() => getScenarioD2().request);
  const [available, setAvailable] = useState<number[]>(() => getScenarioD2().available);
  const [totalInstances, setTotalInstances] = useState<number[]>(() => getScenarioD2().totalInstances);
  const [processNames, setProcessNames] = useState<string[]>(() => getScenarioD2().processNames);
  const [resourceNames, setResourceNames] = useState<string[]>(() => getScenarioD2().resourceNames);

  const [terminatedProcessId, setTerminatedProcessId] = useState<number | null>(null);
  const [isTerminatingAnimation, setIsTerminatingAnimation] = useState(false);
  const [recoveryOutcome, setRecoveryOutcome] = useState<{
    procName: string;
    releasedStr: string;
    newAvailable: number[];
    isResolved: boolean;
    remainingBlocked: string[];
    resolvedOrder: string[];
  } | null>(null);

  const isSingleInstance = selectedPreset === 'D1';

  const detectionResult: DetectionResult = useMemo(() => {
    if (isSingleInstance) {
      return detectDeadlockSingleInstance(allocation, request, available, processNames, resourceNames);
    }
    return detectDeadlockMultiInstance(allocation, request, available, processNames, resourceNames);
  }, [allocation, request, available, isSingleInstance, processNames, resourceNames]);

  useEffect(() => {
    if (onStatusChange) {
      onStatusChange(detectionResult.status);
    }
  }, [detectionResult, onStatusChange]);

  const ragGraph: RAGGraph = useMemo(() => {
    return buildRAG(
      allocation,
      request,
      available,
      totalInstances,
      processNames,
      resourceNames
    );
  }, [allocation, request, available, totalInstances, processNames, resourceNames]);

  const reductionDeficits = useMemo(() => {
    if (!detectionResult.hasDeadlock || isSingleInstance) return null;
    const finalWork = detectionResult.finalWork;
    const blockedList: {
      processId: number;
      processName: string;
      request: number[];
      deficits: string[];
    }[] = [];

    detectionResult.finishArray.forEach((fin, pIdx) => {
      if (!fin) {
        const pName = processNames[pIdx] || `P${pIdx}`;
        const reqRow = request[pIdx] || [];
        const deficits: string[] = [];

        reqRow.forEach((needed, rIdx) => {
          const availNow = finalWork[rIdx] ?? 0;
          if (needed > availNow) {
            const rName = resourceNames[rIdx] || String.fromCharCode(65 + rIdx);
            deficits.push(`${rName}: needs ${needed}, Work has ${availNow} (def: ${needed - availNow})`);
          }
        });

        blockedList.push({
          processId: pIdx,
          processName: pName,
          request: reqRow,
          deficits,
        });
      }
    });

    return { finalWork, blockedList };
  }, [detectionResult, isSingleInstance, processNames, request, resourceNames]);

  const syncFromBankers = () => {
    if (!systemState) return;
    setAllocation(systemState.allocation.map((row) => [...row]));
    setRequest(systemState.need.map((row) => [...row]));
    setAvailable([...systemState.available]);
    setTotalInstances(
      systemState.totalInstances
        ? [...systemState.totalInstances]
        : systemState.available.map(
            (avail, rIdx) => avail + systemState.allocation.reduce((sum, row) => sum + row[rIdx], 0)
          )
    );
    setProcessNames([...systemState.processNames]);
    setResourceNames([...systemState.resourceNames]);
    setTerminatedProcessId(null);
    setRecoveryOutcome(null);
  };

  useEffect(() => {
    if (selectedPreset === 'BANKER' && systemState) {
      setAllocation(systemState.allocation.map((row) => [...row]));
      setRequest(systemState.need.map((row) => [...row]));
      setAvailable([...systemState.available]);
      setTotalInstances(
        systemState.totalInstances
          ? [...systemState.totalInstances]
          : systemState.available.map(
              (avail, rIdx) => avail + systemState.allocation.reduce((sum, row) => sum + row[rIdx], 0)
            )
      );
      setProcessNames([...systemState.processNames]);
      setResourceNames([...systemState.resourceNames]);
    }
  }, [systemState, selectedPreset]);

  const handleAllocationCellChange = (pIdx: number, rIdx: number, valStr: string) => {
    const val = parseInt(valStr, 10);
    const num = isNaN(val) ? 0 : Math.max(0, val);
    const next = allocation.map((row) => [...row]);
    next[pIdx][rIdx] = num;
    setAllocation(next);
    setSelectedPreset('CUSTOM');
    setTerminatedProcessId(null);
    setRecoveryOutcome(null);
  };

  const handleRequestCellChange = (pIdx: number, rIdx: number, valStr: string) => {
    const val = parseInt(valStr, 10);
    const num = isNaN(val) ? 0 : Math.max(0, val);
    const next = request.map((row) => [...row]);
    next[pIdx][rIdx] = num;
    setRequest(next);
    setSelectedPreset('CUSTOM');
    setTerminatedProcessId(null);
    setRecoveryOutcome(null);
  };

  const handleAvailableCellChange = (rIdx: number, valStr: string) => {
    const val = parseInt(valStr, 10);
    const num = isNaN(val) ? 0 : Math.max(0, val);
    const next = [...available];
    next[rIdx] = num;
    setAvailable(next);
    setSelectedPreset('CUSTOM');
    setTerminatedProcessId(null);
    setRecoveryOutcome(null);
  };

  const loadPreset = (preset: ExamplePreset) => {
    setSelectedPreset(preset);
    setTerminatedProcessId(null);
    setRecoveryOutcome(null);
    setIsEditMode(false);

    if (preset === 'BANKER') {
      syncFromBankers();
      return;
    }

    let data;
    switch (preset) {
      case 'D1':
        data = getScenarioD1();
        break;
      case 'D2':
        data = getScenarioD2();
        break;
      case 'D2_VARIANT':
        data = getScenarioD2Variant();
        break;
      case 'D3':
        data = getScenarioD3();
        break;
    }

    if (data) {
      setAllocation(data.allocation);
      setRequest(data.request);
      setAvailable(data.available);
      setTotalInstances(data.totalInstances);
      setProcessNames(data.processNames);
      setResourceNames(data.resourceNames);
    }
  };

  const handleTerminate = (procId: number) => {
    setIsTerminatingAnimation(true);
    setTerminatedProcessId(procId);

    setTimeout(() => {
      const recovery = terminateProcessAndRecover(
        procId,
        allocation,
        request,
        available,
        isSingleInstance,
        processNames,
        resourceNames
      );

      setAllocation(recovery.newAllocation);
      setRequest(recovery.newRequest);
      setAvailable(recovery.newAvailable);

      const pName = processNames[procId] || `P${procId}`;
      const relStr = recovery.releasedResources.join(', ');

      const isResolved = !recovery.detectionResult.hasDeadlock;
      const remainingBlocked = recovery.detectionResult.deadlockedProcessNames;
      const resolvedOrder = recovery.detectionResult.resolvedProcessIds.map((id) => processNames[id]);

      setRecoveryOutcome({
        procName: pName,
        releasedStr: relStr,
        newAvailable: recovery.newAvailable,
        isResolved,
        remainingBlocked,
        resolvedOrder,
      });

      setIsTerminatingAnimation(false);
    }, 500 / speed);
  };

  const isRecovered = terminatedProcessId !== null;
  const isD3 = selectedPreset === 'D3' || (!isSingleInstance && ragGraph.cycles.length > 0 && !detectionResult.hasDeadlock);

  let bannerTitle = '';
  let bannerExplanation = '';

  if (isRecovered) {
    if (!detectionResult.hasDeadlock) {
      bannerTitle = 'Deadlock Resolved via Recovery';
      const safeSeqStr = recoveryOutcome?.resolvedOrder.length
        ? recoveryOutcome.resolvedOrder.join(' → ')
        : detectionResult.resolvedProcessIds.map((id) => processNames[id]).join(' → ');
      bannerExplanation = `Deadlock resolved. ${recoveryOutcome?.procName || 'Victim process'} was terminated and released resources [${recoveryOutcome?.releasedStr || ''}]. All remaining processes can finish in the verified sequence: <${safeSeqStr}>.`;
    } else {
      bannerTitle = 'Partial Recovery (Deadlock Persists)';
      bannerExplanation = `Process ${recoveryOutcome?.procName || 'Victim'} was terminated and released [${recoveryOutcome?.releasedStr || ''}], but remaining processes {${detectionResult.deadlockedProcessNames.join(', ')}} are still deadlocked.`;
    }
  } else if (detectionResult.hasDeadlock) {
    bannerTitle = `Deadlock Detected among {${detectionResult.deadlockedProcessNames.join(', ')}}`;
    bannerExplanation = detectionResult.explanation;
  } else if (isD3) {
    const cycleStr = ragGraph.cycles.length > 0
      ? ragGraph.cycles.map((c) => c.join(' → ') + ' → ' + c[0]).join(', ')
      : 'detected';
    bannerTitle = 'No Deadlock Detected (Cycle ≠ Deadlock in Multi-Instance Model)';
    const seqStr = detectionResult.resolvedProcessIds.map((id) => processNames[id]).join(' → ');
    bannerExplanation = `A directed cycle exists in the Resource Allocation Graph (${cycleStr}), but the system is NOT deadlocked! In multi-instance systems, a cycle is a necessary condition for deadlock, but NOT a sufficient condition. Process P3 holds resources with 0 pending request; releasing its allocation allows all processes to finish in sequence: <${seqStr}>.`;
  } else {
    bannerTitle = 'Zero Deadlocks in System (All Processes Can Terminate)';
    bannerExplanation = detectionResult.explanation;
  }

  return (
    <div className="space-y-6">
      {/* 1. Academic Header & Scenario Selection */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                Resource Allocation Graph (Deadlock Detection)
              </h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {isSingleInstance ? 'Single-Instance Cycle' : 'Multi-Instance Reduction'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl">
              Unlike avoidance, detection algorithms check whether existing processes are currently deadlocked.
              In single-instance systems, a cycle in the RAG guarantees deadlock. In multi-instance systems, matrix reduction determines if processes can safely terminate.
            </p>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {systemState && (
              <button
                onClick={() => {
                  setSelectedPreset('BANKER');
                  syncFromBankers();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                  selectedPreset === 'BANKER'
                    ? 'bg-amber-500 text-white border-amber-600 font-bold shadow-xs'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                }`}
                title="Synchronize live matrices from Banker's Avoidance (Tab 1)"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Live Banker&apos;s Inputs (Tab 1)</span>
              </button>
            )}
            <button
              onClick={() => loadPreset('D1')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                selectedPreset === 'D1'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-300 font-bold'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              1. Single-Instance Cycle
            </button>
            <button
              onClick={() => loadPreset('D2')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                selectedPreset === 'D2'
                  ? 'bg-rose-50 text-rose-700 border-rose-300 font-bold'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              2. Multi-Instance Deadlock
            </button>
            <button
              onClick={() => loadPreset('D2_VARIANT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                selectedPreset === 'D2_VARIANT'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              3. Safe Variant
            </button>
            <button
              onClick={() => loadPreset('D3')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                selectedPreset === 'D3'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-300 font-bold'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              4. Cycle &ne; Deadlock
            </button>
          </div>
        </div>
      </div>

      {/* 2. Detection Outcome Banner */}
      <div
        className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-2xs ${
          detectionResult.hasDeadlock
            ? 'bg-rose-50 border-rose-200 text-rose-950'
            : isRecovered
            ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
            : 'bg-emerald-50 border-emerald-200 text-emerald-950'
        }`}
      >
        <div className="flex items-center gap-3">
          <StatusBadge status={detectionResult.status} size="sm" />
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              {bannerTitle}
            </h4>
            <p className="text-xs text-slate-700 mt-0.5">
              {bannerExplanation}
            </p>
          </div>
        </div>

        {detectionResult.hasDeadlock && (
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-rose-200 text-xs font-mono font-bold text-rose-800 shadow-2xs">
            <Lock className="w-4 h-4 text-rose-600" />
            <span>Deadlocked: &#123;{detectionResult.deadlockedProcessNames.join(', ')}&#125;</span>
          </div>
        )}
      </div>

      {/* 3. Graph View + Matrix Reduction Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Resource Allocation Graph (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-indigo-600" />
              <h4 className="text-sm font-bold text-slate-800">
                Resource Allocation Graph (RAG)
              </h4>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Circles = Processes &bull; Rectangles = Resources
            </span>
          </div>

          <div className="p-4">
            <RAGGraphView
              graph={ragGraph}
              hasDeadlock={detectionResult.hasDeadlock}
              deadlockedProcessNames={detectionResult.deadlockedProcessNames}
              terminatedProcessId={terminatedProcessId}
              isSingleInstance={isSingleInstance}
            />
          </div>
        </div>

        {/* Right: Matrices, Trace, and Recovery (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Allocation & Request Matrices */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-800">
                  Allocation &amp; Request Matrices
                </span>
                {selectedPreset === 'CUSTOM' && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    Custom Inputs
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditMode(!isEditMode)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 border transition-colors cursor-pointer ${
                    isEditMode
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  <Edit3 className="w-3 h-3" />
                  <span>{isEditMode ? 'Done' : 'Edit Matrices'}</span>
                </button>
              </div>
            </div>

            <div className="p-3 overflow-x-auto">
              <table className="w-full text-xs text-center border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-700 font-mono text-xs bg-slate-50">
                    <th className="py-2 px-3 text-left font-sans font-bold">Process</th>
                    <th className="py-2 px-3 text-blue-900 font-bold">Allocation</th>
                    <th className="py-2 px-3 text-amber-900 font-bold">Request</th>
                    <th className="py-2 px-3 text-slate-800 font-bold">Finish</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  {processNames.map((pName, i) => {
                    const isDead = detectionResult.deadlockedProcessNames.includes(pName);
                    const isTerm = terminatedProcessId === i;
                    const fin = detectionResult.finishArray[i];

                    return (
                      <tr
                        key={i}
                        className={`transition-colors ${
                          isTerm
                            ? 'opacity-40 line-through bg-slate-100'
                            : isDead
                            ? 'bg-rose-50 text-rose-900 font-semibold'
                            : fin
                            ? 'bg-emerald-50/50 text-emerald-950'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-2 px-3 text-left font-bold text-slate-900">
                          {pName}
                        </td>
                        <td className="py-2 px-3 text-blue-900 font-bold">
                          {isEditMode ? (
                            <div className="flex items-center justify-center gap-1">
                              {allocation[i].map((val, rIdx) => (
                                <input
                                  key={rIdx}
                                  type="number"
                                  min={0}
                                  value={val}
                                  onChange={(e) => handleAllocationCellChange(i, rIdx, e.target.value)}
                                  className="w-8 h-6 text-center bg-white border border-slate-300 rounded text-blue-900 font-bold text-xs"
                                  title={`${pName} holding ${resourceNames[rIdx] || rIdx}`}
                                />
                              ))}
                            </div>
                          ) : (
                            `[${allocation[i].join(', ')}]`
                          )}
                        </td>
                        <td className="py-2 px-3 text-amber-900 font-bold">
                          {isEditMode ? (
                            <div className="flex items-center justify-center gap-1">
                              {request[i].map((val, rIdx) => (
                                <input
                                  key={rIdx}
                                  type="number"
                                  min={0}
                                  value={val}
                                  onChange={(e) => handleRequestCellChange(i, rIdx, e.target.value)}
                                  className="w-8 h-6 text-center bg-white border border-slate-300 rounded text-amber-900 font-bold text-xs"
                                  title={`${pName} requesting ${resourceNames[rIdx] || rIdx}`}
                                />
                              ))}
                            </div>
                          ) : (
                            `[${request[i].join(', ')}]`
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-bold ${
                              fin
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : 'bg-rose-100 text-rose-900 border border-rose-300'
                            }`}
                          >
                            {fin ? 'TRUE' : 'FALSE'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50 font-mono text-xs">
                    <td className="py-2.5 px-3 text-left font-sans font-bold text-slate-800">Available</td>
                    <td colSpan={2} className="py-2.5 px-3 text-center">
                      {isEditMode ? (
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-sans text-slate-500 mr-1">Work:</span>
                          {available.map((val, rIdx) => (
                            <div key={rIdx} className="flex items-center gap-0.5">
                              <span className="text-[10px] text-slate-400 font-mono">{resourceNames[rIdx] || rIdx}:</span>
                              <input
                                type="number"
                                min={0}
                                value={val}
                                onChange={(e) => handleAvailableCellChange(rIdx, e.target.value)}
                                className="w-8 h-6 text-center bg-white border border-emerald-400 rounded text-emerald-950 font-bold text-xs"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200">
                          Work / Available: [{available.join(', ')}]
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 text-[11px] font-sans">
                      Free pool
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Matrix Reduction Trace */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h5 className="text-sm font-bold text-slate-800">
                Reduction Steps
              </h5>
              <span className="text-xs text-slate-500 font-mono">
                Work starts at [{available.join(', ')}]
              </span>
            </div>

            <div className="p-4 space-y-3">
              {detectionResult.steps.length > 0 ? (
                <div className="space-y-2">
                  {detectionResult.steps.map((st) => (
                    <div
                      key={st.stepIndex}
                      className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-mono text-emerald-950 space-y-1"
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span>Step {st.stepIndex}: {st.processName} Request &le; Work</span>
                        <span className="text-xs bg-white px-2 py-0.5 rounded border border-emerald-300 text-emerald-950">
                          Work &rarr; [{st.workAfter.join(', ')}]
                        </span>
                      </div>
                      <p className="text-xs text-emerald-800 font-sans">
                        {st.processName} can finish and release its allocation [{st.allocation.join(', ')}].
                      </p>
                    </div>
                  ))}
                  {!detectionResult.hasDeadlock && detectionResult.resolvedProcessIds.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-emerald-100/60 border border-emerald-300 flex items-center justify-between text-xs font-sans">
                      <span className="font-bold text-emerald-950">
                        {isRecovered ? 'Verified Remaining Sequence:' : 'Complete Reduction Sequence:'}
                      </span>
                      <span className="font-mono font-bold text-emerald-900 bg-white px-2 py-0.5 rounded border border-emerald-300">
                        &lt; {detectionResult.resolvedProcessIds.map((id) => processNames[id]).join(' → ')} &gt;
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic font-sans">
                  {detectionResult.hasDeadlock
                    ? 'No process has a Request ≤ Available. Work cannot grow; algorithm halted.'
                    : 'All processes hold zero allocation or have completed execution.'}
                </p>
              )}

              {/* Deadlock Explanation if applicable */}
              {detectionResult.hasDeadlock && reductionDeficits && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs space-y-2 font-sans">
                  <div className="flex items-center gap-1.5 font-bold text-rose-950">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Algorithm Halted: Deadlock Confirmed</span>
                  </div>
                  <p className="text-xs text-rose-800 leading-normal">
                    Remaining processes have requests exceeding available resources:
                  </p>
                  <div className="space-y-1 font-mono text-xs">
                    {reductionDeficits.blockedList.map((bp) => (
                      <div key={bp.processId} className="p-1.5 rounded bg-white border border-rose-200 text-slate-800">
                        <span className="font-bold text-rose-900">{bp.processName}:</span> {bp.deficits.join('; ')}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recovery: Terminate Victim Process */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skull className="w-4 h-4 text-rose-600" />
                <h4 className="text-sm font-bold text-slate-800">
                  Deadlock Recovery: Terminate Process
                </h4>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-xs text-slate-600">
                To break the deadlock, select a deadlocked process to terminate and reclaim its allocated resources:
              </p>

              <div className="flex flex-wrap items-center gap-2">
                {processNames.map((pName, idx) => {
                  const isFinished = detectionResult.finishArray[idx] === true;
                  const isDeadlocked = detectionResult.deadlockedProcessNames.includes(pName);
                  const isTerminated = terminatedProcessId === idx;
                  const allocStr = allocation[idx].join(',');

                  if (isFinished && !isTerminated) {
                    return null;
                  }

                  return (
                    <button
                      key={pName}
                      onClick={() => handleTerminate(idx)}
                      disabled={isTerminated || !isDeadlocked || isTerminatingAnimation}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                        isTerminated
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through'
                          : isDeadlocked
                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-900 border-rose-300'
                          : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                      }`}
                      title={isDeadlocked ? `Terminate ${pName} to reclaim Allocation [${allocStr}]` : undefined}
                    >
                      <Skull className="w-3.5 h-3.5 text-rose-600" />
                      <span>Terminate {pName} (+[{allocStr}])</span>
                    </button>
                  );
                })}

                {terminatedProcessId !== null && (
                  <button
                    onClick={() => loadPreset(selectedPreset)}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Scenario</span>
                  </button>
                )}
              </div>

              {recoveryOutcome && (
                <div
                  className={`p-3.5 rounded-lg border text-xs space-y-2 font-sans ${
                    recoveryOutcome.isResolved
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : 'bg-amber-50 border-amber-300 text-amber-950'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {recoveryOutcome.isResolved ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Deadlock Resolved via Recovery!</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          <span>Partial Recovery (Deadlock Persists)</span>
                        </>
                      )}
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                      Terminated: {recoveryOutcome.procName}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <p>
                      Terminated <strong>{recoveryOutcome.procName}</strong> and reclaimed resources: <span className="font-mono font-bold">[{recoveryOutcome.releasedStr}]</span>.
                    </p>
                    <p>
                      Updated Available / Work pool: <span className="font-mono font-bold text-emerald-800">[{recoveryOutcome.newAvailable.join(', ')}]</span>.
                    </p>
                    {recoveryOutcome.resolvedOrder.length > 0 && (
                      <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-700">Remaining Process Sequence:</span>
                        <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-emerald-300 text-emerald-950">
                          &lt; {recoveryOutcome.resolvedOrder.join(' → ')} &gt;
                        </span>
                      </div>
                    )}
                    {recoveryOutcome.remainingBlocked.length > 0 && (
                      <p className="text-rose-800 font-semibold pt-1">
                        Remaining deadlocked processes: &#123;{recoveryOutcome.remainingBlocked.join(', ')}&#125;
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
