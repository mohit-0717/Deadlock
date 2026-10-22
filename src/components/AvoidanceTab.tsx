import React from 'react';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Send,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Undo2,
  Info,
  Radio,
  Layers,
  ChevronRight,
  Cpu,
} from 'lucide-react';
import { RequestHandlingResult, SafetyResult, SystemState, SystemStatus } from '../engine/types.js';
import { computeNeed, requestResource, safetyCheck } from '../engine/bankers.js';
import { getScenarioA } from '../engine/scenarios.js';
import { ProcessCard, ProcessState } from './ProcessCard.js';
import { ResourceTray } from './ResourceTray.js';
import { StatusBadge } from './StatusBadge.js';
import { SetupMatrixEditor } from './SetupMatrixEditor.js';

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
  const [safetyResult, setSafetyResult] = React.useState<SafetyResult>(() =>
    safetyCheck(systemState.allocation, systemState.max, systemState.available, systemState.need)
  );

  // Stepper / replay state
  const [currentStepIndex, setCurrentStepIndex] = React.useState<number>(-1); // -1: initial
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [processStates, setProcessStates] = React.useState<Record<number, ProcessState>>({});

  // Request simulation form state
  const [selectedProcessId, setSelectedProcessId] = React.useState<number>(0);
  const [requestInput, setRequestInput] = React.useState<string[]>(() =>
    Array(systemState.resourceCount).fill('0')
  );
  const [lastRequestResult, setLastRequestResult] = React.useState<RequestHandlingResult | null>(null);
  const [isRollbackShowing, setIsRollbackShowing] = React.useState(false);

  // Re-run safety check whenever systemState changes
  React.useEffect(() => {
    const res = safetyCheck(systemState.allocation, systemState.max, systemState.available, systemState.need);
    setSafetyResult(res);
    resetReplay();

    if (onStatusChange) {
      onStatusChange(res.status);
    }
  }, [systemState]);

  // Keep requestInput vector length synced with resourceCount
  React.useEffect(() => {
    setRequestInput((prev) => {
      const arr = [...prev];
      while (arr.length < systemState.resourceCount) arr.push('0');
      return arr.slice(0, systemState.resourceCount);
    });
  }, [systemState.resourceCount]);

  // Calculate live Work vector based on current step in replay
  const liveWorkVector = React.useMemo(() => {
    if (currentStepIndex < 0) {
      return systemState.available;
    }
    const currentStep = safetyResult.steps[currentStepIndex];
    return currentStep ? currentStep.workAfter : safetyResult.finalWork;
  }, [currentStepIndex, safetyResult, systemState.available]);

  // Step forward in safety replay
  const stepForward = () => {
    if (currentStepIndex + 1 < safetyResult.steps.length) {
      const nextStep = currentStepIndex + 1;
      setCurrentStepIndex(nextStep);
      const step = safetyResult.steps[nextStep];

      setProcessStates((prev) => ({
        ...prev,
        [step.processId]: 'finished',
      }));
    } else {
      setIsPlaying(false);
    }
  };

  // Play / Autoplay loop
  React.useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isPlaying) {
      if (currentStepIndex + 1 < safetyResult.steps.length) {
        timer = setTimeout(() => {
          stepForward();
        }, 1200 / speed);
      } else {
        setIsPlaying(false);
      }
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isPlaying, currentStepIndex, safetyResult, speed]);

  const resetReplay = () => {
    setIsPlaying(false);
    setCurrentStepIndex(-1);
    const initialMap: Record<number, ProcessState> = {};
    for (let i = 0; i < systemState.processCount; i++) {
      initialMap[i] = 'idle';
    }
    setProcessStates(initialMap);
  };

  const startReplay = () => {
    resetReplay();
    setIsPlaying(true);
  };

  // Handle resource request submission
  const handleSendRequest = (overrideProcId?: number, overrideVector?: number[]) => {
    const pId = overrideProcId !== undefined ? overrideProcId : selectedProcessId;
    const req = overrideVector || requestInput.map((val) => parseInt(val, 10) || 0);

    const result = requestResource(pId, req, systemState);
    setLastRequestResult(result);

    if (onStatusChange) {
      onStatusChange(result.status);
    }

    if (result.status === 'SAFE' && result.granted) {
      // Commit state
      onStateChange(result.newState);
      setIsRollbackShowing(false);
    } else if (result.status === 'UNSAFE' && result.rollbackPerformed) {
      // Visual Rollback highlight
      setIsRollbackShowing(true);
      setTimeout(() => setIsRollbackShowing(false), 4500);
    } else if (result.status === 'WAITING') {
      // Waiting queue state
      setProcessStates((prev) => ({
        ...prev,
        [pId]: 'waiting',
      }));
    }
  };

  // Pre-configured Scenario Loaders
  const loadScenarioA = () => {
    onStateChange(getScenarioA());
    setLastRequestResult(null);
    setIsRollbackShowing(false);
  };

  const loadScenarioB = () => {
    const base = getScenarioA();
    onStateChange(base);
    setSelectedProcessId(0);
    setRequestInput(['7', '4', '3']);
    // Execute immediately to demonstrate Waiting
    setTimeout(() => {
      handleSendRequest(0, [7, 4, 3]);
    }, 100);
  };

  const loadScenarioC = () => {
    const base = getScenarioA();
    // Step 1: P1 requests [1,0,2] -> safe, granted
    const step1 = requestResource(1, [1, 0, 2], base);
    onStateChange(step1.newState);
    setSelectedProcessId(0);
    setRequestInput(['0', '2', '0']);

    // Step 2: P0 requests [0,2,0] -> unsafe, denied and rollback
    setTimeout(() => {
      const step2 = requestResource(0, [0, 2, 0], step1.newState);
      setLastRequestResult(step2);
      setIsRollbackShowing(true);
      if (onStatusChange) onStatusChange('UNSAFE');
    }, 250);
  };

  return (
    <div className="space-y-6">
      {/* Configuration & Matrix Drawer with Embedded Orbital Scenario Presets */}
      <SetupMatrixEditor
        state={systemState}
        onChange={onStateChange}
        onReset={loadScenarioA}
        scenarioActions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={loadScenarioA}
              className="px-3 py-1.5 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow-[0_0_12px_rgba(16,185,129,0.3)] hover:scale-[1.02]"
              title="Load Scenario A: Standard Safe State"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Mission A (Safe)</span>
            </button>

            <button
              onClick={loadScenarioB}
              className="px-3 py-1.5 rounded-xl bg-amber-950/70 hover:bg-amber-900 border border-amber-500/50 text-amber-300 text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow-[0_0_12px_rgba(245,158,11,0.3)] hover:scale-[1.02]"
              title="Load Scenario B: Request exceeds Available, causing Waiting state"
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Mission B (Waiting)</span>
            </button>

            <button
              onClick={loadScenarioC}
              className="px-3 py-1.5 rounded-xl bg-rose-950/70 hover:bg-rose-900 border border-rose-500/50 text-rose-300 text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow-[0_0_12px_rgba(244,63,94,0.3)] hover:scale-[1.02]"
              title="Load Scenario C: Unsafe Request with Trial Rollback"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Mission C (Unsafe Rollback)</span>
            </button>
          </div>
        }
      />

      {/* Available Resource Matrix Vessel */}
      <ResourceTray
        resourceNames={systemState.resourceNames}
        available={systemState.available}
        workVector={currentStepIndex >= 0 ? liveWorkVector : undefined}
        label={currentStepIndex >= 0 ? 'Algorithm Work Vector Trace [W]' : 'Current Available Resources [W]'}
        isWorkVector={currentStepIndex >= 0}
      />

      {/* Process Agents Grid */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-100 font-mono tracking-tight flex items-center gap-2">
              <span>Orbital Process Pods ({systemState.processCount})</span>
            </h3>
            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-500/30">
              Live Pod Telemetry
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-slate-500" /> Idle
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)] animate-pulse" /> Waiting
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]" /> Finished
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {systemState.processNames.map((pName, i) => {
            let procState: ProcessState = processStates[i] || 'idle';
            let isCurrent = false;

            if (currentStepIndex >= 0 && currentStepIndex < safetyResult.steps.length) {
              const activeStep = safetyResult.steps[currentStepIndex];
              if (activeStep.processId === i) {
                procState = 'running';
                isCurrent = true;
              } else if (safetyResult.safeSequence.indexOf(i) < currentStepIndex && safetyResult.safeSequence.indexOf(i) !== -1) {
                procState = 'finished';
              }
            }

            // Check if stuck in unsafe state
            const isStuck = safetyResult.stuckProcesses.some((sp) => sp.processId === i);
            if (!safetyResult.isSafe && isStuck && currentStepIndex === safetyResult.steps.length - 1) {
              procState = 'stuck';
            }

            const stuckInfo = safetyResult.stuckProcesses.find((sp) => sp.processId === i);
            const deficitText = stuckInfo
              ? stuckInfo.failingResources.map((fr) => `${fr.resourceName} Need ${fr.needAmount} > Work ${fr.workAmount}`).join(', ')
              : undefined;

            return (
              <ProcessCard
                key={i}
                id={i}
                name={pName}
                allocation={systemState.allocation[i]}
                max={systemState.max[i]}
                need={systemState.need[i]}
                resourceNames={systemState.resourceNames}
                state={procState}
                isCurrentStep={isCurrent}
                progressPercent={isCurrent ? 75 : 0}
                waitingDeficit={deficitText}
                onSelect={() => setSelectedProcessId(i)}
                onQuickRequest={(procId) => {
                  setSelectedProcessId(procId);
                  const el = document.getElementById('request-simulator-deck');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Holographic Safety Replay Deck */}
      <div className="cockpit-glass rounded-2xl p-5 sm:p-6 shadow-xl border border-cyan-500/25 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <StatusBadge status={safetyResult.status} size="md" />
            <div>
              <h4 className="text-sm sm:text-base font-bold text-slate-100 font-mono tracking-tight flex items-center gap-2">
                <span>Banker&apos;s Safety Algorithm: Work Vector Replay</span>
              </h4>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {safetyResult.isSafe
                  ? `Safe sequence verified: <${safetyResult.safeSequenceNames.join(', ')}>`
                  : `Unsafe: ${safetyResult.stuckProcesses.length} processes cannot guarantee completion`}
              </p>
            </div>
          </div>

          {/* Stepper Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={isPlaying ? () => setIsPlaying(false) : startReplay}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                isPlaying
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)]'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Pause' : 'Play Sequence'}</span>
            </button>

            <button
              onClick={stepForward}
              disabled={isPlaying || currentStepIndex + 1 >= safetyResult.steps.length}
              className="px-3 py-1.5 rounded-xl bg-slate-850 hover:bg-slate-800 disabled:opacity-40 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-medium flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span>Step</span>
            </button>

            <button
              onClick={resetReplay}
              className="px-3 py-1.5 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-mono font-medium flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Current Step Caption */}
        {currentStepIndex >= 0 && currentStepIndex < safetyResult.steps.length && (
          <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-xs text-emerald-200 flex flex-wrap items-center justify-between gap-3 shadow-[0_0_15px_rgba(16,185,129,0.2)] animate-in fade-in duration-200 font-mono">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-lg bg-emerald-900 text-emerald-300 font-bold border border-emerald-500/40">
                Step {currentStepIndex + 1} of {safetyResult.steps.length}
              </span>
              <span>{safetyResult.steps[currentStepIndex].canRunReason}</span>
            </div>
            <span className="text-emerald-300 font-bold bg-slate-950/70 px-2.5 py-1 rounded-lg border border-emerald-500/30">
              Work &rarr; [{safetyResult.steps[currentStepIndex].workAfter.join(', ')}]
            </span>
          </div>
        )}

        {/* Timeline Pipeline Light-up: [3,3,2] -> P1 -> [5,3,2] -> P3 ... */}
        <div className="pt-2 overflow-x-auto">
          <div className="flex items-center gap-2.5 min-w-max pb-2">
            {/* Initial Work vector */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase font-mono text-slate-400 mb-1">Start Work</span>
              <span className="px-3 py-1.5 rounded-xl bg-slate-850 text-cyan-300 font-mono text-xs font-bold border border-cyan-500/30 shadow-sm">
                [{systemState.available.join(', ')}]
              </span>
            </div>

            {safetyResult.steps.map((step, idx) => {
              const isPastOrActive = idx <= currentStepIndex;
              const isActive = idx === currentStepIndex;

              return (
                <React.Fragment key={idx}>
                  <ArrowRight
                    className={`w-4 h-4 transition-colors ${
                      isPastOrActive ? 'text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.8)]' : 'text-slate-700'
                    }`}
                  />

                  {/* Process Node in pipeline */}
                  <div
                    className={`flex flex-col items-center p-2 rounded-xl border transition-all duration-300 ${
                      isActive
                        ? 'bg-emerald-950 border-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.4)] scale-105'
                        : isPastOrActive
                        ? 'bg-emerald-950/40 border-emerald-600/50'
                        : 'bg-slate-900/60 border-slate-800 opacity-60'
                    }`}
                  >
                    <span className="text-[10px] text-slate-400 font-mono">Step {idx + 1}</span>
                    <span className="text-xs font-bold text-emerald-300 font-mono mt-0.5">
                      {step.processName}
                    </span>
                    <span className="text-[10px] text-slate-300 font-mono mt-0.5">
                      Work: [{step.workAfter.join(', ')}]
                    </span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Stuck processes detail if UNSAFE */}
        {!safetyResult.isSafe && (
          <div className="p-4 rounded-xl bg-amber-950/60 border border-amber-500/60 text-xs text-amber-200 space-y-2 shadow-lg font-mono">
            <div className="font-bold text-amber-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Unsafe State Analysis (No Safe Sequence Exists):</span>
            </div>
            <p className="text-slate-300 font-sans leading-relaxed">
              {safetyResult.explanation}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {safetyResult.stuckProcesses.map((sp) => (
                <div key={sp.processId} className="p-2.5 rounded-lg bg-slate-950/80 border border-amber-500/30">
                  <span className="font-bold text-amber-400">{sp.processName}:</span> Need [{sp.need.join(', ')}] &gt; Work [{sp.workAvailable.join(', ')}]
                  <div className="text-[10px] text-slate-400 mt-1">
                    Deficit: {sp.failingResources.map((f) => `${f.resourceName} (-${f.deficit})`).join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Interactive Request Simulator Console */}
      <div id="request-simulator-deck" className="cockpit-glass rounded-2xl p-5 sm:p-6 shadow-xl border border-cyan-500/25 space-y-5">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
              <Send className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-bold text-slate-100 font-mono tracking-tight">
                Resource-Request Algorithm Simulator
              </h4>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Rule 6: Validate &rarr; Need Check &rarr; Available Check &rarr; Trial Allocation &amp; Safety Verification
              </p>
            </div>
          </div>
        </div>

        {/* Request Input Form */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Target Process */}
          <div className="md:col-span-3">
            <label className="block text-xs font-mono font-medium text-slate-400 mb-1.5">
              Target Process Agent
            </label>
            <select
              value={selectedProcessId}
              onChange={(e) => setSelectedProcessId(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs font-mono focus:border-cyan-500 focus:outline-none shadow-inner"
            >
              {systemState.processNames.map((pName, idx) => (
                <option key={idx} value={idx}>
                  {pName} (Need: [{systemState.need[idx].join(', ')}])
                </option>
              ))}
            </select>
          </div>

          {/* Request Vector Inputs */}
          <div className="md:col-span-6">
            <label className="block text-xs font-mono font-medium text-slate-400 mb-1.5">
              Request Vector [{systemState.resourceNames.join(', ')}]
            </label>
            <div className="flex items-center gap-2">
              {systemState.resourceNames.map((resName, rIdx) => (
                <div key={resName} className="flex-1 flex flex-col items-center">
                  <span className="text-[10px] text-cyan-400 font-mono mb-1">{resName}</span>
                  <input
                    type="number"
                    value={requestInput[rIdx] || '0'}
                    onChange={(e) => {
                      const updated = [...requestInput];
                      updated[rIdx] = e.target.value;
                      setRequestInput(updated);
                    }}
                    className="w-full px-2 py-2 text-center bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-mono text-xs focus:border-cyan-500 focus:outline-none shadow-inner"
                    aria-label={`Request amount for resource ${resName}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="md:col-span-3">
            <button
              onClick={() => handleSendRequest()}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-mono font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all cursor-pointer border border-cyan-400/40 active:scale-95"
            >
              <Send className="w-3.5 h-3.5 text-cyan-200" />
              <span>Inject Request</span>
            </button>
          </div>
        </div>

        {/* Quick Test Vector Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-slate-400 font-mono text-[11px] font-medium">Quick Benchmarks:</span>
          <button
            onClick={() => {
              setSelectedProcessId(1);
              setRequestInput(['1', '0', '2']);
              handleSendRequest(1, [1, 0, 2]);
            }}
            className="px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-mono text-[11px] cursor-pointer transition-all"
          >
            P1: [1,0,2] (Safe &rarr; Granted)
          </button>
          <button
            onClick={() => {
              setSelectedProcessId(0);
              setRequestInput(['7', '4', '3']);
              handleSendRequest(0, [7, 4, 3]);
            }}
            className="px-2.5 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-900 border border-amber-500/40 text-amber-300 font-mono text-[11px] cursor-pointer transition-all"
          >
            P0: [7,4,3] (&gt; Avail &rarr; Deferred)
          </button>
          <button
            onClick={() => {
              setSelectedProcessId(0);
              setRequestInput(['0', '2', '0']);
              handleSendRequest(0, [0, 2, 0]);
            }}
            className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-mono text-[11px] cursor-pointer transition-all"
          >
            P0: [0,2,0] (Unsafe &rarr; Rollback)
          </button>
          <button
            onClick={() => {
              setSelectedProcessId(0);
              setRequestInput(['8', '0', '0']);
              handleSendRequest(0, [8, 0, 0]);
            }}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[11px] cursor-pointer transition-all"
          >
            P0: [8,0,0] (&gt; Max &rarr; Invalid)
          </button>
        </div>

        {/* Live Rollback Banner with Reset-to-original-state button */}
        {isRollbackShowing && (
          <div className="p-4 rounded-xl bg-amber-950/80 border-2 border-amber-500 text-amber-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[0_0_20px_rgba(245,158,11,0.3)] animate-in fade-in duration-200">
            <div className="flex items-start gap-3">
              <Undo2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
              <div className="space-y-1 text-xs">
                <span className="font-mono font-black text-amber-300 text-sm block tracking-wide">
                  TRIAL ALLOCATION ROLLED BACK!
                </span>
                <p className="text-amber-200 leading-relaxed font-sans">
                  The trial allocation temporarily reduced Available to [
                  {lastRequestResult?.trialState?.available.join(', ')}]. Because Dijkstra&apos;s Safety Check determined no complete safe sequence could guarantee completion,
                  the operating system <strong>immediately cancelled the trial and restored the exact pre-request matrices</strong>.
                </p>
              </div>
            </div>

            {/* Reset to Original State Button */}
            <button
              onClick={loadScenarioA}
              className="px-3.5 py-1.5 rounded-xl bg-amber-900 hover:bg-amber-800 text-amber-100 border border-amber-400/50 text-xs font-mono font-bold flex items-center gap-1.5 shadow-md cursor-pointer shrink-0 transition-all hover:scale-105"
              title="Reset state to initial base"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Original State</span>
            </button>
          </div>
        )}

        {/* Before / After Matrix Diff after every Denied Request */}
        {lastRequestResult && !lastRequestResult.granted && (
          <div className="p-4 rounded-xl cockpit-glass-subtle border border-cyan-500/30 space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-amber-500/20 text-amber-400 font-bold font-mono">
                  &Delta;
                </span>
                <h5 className="font-bold text-slate-100 uppercase tracking-wider text-xs font-mono">
                  Before / After Matrix Diff: Denied Request Analysis
                </h5>
              </div>
              <span className="text-[11px] font-mono text-cyan-400">
                Target: P{selectedProcessId}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-[11px]">
              {/* 1. Before Request */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-slate-400 font-sans font-bold text-xs">
                  <span>1. Before (Prior State)</span>
                  <span className="text-emerald-400 font-mono text-[10px]">Baseline</span>
                </div>
                <div className="space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Available:</span>
                    <span className="font-bold text-cyan-300">
                      [{lastRequestResult.priorState.available.join(', ')}]
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">P{selectedProcessId} Alloc:</span>
                    <span className="text-blue-300">
                      [{lastRequestResult.priorState.allocation[selectedProcessId]?.join(', ') || 'N/A'}]
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">P{selectedProcessId} Need:</span>
                    <span className="text-emerald-300 font-bold">
                      [{lastRequestResult.priorState.need[selectedProcessId]?.join(', ') || 'N/A'}]
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Trial State (Attempted & Rejected) */}
              <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/40 space-y-2">
                <div className="flex items-center justify-between text-rose-300 font-sans font-bold text-xs">
                  <span>2. Trial State (Attempted)</span>
                  <span className="text-rose-400 font-mono text-[10px]">Rejected</span>
                </div>
                {lastRequestResult.trialState ? (
                  <div className="space-y-1 text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Available:</span>
                      <span className="font-bold text-rose-300">
                        [{lastRequestResult.trialState.available.join(', ')}]
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">P{selectedProcessId} Alloc:</span>
                      <span className="text-amber-300">
                        [{lastRequestResult.trialState.allocation[selectedProcessId]?.join(', ')}]
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">P{selectedProcessId} Need:</span>
                      <span className="text-amber-300">
                        [{lastRequestResult.trialState.need[selectedProcessId]?.join(', ')}]
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 font-sans italic">
                    Request discarded prior to trial allocation ({lastRequestResult.status}).
                  </p>
                )}
              </div>

              {/* 3. After Rollback (Restored State) */}
              <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/40 space-y-2">
                <div className="flex items-center justify-between text-emerald-300 font-sans font-bold text-xs">
                  <span>3. After Rollback (Restored)</span>
                  <span className="text-emerald-400 font-mono text-[10px]">Identical</span>
                </div>
                <div className="space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Available:</span>
                    <span className="font-bold text-cyan-300">
                      [{lastRequestResult.newState.available.join(', ')}]
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">P{selectedProcessId} Alloc:</span>
                    <span className="text-blue-300">
                      [{lastRequestResult.newState.allocation[selectedProcessId]?.join(', ') || 'N/A'}]
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">P{selectedProcessId} Need:</span>
                    <span className="text-emerald-300 font-bold">
                      [{lastRequestResult.newState.need[selectedProcessId]?.join(', ') || 'N/A'}]
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 font-mono flex items-center justify-between">
              <span>
                <strong>Diff Conclusion:</strong> Rollback mechanism guaranteed complete zero-leak restoration of all resource arrays.
              </span>
              <button
                onClick={loadScenarioA}
                className="text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer underline decoration-cyan-500/50"
              >
                Reset to Scenario A Base
              </button>
            </div>
          </div>
        )}

        {/* Detailed Decision Report */}
        {lastRequestResult && (
          <div className="p-4 rounded-xl cockpit-glass-subtle border border-cyan-500/30 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusBadge status={lastRequestResult.status} size="sm" />
                <span className="font-bold text-slate-100 font-mono">{lastRequestResult.message}</span>
              </div>
              <span className="text-[11px] font-mono text-cyan-400">
                Rule Executed: {lastRequestResult.ruleCode}
              </span>
            </div>

            <p className="text-slate-300 leading-relaxed font-sans">
              {lastRequestResult.reason}
            </p>

            {/* Invariant Explanation for viva */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-cyan-400" />
                <strong>OS Invariant:</strong> {lastRequestResult.granted ? 'System committed state transition.' : 'System state remained invariant.'}
              </span>
              {lastRequestResult.safetyResult && (
                <span className="text-slate-400">
                  Sequence: &lt;{lastRequestResult.safetyResult.safeSequenceNames.join(', ') || 'None'}&gt;
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
