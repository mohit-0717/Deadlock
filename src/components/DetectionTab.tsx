import React, { useState, useMemo, useEffect } from 'react';
import {
  Lock,
  Skull,
  RotateCcw,
  CheckCircle2,
  GitBranch,
  AlertTriangle,
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
  speed?: number;
  reduceMotion?: boolean;
  onStatusChange?: (status: SystemStatus) => void;
  onDetectionContextChange?: (ctx: DetectionContextData) => void;
}

type ExamplePreset = 'D1' | 'D2' | 'D2_VARIANT' | 'D3';

export const DetectionTab: React.FC<DetectionTabProps> = ({
  speed = 1.0,
  onStatusChange,
  onDetectionContextChange,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<ExamplePreset>('D2');

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

  const loadPreset = (preset: ExamplePreset) => {
    setSelectedPreset(preset);
    setTerminatedProcessId(null);
    setRecoveryOutcome(null);

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
    }, 500 / speed);
  };

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
            <span className="text-xs font-bold text-slate-600">Preset Scenarios:</span>
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
            : 'bg-emerald-50 border-emerald-200 text-emerald-950'
        }`}
      >
        <div className="flex items-center gap-3">
          <StatusBadge status={detectionResult.status} size="sm" />
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              {detectionResult.hasDeadlock
                ? `Deadlock Detected among {${detectionResult.deadlockedProcessNames.join(', ')}}`
                : 'Zero Deadlocks in System (All Processes Can Terminate)'}
            </h4>
            <p className="text-xs text-slate-700 mt-0.5">
              {detectionResult.explanation}
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
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800">
                Allocation &amp; Request Matrices
              </span>
              <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded border border-indigo-200">
                Available: [{available.join(', ')}]
              </span>
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
                          [{allocation[i].join(', ')}]
                        </td>
                        <td className="py-2 px-3 text-amber-900 font-bold">
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
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic font-sans">
                  No process has a Request &le; Available. Work cannot grow.
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
                  className={`p-3 rounded-lg border text-xs space-y-1 font-sans ${
                    recoveryOutcome.isResolved
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : 'bg-amber-50 border-amber-300 text-amber-950'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    {recoveryOutcome.isResolved ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>System Deadlock Resolved!</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>Partial Recovery (Deadlock Persists)</span>
                      </>
                    )}
                  </div>
                  <p>
                    Terminated <strong>{recoveryOutcome.procName}</strong> and reclaimed resources: [
                    {recoveryOutcome.releasedStr}]. New Available pool is [
                    {recoveryOutcome.newAvailable.join(', ')}].
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
