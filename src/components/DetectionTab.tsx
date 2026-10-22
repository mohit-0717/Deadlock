import React from 'react';
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
  Sparkles,
  ArrowRight,
  Radio,
  Activity,
  Layers,
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

interface DetectionTabProps {
  speed: number;
  reduceMotion: boolean;
  onStatusChange?: (status: SystemStatus) => void;
}

type ExamplePreset = 'D1' | 'D2' | 'D2_VARIANT' | 'D3';

export const DetectionTab: React.FC<DetectionTabProps> = ({
  speed,
  reduceMotion,
  onStatusChange,
}) => {
  const [selectedPreset, setSelectedPreset] = React.useState<ExamplePreset>('D2');

  // Working state for detection
  const [allocation, setAllocation] = React.useState<number[][]>(() => getScenarioD2().allocation);
  const [request, setRequest] = React.useState<number[][]>(() => getScenarioD2().request);
  const [available, setAvailable] = React.useState<number[]>(() => getScenarioD2().available);
  const [totalInstances, setTotalInstances] = React.useState<number[] | undefined>(() => getScenarioD2().totalInstances);
  const [processNames, setProcessNames] = React.useState<string[]>(() => getScenarioD2().processNames);
  const [resourceNames, setResourceNames] = React.useState<string[]>(() => getScenarioD2().resourceNames);

  // Recovery state
  const [terminatedProcessId, setTerminatedProcessId] = React.useState<number | null>(null);
  const [recoveryLog, setRecoveryLog] = React.useState<string | null>(null);
  const [isTerminatingAnimation, setIsTerminatingAnimation] = React.useState(false);

  const isSingleInstance = selectedPreset === 'D1';

  // Compute detection result
  const detectionResult: DetectionResult = React.useMemo(() => {
    if (isSingleInstance) {
      return detectDeadlockSingleInstance(allocation, request, available, processNames, resourceNames);
    } else {
      return detectDeadlockMultiInstance(allocation, request, available, processNames, resourceNames);
    }
  }, [allocation, request, available, processNames, resourceNames, isSingleInstance]);

  // Compute RAG Graph
  const ragGraph: RAGGraph = React.useMemo(() => {
    return buildRAG(allocation, request, available, totalInstances, processNames, resourceNames);
  }, [allocation, request, available, totalInstances, processNames, resourceNames]);

  // Sync status
  React.useEffect(() => {
    if (onStatusChange) {
      onStatusChange(detectionResult.status);
    }
  }, [detectionResult, onStatusChange]);

  // Switch presets
  const loadPreset = (preset: ExamplePreset) => {
    setSelectedPreset(preset);
    setTerminatedProcessId(null);
    setRecoveryLog(null);
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

  // Perform process termination & recovery
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

      setRecoveryLog(
        `Process ${pName} terminated. Reclaimed [${relStr}] back into Available pool. Post-termination detection reports: ${
          recovery.detectionResult.hasDeadlock ? 'Deadlock still persists' : 'DEADLOCK BROKEN! All processes can now complete.'
        }`
      );
      setIsTerminatingAnimation(false);
    }, 600 / speed);
  };

  return (
    <div className="space-y-6">
      {/* Preset Selector Header */}
      <div className="cockpit-glass rounded-2xl p-4 sm:p-5 shadow-xl border border-cyan-500/20 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest font-mono">
                Detection Benchmark Flight Cases
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 font-mono border border-cyan-500/40">
                {isSingleInstance ? 'Single-Instance (WFG)' : 'Multi-Instance (Matrix)'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Wait-For Graph Cycle Detection vs. Multi-Instance Matrix Reduction
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => loadPreset('D1')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
              selectedPreset === 'D1'
                ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            D1: Single-Instance Cycle
          </button>

          <button
            onClick={() => loadPreset('D2')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
              selectedPreset === 'D2'
                ? 'bg-rose-600 border-rose-400 text-white shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            D2: Multi-Instance Deadlock
          </button>

          <button
            onClick={() => loadPreset('D2_VARIANT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
              selectedPreset === 'D2_VARIANT'
                ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            D2 Variant (P2 Req=0 &rarr; Safe)
          </button>

          <button
            onClick={() => loadPreset('D3')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
              selectedPreset === 'D3'
                ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            D3: Cycle but NOT Deadlock!
          </button>

          <button
            onClick={() => loadPreset(selectedPreset)}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs cursor-pointer transition-all"
            title="Reset Scenario State"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mandatory Rule 8 Warning Banner for Multi-instance vs Single-instance */}
      {!isSingleInstance && (
        <div className="p-4 rounded-xl bg-amber-950/70 border-2 border-amber-500/80 text-amber-200 text-xs flex items-start gap-3.5 shadow-lg">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
          <div className="space-y-1">
            <span className="font-mono font-black text-amber-300 block text-sm tracking-wide">
              OS THEOREM WARNING: Multi-Instance Resource Graphs
            </span>
            <p className="text-amber-200 leading-relaxed font-sans">
              &ldquo;A cycle in a resource-allocation graph is <strong>NOT by itself conclusive</strong> for multiple-instance resources.&rdquo;
              A cycle is a <em>necessary</em> condition for deadlock in multi-instance systems, but only <em>sufficient</em> if resources are strictly single-instance.
              Deadlock in multi-instance systems is verified solely by running the <strong>Allocation-Request-Available reduction algorithm</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Detection Status Alert Banner */}
      <div
        className={`p-4 sm:p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl ${
          detectionResult.hasDeadlock
            ? 'cockpit-glass border-red-500/80 text-red-200 shadow-[0_0_25px_rgba(239,68,68,0.25)]'
            : 'cockpit-glass border-emerald-500/80 text-emerald-200 shadow-[0_0_25px_rgba(16,185,129,0.25)]'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <StatusBadge status={detectionResult.status} size="lg" />
          <div>
            <h4 className="text-sm sm:text-base font-black tracking-wide font-mono uppercase">
              {detectionResult.hasDeadlock ? 'Deadlocked Processes Identified' : 'Zero Deadlocks In System'}
            </h4>
            <p className="text-xs text-slate-300 font-sans mt-0.5">
              {detectionResult.explanation}
            </p>
          </div>
        </div>

        {detectionResult.hasDeadlock && (
          <div className="flex items-center gap-2 bg-red-950/90 px-3.5 py-2 rounded-xl border border-red-500/60 text-xs font-mono font-bold text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.3)]">
            <Lock className="w-4 h-4 text-red-400 animate-pulse" />
            <span>Deadlocked Set: &#123;{detectionResult.deadlockedProcessNames.join(', ')}&#125;</span>
          </div>
        )}
      </div>

      {/* Graph and Matrix Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Resource Allocation Graph View */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 font-mono">
              <GitBranch className="w-4 h-4 text-cyan-400" />
              Interactive Resource Allocation Graph (RAG)
            </h4>
            <span className="text-[11px] font-mono text-cyan-400">
              {isSingleInstance ? 'Wait-For Graph Cycle Detection' : 'Multi-instance Node Topology'}
            </span>
          </div>

          <RAGGraphView
            graph={ragGraph}
            hasDeadlock={detectionResult.hasDeadlock}
            deadlockedProcessNames={detectionResult.deadlockedProcessNames}
            terminatedProcessId={terminatedProcessId}
          />
        </div>

        {/* Right: Matrices and Multi-instance Algorithm Step Trace */}
        <div className="lg:col-span-5 space-y-4">
          {/* Current Matrices: Allocation & Request */}
          <div className="cockpit-glass rounded-2xl p-4 shadow-xl border border-cyan-500/20 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                Detection Matrices (Alloc vs Request)
              </span>
              <span className="text-[11px] font-mono text-cyan-300 font-bold">
                Available: [{available.join(', ')}]
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-center border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                    <th className="py-1 px-2 text-left">Process</th>
                    <th className="py-1 px-2 text-blue-400 font-semibold">Allocation</th>
                    <th className="py-1 px-2 text-amber-400 font-semibold">Request</th>
                    <th className="py-1 px-2 text-slate-400">Finish[]</th>
                  </tr>
                </thead>
                <tbody>
                  {processNames.map((pName, i) => {
                    const isDead = detectionResult.deadlockedProcessNames.includes(pName);
                    const isTerm = terminatedProcessId === i;
                    const fin = detectionResult.finishArray[i];

                    return (
                      <tr
                        key={i}
                        className={`border-b border-slate-900/60 font-mono ${
                          isTerm
                            ? 'opacity-30 line-through'
                            : isDead
                            ? 'bg-red-950/40 text-red-300'
                            : 'hover:bg-slate-900/50'
                        }`}
                      >
                        <td className="py-2 px-2 text-left font-bold text-slate-200">
                          {pName}
                        </td>
                        <td className="py-2 px-2 text-blue-300">
                          [{allocation[i].join(', ')}]
                        </td>
                        <td className="py-2 px-2 text-amber-300">
                          [{request[i].join(', ')}]
                        </td>
                        <td className="py-2 px-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              fin
                                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
                                : 'bg-red-950/80 text-red-400 border border-red-500/40'
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

          {/* Algorithm Work Trace Pipeline */}
          <div className="cockpit-glass rounded-2xl p-4 shadow-xl border border-cyan-500/20 space-y-2">
            <h5 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between font-mono">
              <span>Detection Algorithm Resolution Trace</span>
              <span className="text-[10px] text-cyan-400">
                {detectionResult.steps.length} Steps Completed
              </span>
            </h5>

            {detectionResult.steps.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2 font-mono">
                No process could satisfy Request &le; Work. System immediately blocked at start.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {detectionResult.steps.map((st) => (
                  <div
                    key={st.stepIndex}
                    className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-300"
                  >
                    <div className="flex items-center justify-between text-emerald-400 font-bold mb-0.5">
                      <span>Step {st.stepIndex}: {st.processName} completes</span>
                      <span>Work &rarr; [{st.workAfter.join(', ')}]</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-sans">{st.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recovery Demo Section (Rule 9) */}
      <div className="cockpit-glass rounded-2xl p-5 sm:p-6 shadow-xl border border-cyan-500/20 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
              <Skull className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-bold text-slate-100 font-mono tracking-tight">
                Deadlock Recovery Engine (Victim Selection &amp; Resource Preemption)
              </h4>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Terminate a deadlocked process to reclaim its allocated resources and unblock remaining processes.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-slate-300 font-mono">
            Terminate Victim Process:
          </span>

          {processNames.map((pName, idx) => {
            const isDeadlocked = detectionResult.deadlockedProcessNames.includes(pName);
            const isTerminated = terminatedProcessId === idx;

            return (
              <button
                key={pName}
                onClick={() => handleTerminate(idx)}
                disabled={isTerminated || !isDeadlocked}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isTerminated
                    ? 'bg-slate-950 text-slate-600 border border-slate-800 cursor-not-allowed'
                    : isDeadlocked
                    ? 'bg-red-900/50 hover:bg-red-800/80 text-red-200 border border-red-500/60 hover:shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                    : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed opacity-40'
                }`}
              >
                <Skull className="w-3.5 h-3.5 text-red-400" />
                <span>Terminate {pName}</span>
              </button>
            );
          })}

          {terminatedProcessId !== null && (
            <button
              onClick={() => loadPreset(selectedPreset)}
              className="ml-auto px-3.5 py-1.5 rounded-xl bg-slate-850 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-medium flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Scenario State</span>
            </button>
          )}
        </div>

        {/* Recovery Execution Feedback Log */}
        {recoveryLog && (
          <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-500/60 text-emerald-200 text-xs space-y-1 animate-in fade-in duration-300 shadow-lg">
            <div className="font-bold text-emerald-300 flex items-center gap-2 font-mono">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Recovery Action Outcome:</span>
            </div>
            <p className="text-slate-200 font-mono text-[11px] leading-relaxed">
              {recoveryLog}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
