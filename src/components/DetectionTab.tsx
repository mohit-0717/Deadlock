import React, { useState, useMemo, useEffect } from 'react';
import {
  Lock,
  Unlock,
  AlertTriangle,
  Skull,
  Play,
  RotateCcw,
  CheckCircle2,
  GitBranch,
  ShieldAlert,
  Info,
  ArrowRight,
  Radio,
  Layers,
  Cpu,
} from 'lucide-react';
import {
  DetectionResult,
  DetectionStep,
  RAGGraph,
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
  speed: number;
  reduceMotion: boolean;
  onStatusChange?: (status: SystemStatus) => void;
  onDetectionContextChange?: (ctx: DetectionContextData) => void;
}

type ExamplePreset = 'D1' | 'D2' | 'D2_VARIANT' | 'D3';

export const DetectionTab: React.FC<DetectionTabProps> = ({
  speed,
  reduceMotion,
  onStatusChange,
  onDetectionContextChange,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<ExamplePreset>('D2');

  // Working state for detection
  const [allocation, setAllocation] = useState<number[][]>(() => getScenarioD2().allocation);
  const [request, setRequest] = useState<number[][]>(() => getScenarioD2().request);
  const [available, setAvailable] = useState<number[]>(() => getScenarioD2().available);
  const [totalInstances, setTotalInstances] = useState<number[] | undefined>(() => getScenarioD2().totalInstances);
  const [processNames, setProcessNames] = useState<string[]>(() => getScenarioD2().processNames);
  const [resourceNames, setResourceNames] = useState<string[]>(() => getScenarioD2().resourceNames);

  // Recovery state
  const [terminatedProcessId, setTerminatedProcessId] = useState<number | null>(null);
  const [recoveryOutcome, setRecoveryOutcome] = useState<{
    procName: string;
    releasedStr: string;
    newAvailable: number[];
    isResolved: boolean;
    remainingBlocked: string[];
    resolvedOrder?: string[];
  } | null>(null);
  const [isTerminatingAnimation, setIsTerminatingAnimation] = useState(false);

  const isSingleInstance = selectedPreset === 'D1';

  // Compute detection result
  const detectionResult: DetectionResult = useMemo(() => {
    if (isSingleInstance) {
      return detectDeadlockSingleInstance(allocation, request, available, processNames, resourceNames);
    } else {
      return detectDeadlockMultiInstance(allocation, request, available, processNames, resourceNames);
    }
  }, [allocation, request, available, processNames, resourceNames, isSingleInstance]);

  // Compute RAG Graph
  const ragGraph: RAGGraph = useMemo(() => {
    return buildRAG(allocation, request, available, totalInstances, processNames, resourceNames);
  }, [allocation, request, available, totalInstances, processNames, resourceNames]);

  // Sync status
  useEffect(() => {
    if (onStatusChange) {
      onStatusChange(detectionResult.status);
    }
  }, [detectionResult, onStatusChange]);

  // Sync active module context with Executive Command Strip in App.tsx (Requirement 1)
  useEffect(() => {
    if (onDetectionContextChange) {
      const scenarioTitles: Record<ExamplePreset, { name: string; method: string }> = {
        D1: { name: 'D1: Single-Instance Cycle', method: 'Wait-For Graph (Cycle ⇔ Deadlock)' },
        D2: { name: 'D2: Multi-Instance Deadlock', method: 'Matrix Reduction (O(m·n²))' },
        D2_VARIANT: { name: 'D2 Variant (P2 Request [0,0,0])', method: 'Matrix Reduction (O(m·n²))' },
        D3: { name: 'D3: Multi-Instance (Cycle ≠ Deadlock)', method: 'Matrix Reduction (O(m·n²))' },
      };

      onDetectionContextChange({
        scenarioPreset: selectedPreset,
        scenarioName: scenarioTitles[selectedPreset].name,
        method: scenarioTitles[selectedPreset].method,
        available,
        work: detectionResult.finalWork,
        deadlockedNames: detectionResult.deadlockedProcessNames,
        hasDeadlock: detectionResult.hasDeadlock,
      });
    }
  }, [selectedPreset, available, detectionResult, onDetectionContextChange]);

  // Dynamic explanation of matrix reduction halt & process deficits (Requirement 3)
  const reductionDeficits = useMemo(() => {
    if (!detectionResult.hasDeadlock) return null;
    const finalWork = detectionResult.finalWork;
    const blockedList: {
      processName: string;
      processId: number;
      request: number[];
      deficits: string[];
    }[] = [];

    detectionResult.deadlockedProcessIds.forEach((pId) => {
      const pReq = request[pId];
      const deficits: string[] = [];
      pReq.forEach((amt, rIdx) => {
        if (amt > finalWork[rIdx]) {
          const rName = resourceNames[rIdx] || String.fromCharCode(65 + rIdx);
          deficits.push(`${rName}: Req ${amt} > Work ${finalWork[rIdx]} (+${amt - finalWork[rIdx]} deficit)`);
        }
      });
      blockedList.push({
        processName: processNames[pId],
        processId: pId,
        request: pReq,
        deficits,
      });
    });

    return {
      finalWork,
      blockedList,
    };
  }, [detectionResult, request, resourceNames, processNames]);

  // Switch presets
  const loadPreset = (preset: ExamplePreset) => {
    setSelectedPreset(preset);
    setTerminatedProcessId(null);
    setRecoveryOutcome(null);
    setIsTerminatingAnimation(false);

    if (preset === 'D1') {
      const data = getScenarioD1();
      setAllocation(data.allocation);
      setRequest(data.request);
      setAvailable(data.available);
      setTotalInstances(data.totalInstances);
      setProcessNames(data.processNames);
      setResourceNames(data.resourceNames);
    } else if (preset === 'D2') {
      const data = getScenarioD2();
      setAllocation(data.allocation);
      setRequest(data.request);
      setAvailable(data.available);
      setTotalInstances(data.totalInstances);
      setProcessNames(data.processNames);
      setResourceNames(data.resourceNames);
    } else if (preset === 'D2_VARIANT') {
      const data = getScenarioD2Variant();
      setAllocation(data.allocation);
      setRequest(data.request);
      setAvailable(data.available);
      setTotalInstances(data.totalInstances);
      setProcessNames(data.processNames);
      setResourceNames(data.resourceNames);
    } else if (preset === 'D3') {
      const data = getScenarioD3();
      setAllocation(data.allocation);
      setRequest(data.request);
      setAvailable(data.available);
      setTotalInstances(data.totalInstances);
      setProcessNames(data.processNames);
      setResourceNames(data.resourceNames);
    }
  };

  // Perform process termination & recovery (Requirement 4)
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
      const relStr = recovery.releasedResources
        .map((amt, idx) => `${resourceNames[idx] || idx}=${amt}`)
        .join(', ');

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
    }, 600 / speed);
  };

  return (
    <div className="space-y-4">
      {/* 1. Executive Scenario Preset Strip */}
      <div className="bg-slate-900 rounded-xl p-3.5 shadow-2xs border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-white">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-md bg-indigo-600 text-white font-mono text-xs font-bold shadow-2xs">
            RAG
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm font-extrabold text-white font-sans tracking-tight">
                Deadlock Detection &amp; Recovery Workbench
              </h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-indigo-300 font-sans font-semibold border border-slate-700">
                {isSingleInstance ? 'Single-Instance (WFG Cycle)' : 'Multi-Instance (Matrix Reduction)'}
              </span>
            </div>
          </div>
        </div>

        {/* Preset Selector Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-sans">
          <button
            onClick={() => loadPreset('D1')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-colors cursor-pointer shadow-2xs ${
              selectedPreset === 'D1'
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            D1: Single-Instance Cycle
          </button>

          <button
            onClick={() => loadPreset('D2')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-colors cursor-pointer shadow-2xs ${
              selectedPreset === 'D2'
                ? 'bg-rose-700 border-rose-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            D2: Multi-Instance Deadlock
          </button>

          <button
            onClick={() => loadPreset('D2_VARIANT')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-colors cursor-pointer shadow-2xs ${
              selectedPreset === 'D2_VARIANT'
                ? 'bg-emerald-700 border-emerald-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            D2 Variant (Safe)
          </button>

          <button
            onClick={() => loadPreset('D3')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-colors cursor-pointer shadow-2xs ${
              selectedPreset === 'D3'
                ? 'bg-indigo-700 border-indigo-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            D3: Cycle &ne; Deadlock
          </button>

          <button
            onClick={() => loadPreset(selectedPreset)}
            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs cursor-pointer transition-colors shadow-2xs"
            title="Reset Scenario State"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. High-Density Status & Recovery Header */}
      <div
        className={`p-3.5 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-2xs ${
          detectionResult.hasDeadlock
            ? 'bg-rose-50/90 border-rose-300 text-rose-950'
            : 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
        }`}
      >
        <div className="flex items-center gap-3">
          <StatusBadge status={detectionResult.status} size="sm" />
          <div>
            <h4 className="text-sm font-extrabold tracking-tight font-sans text-slate-900">
              {detectionResult.hasDeadlock ? 'Circular Deadlock Detected in System' : 'Zero Deadlocks In System (All Processes Can Terminate)'}
            </h4>
            <p className="text-xs text-slate-700 font-sans">
              {detectionResult.explanation}
            </p>
          </div>
        </div>

        {detectionResult.hasDeadlock && (
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-rose-300 text-xs font-mono font-bold text-rose-900 shadow-2xs">
            <Lock className="w-4 h-4 text-rose-600" />
            <span>Deadlocked: &#123;{detectionResult.deadlockedProcessNames.join(', ')}&#125;</span>
          </div>
        )}
      </div>

      {/* 3. 2-Column Split: Interactive RAG Graph View (7 cols) + Matrix & Trace (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* Left: Resource Allocation Graph View */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <GitBranch className="w-4 h-4 text-indigo-400" />
              <h4 className="text-sm font-extrabold text-white font-sans tracking-tight">
                Interactive Resource Allocation Graph (RAG)
              </h4>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400">
              {isSingleInstance ? 'Wait-For Graph (WFG) Topology' : 'Multi-instance bipartite graph'}
            </span>
          </div>

          <div className="p-3.5">
            <RAGGraphView
              graph={ragGraph}
              hasDeadlock={detectionResult.hasDeadlock}
              deadlockedProcessNames={detectionResult.deadlockedProcessNames}
              terminatedProcessId={terminatedProcessId}
              isSingleInstance={isSingleInstance}
            />
          </div>
        </div>

        {/* Right: Detection Matrices & Multi-instance Resolution Trace */}
        <div className="lg:col-span-5 space-y-3.5">
          {/* Allocation & Request Matrices */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <span className="text-sm font-extrabold text-white font-sans tracking-tight">
                Detection Matrices (Alloc vs. Request)
              </span>
              <span className="text-xs font-mono text-indigo-300 font-bold bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
                Avail: [{available.join(', ')}]
              </span>
            </div>

            <div className="p-3">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-center border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-700 font-mono text-xs bg-slate-100">
                      <th className="py-2 px-3 text-left font-sans font-bold">Process</th>
                      <th className="py-2 px-3 text-blue-900 font-bold">Alloc</th>
                      <th className="py-2 px-3 text-amber-900 font-bold">Request</th>
                      <th className="py-2 px-3 text-slate-800 font-bold">Finish[]</th>
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
                              ? 'opacity-30 line-through bg-slate-100'
                              : isDead
                              ? 'bg-rose-50 text-rose-900 font-semibold'
                              : fin
                              ? 'bg-emerald-50/50 text-emerald-950'
                              : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="py-2 px-3 text-left font-bold text-slate-900 text-sm">
                            {pName}
                          </td>
                          <td className="py-2 px-3 text-blue-900 font-bold text-sm">
                            [{allocation[i].join(', ')}]
                          </td>
                          <td className="py-2 px-3 text-amber-900 font-bold text-sm">
                            [{request[i].join(', ')}]
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
                </table>
              </div>
            </div>
          </div>

          {/* Algorithm Work Trace Pipeline (Requirement 3: Detailed Explanation) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <h5 className="text-sm font-extrabold text-white font-sans tracking-tight">
                Matrix Reduction Algorithm Trace
              </h5>
              <span className="text-xs text-slate-400 font-mono font-bold">
                Initial Work = [{available.join(', ')}]
              </span>
            </div>

            <div className="p-3.5 space-y-3">
              {/* Completed Reduction Steps */}
              {detectionResult.steps.length > 0 ? (
                <div className="space-y-2">
                  {detectionResult.steps.map((st) => (
                    <div
                      key={st.stepIndex}
                      className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-300 text-xs font-mono text-emerald-950 space-y-1"
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-sm">Step {st.stepIndex}: {st.processName} Request [{st.request.join(',')}] &le; Work [{st.workBefore.join(',')}]</span>
                        <span className="text-xs bg-white px-2 py-0.5 rounded border border-emerald-300 text-emerald-950 font-bold">
                          Work &rarr; [{st.workAfter.join(', ')}]
                        </span>
                      </div>
                      <p className="text-xs text-emerald-900 font-sans">
                        {st.processName} completes immediately and releases Allocation [{st.allocation.join(', ')}] back into temporary Work.
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-600 italic py-1 font-sans">
                  Work initialized to Available [{available.join(', ')}]. No process can satisfy Request &le; Work.
                </p>
              )}

              {/* Reduction Halted / Deadlock Proof Card */}
              {detectionResult.hasDeadlock && reductionDeficits && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-xs space-y-2 font-sans">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-950 text-xs flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Reduction Halted &bull; Deadlock Verified</span>
                    </span>
                    <span className="font-mono text-xs bg-white px-2 py-0.5 rounded border border-rose-300 text-rose-900 font-bold">
                      Work Halted = [{reductionDeficits.finalWork.join(', ')}]
                    </span>
                  </div>

                  <p className="text-xs text-rose-900 leading-normal">
                    With Work vector halted at [{reductionDeficits.finalWork.join(', ')}], no remaining process can satisfy its pending request:
                  </p>

                  <div className="space-y-1 font-mono text-xs">
                    {reductionDeficits.blockedList.map((bp) => (
                      <div key={bp.processId} className="p-1.5 rounded bg-white border border-rose-200 text-slate-800">
                        <span className="font-bold text-rose-900">{bp.processName}</span>{' '}
                        Request [{bp.request.join(',')}] &gt; Work [{reductionDeficits.finalWork.join(',')}]:{' '}
                        <span className="text-rose-700 font-semibold">{bp.deficits.join('; ')}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-1.5 text-xs text-rose-950 font-semibold border-t border-rose-200/80 flex items-center justify-between">
                    <span>Finish: [{detectionResult.finishArray.map((f, i) => `${processNames[i]}:${f ? 'T' : 'F'}`).join(', ')}]</span>
                    <span className="font-mono text-rose-800 font-bold">&rArr; Deadlocked &#123;{detectionResult.deadlockedProcessNames.join(', ')}&#125;</span>
                  </div>
                </div>
              )}

              {!detectionResult.hasDeadlock && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 font-sans flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-medium">
                    All processes satisfied Request &le; Work. Final Work = [{detectionResult.finalWork.join(', ')}]. Zero deadlocks exist.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Deadlock Recovery Deck (Victim Selection & Resource Preemption - Requirement 4) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skull className="w-4 h-4 text-rose-400" />
                <h4 className="text-sm font-extrabold text-white font-sans tracking-tight">
                  Deadlock Recovery: Victim Preemption
                </h4>
              </div>
              <span className="text-xs text-slate-400 font-sans">
                Select eligible victim to reclaim allocation
              </span>
            </div>

            <div className="p-3.5 space-y-3">
              {/* Action Buttons: P0 disabled because already finished; eligible victims show allocation */}
              <div className="flex flex-wrap items-center gap-2">
                {processNames.map((pName, idx) => {
                  const isFinished = detectionResult.finishArray[idx] === true;
                  const isDeadlocked = detectionResult.deadlockedProcessNames.includes(pName);
                  const isTerminated = terminatedProcessId === idx;
                  const allocStr = allocation[idx].join(',');

                  if (isFinished && !isTerminated) {
                    return (
                      <div
                        key={pName}
                        className="px-2.5 py-1.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200 text-xs font-sans font-medium flex items-center gap-1.5 cursor-not-allowed opacity-80"
                        title={`${pName} has already finished (not an eligible victim)`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{pName}: Finished</span>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={pName}
                      onClick={() => handleTerminate(idx)}
                      disabled={isTerminated || !isDeadlocked || isTerminatingAnimation}
                      className={`px-3 py-1.5 rounded-md text-xs font-sans font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-2xs ${
                        isTerminated
                          ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed line-through'
                          : isDeadlocked
                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-300'
                          : 'bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed opacity-50'
                      }`}
                      title={isDeadlocked ? `Terminate ${pName} to reclaim Allocation [${allocStr}]` : undefined}
                    >
                      <Skull className="w-3.5 h-3.5 text-rose-600" />
                      <span>Terminate {pName}</span>
                      <span className="font-mono text-xs bg-white px-2 py-0.5 rounded border border-rose-200 text-rose-800 font-black">
                        +[{allocStr}]
                      </span>
                    </button>
                  );
                })}

                {terminatedProcessId !== null && (
                  <button
                    onClick={() => loadPreset(selectedPreset)}
                    className="ml-auto px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-sans font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                    title="Reset scenario to original matrices and graph"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Scenario</span>
                  </button>
                )}
              </div>

              {/* Recovery Outcome Log Message */}
              {recoveryOutcome && (
                <div
                  className={`p-3 rounded-lg border text-xs space-y-1.5 animate-in fade-in duration-200 font-sans ${
                    recoveryOutcome.isResolved
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : 'bg-amber-50 border-amber-300 text-amber-950'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {recoveryOutcome.isResolved ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      )}
                      <span className="text-sm font-extrabold">
                        {recoveryOutcome.isResolved ? 'DEADLOCK RESOLVED' : 'DEADLOCK PERSISTS AFTER TERMINATION'}
                      </span>
                    </div>
                    <span className="font-mono text-xs bg-white px-2 py-0.5 rounded border border-slate-300 font-bold">
                      New Available: [{recoveryOutcome.newAvailable.join(', ')}]
                    </span>
                  </div>

                  <p className="text-xs leading-normal font-sans text-slate-800">
                    Terminated <strong className="font-mono text-rose-900">{recoveryOutcome.procName}</strong> and reclaimed{' '}
                    <span className="font-mono font-bold text-blue-900">[{recoveryOutcome.releasedStr}]</span> back into Available pool.
                  </p>

                  {recoveryOutcome.isResolved ? (
                    <p className="text-xs font-bold text-emerald-900 font-sans">
                      All remaining processes can now satisfy their requests in sequence:{' '}
                      <span className="font-mono text-emerald-950">&lt;{recoveryOutcome.resolvedOrder?.join(' → ')}&gt;</span>.
                    </p>
                  ) : (
                    <p className="text-xs font-bold text-amber-900 font-sans">
                      Insufficient resources reclaimed. Processes{' '}
                      <span className="font-mono text-rose-800">&#123;{recoveryOutcome.remainingBlocked.join(', ')}&#125;</span> remain blocked.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
