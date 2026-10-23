import React from 'react';
import {
  X,
  Play,
  Pause,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Shield,
  Layers,
} from 'lucide-react';

interface DemoStep {
  title: string;
  tabKey: 'avoidance' | 'detection' | 'prevention' | 'testlab';
  scenarioName: string;
  durationSeconds: number;
  badge: 'SAFE' | 'WAITING' | 'UNSAFE' | 'DEADLOCK_DETECTED' | 'INVALID_INPUT';
  caption: string;
  takeaway: string;
}

const TOUR_STEPS: DemoStep[] = [
  {
    title: '1. Avoidance: Baseline Safe State & Safe Sequence',
    tabKey: 'avoidance',
    scenarioName: 'Scenario A Base',
    durationSeconds: 45,
    badge: 'SAFE',
    caption:
      'We initialize 5 processes (P0-P4) and 3 resource types (A=10, B=5, C=7) with Available=[3,3,2]. Banker’s Safety Algorithm checks Need ≤ Work and discovers the safe execution sequence <P1, P3, P4, P0, P2>, proving the system is 100% immune to deadlock under any order of execution.',
    takeaway: 'Need = Max - Allocation is auto-computed. A safe sequence guarantees all processes can finish.',
  },
  {
    title: '2. Avoidance: Request Exceeds Available Pool',
    tabKey: 'avoidance',
    scenarioName: 'Scenario B',
    durationSeconds: 40,
    badge: 'WAITING',
    caption:
      'Process P0 submits a valid request [7, 4, 3]. Although within P0’s declared maximum claim (Request ≤ Need), it exceeds currently available resources [3, 3, 2]. Banker’s rule 6c immediately places P0 into the WAITING queue without modifying the system state.',
    takeaway: 'Waiting is not an error! The request is legitimately deferred until other processes release resources.',
  },
  {
    title: '3. Avoidance: Unsafe State Denial & Instant Rollback',
    tabKey: 'avoidance',
    scenarioName: 'Scenario C',
    durationSeconds: 50,
    badge: 'UNSAFE',
    caption:
      'From the baseline safe state (Available=[3, 3, 2]), process P0 requests [0, 0, 2]. While within Need [7,4,3] and Available [3,3,2], the tentative Available becomes [3, 3, 0]. A safety check reveals that no process can finish because every process requires resource C (or more A). The request is DENIED and the OS executes an instant atomic rollback to restore state.',
    takeaway: 'Unsafe is not deadlock! But Banker’s algorithm conservatively rejects unsafe transitions to guarantee safety.',
  },
  {
    title: '4. Detection: Multi-Instance Deadlock & Victim Recovery',
    tabKey: 'detection',
    scenarioName: 'Scenario D2',
    durationSeconds: 55,
    badge: 'DEADLOCK_DETECTED',
    caption:
      'In a multiple-instance system with Available=[0,0,0], P0 can finish, but processes {P1, P2, P3, P4} are permanently deadlocked. We initiate recovery by terminating victim process P2. Its held allocation [3, 0, 3] is returned to Available, allowing P1, P3, and P4 to resume and complete.',
    takeaway: 'Detection finds deadlocks that have already occurred using Request matrices. Recovery breaks circular waits by victim termination.',
  },
  {
    title: '5. Detection: Why Graph Cycles Aren’t Conclusive for Multi-Instance',
    tabKey: 'detection',
    scenarioName: 'Scenario D3',
    durationSeconds: 45,
    badge: 'SAFE',
    caption:
      'In Scenario D3, a cycle exists in the Resource Allocation Graph (P1-R2-P2-R1-P1). However, the multi-instance detection algorithm reports NO DEADLOCK! This is because process P3 (which holds R1 and requests nothing) finishes, releases R1, and resolves the cycle.',
    takeaway: 'Cycles are necessary and sufficient for single-instance resources, but only necessary (not sufficient) for multi-instance resources.',
  },
  {
    title: '6. Prevention: Havender Linear Ordering & Admission Gates',
    tabKey: 'prevention',
    scenarioName: 'Scenario E',
    durationSeconds: 50,
    badge: 'SAFE',
    caption:
      'We examine Deadlock Prevention by eliminating circular wait with linear resource ordering (R1 < R2 < R3). P2 holding R2 requesting R1 is blocked by policy. We compare utilization, concurrency, and wait latency across unconstrained, hierarchical ordering, and request-all-at-once schemes.',
    takeaway: 'Prevention eliminates Coffman conditions structurally at the cost of lower resource utilization or concurrency.',
  },
];

interface DemoTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: string) => void;
}

export const DemoTourModal: React.FC<DemoTourModalProps> = ({
  isOpen,
  onClose,
  onSelectTab,
}) => {
  const [currentStepIdx, setCurrentStepIdx] = React.useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = React.useState(true);
  const [elapsed, setElapsed] = React.useState(0);

  const step = TOUR_STEPS[currentStepIdx];

  // Auto-play timer
  React.useEffect(() => {
    if (!isOpen) return;

    let interval: NodeJS.Timeout | null = null;
    if (isAutoPlaying) {
      interval = setInterval(() => {
        setElapsed((prev) => {
          if (prev >= step.durationSeconds) {
            // Next step
            if (currentStepIdx + 1 < TOUR_STEPS.length) {
              setCurrentStepIdx((s) => s + 1);
              return 0;
            } else {
              setIsAutoPlaying(false);
              return prev;
            }
          }
          return prev + 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, isAutoPlaying, currentStepIdx, step.durationSeconds]);

  // Navigate app tab alongside tour
  React.useEffect(() => {
    if (isOpen) {
      onSelectTab(step.tabKey);
      setElapsed(0);
    }
  }, [currentStepIdx, isOpen]);

  if (!isOpen) return null;

  const progressPercent = Math.min(100, Math.round((elapsed / step.durationSeconds) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border-2 border-indigo-500 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Sparkles className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-mono">
                6-Minute OS Laboratory Guided Tour
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                  Step {currentStepIdx + 1} of {TOUR_STEPS.length}
                </span>
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer transition-colors"
            aria-label="Close tour"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-1.5">
          <div
            className="bg-indigo-600 h-1.5 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4 bg-white">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-bold text-slate-900 font-mono">{step.title}</h4>
            <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              {step.scenarioName}
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed font-sans">
            {step.caption}
          </p>

          <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200 text-xs text-indigo-900">
            <span className="font-bold text-indigo-800 font-mono block mb-0.5">
              Key OS Invariant:
            </span>
            <p className="font-sans text-slate-700">{step.takeaway}</p>
          </div>
        </div>

        {/* Controls Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center gap-1.5 cursor-pointer shadow-xs transition-all font-mono"
            >
              {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isAutoPlaying ? 'Pause Tour' : 'Resume Auto-Play'}
            </button>
            <span className="text-slate-500 font-mono text-[11px]">
              {step.durationSeconds - elapsed}s remaining
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono">
            <button
              onClick={() => setCurrentStepIdx((p) => Math.max(0, p - 1))}
              disabled={currentStepIdx === 0}
              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 border border-slate-300 cursor-pointer flex items-center gap-1 shadow-2xs transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <button
              onClick={() => setCurrentStepIdx((p) => Math.min(TOUR_STEPS.length - 1, p + 1))}
              disabled={currentStepIdx === TOUR_STEPS.length - 1}
              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 border border-slate-300 cursor-pointer flex items-center gap-1 shadow-2xs transition-colors"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
