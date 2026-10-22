import React from 'react';
import { HelpCircle, Eye, EyeOff, CheckCircle2, ChevronRight, Award, Sparkles } from 'lucide-react';

interface VivaQuestion {
  id: string;
  topic: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const VIVA_QUESTIONS: VivaQuestion[] = [
  {
    id: 'v1',
    topic: "Banker's Algorithm",
    prompt: 'Given Available = [3, 3, 2] in Scenario A, which process runs first in the safe sequence and what is the Work vector immediately after it finishes?',
    options: [
      'P0 runs first, Work becomes [7, 5, 3]',
      'P1 runs first (Need [1,2,2] ≤ [3,3,2]), Work becomes [5, 3, 2]',
      'P2 runs first, Work becomes [6, 3, 4]',
      'P4 runs first, Work becomes [3, 3, 4]',
    ],
    correctIndex: 1,
    explanation:
      'Only P1 and P3 have Need ≤ Available [3, 3, 2]. P1 runs first (Need [1, 2, 2] ≤ [3, 3, 2]), finishes, and releases its allocation [2, 0, 0]. Work becomes [3+2, 3+0, 2+0] = [5, 3, 2].',
  },
  {
    id: 'v2',
    topic: 'State Classification',
    prompt: 'Suppose a resource request transitions the system into an UNSAFE state. Does this mean the system is currently deadlocked?',
    options: [
      'Yes, an unsafe state is mathematically identical to a deadlocked state.',
      'No, unsafe only means the OS cannot guarantee all processes will complete if all demand peak claims; processes may finish if they need fewer resources.',
      'Yes, all processes in the system are immediately frozen.',
      'No, because Banker’s algorithm can dynamically detect and kill the culprit process.',
    ],
    correctIndex: 1,
    explanation:
      'An unsafe state is NOT deadlock! Deadlock is an active condition where processes are permanently blocked. An unsafe state merely carries a risk that deadlock could occur if every process demands its maximum claim.',
  },
  {
    id: 'v3',
    topic: 'Deadlock Detection vs Avoidance',
    prompt: 'Why does the Multi-Instance Deadlock Detection Algorithm evaluate the Request matrix rather than the Need or Maximum matrix?',
    options: [
      'Need and Maximum only exist during avoidance planning; detection checks what processes are currently asking for right now in active execution.',
      'Request matrix contains double the resource instances of Need.',
      'Because detection runs on single-core architectures only.',
      'To save memory during kernel compilation.',
    ],
    correctIndex: 0,
    explanation:
      'Avoidance looks ahead to potential worst-case maximum claims (Max - Alloc = Need). Detection looks at reality right now: processes have active outstanding requests (Request matrix) that are blocked by current Available instances.',
  },
  {
    id: 'v4',
    topic: 'Graph Theory & RAG',
    prompt: 'In a Resource Allocation Graph with multiple-instance resources, is the presence of a cycle conclusive proof of a deadlock?',
    options: [
      'Yes, any cycle in any RAG guarantees deadlock.',
      'No, a cycle in a multi-instance graph is necessary but NOT sufficient; processes not in the cycle can release resources and resolve the chain.',
      'No, cycles only matter in single-core processors.',
      'Yes, provided there are at least 3 processes involved.',
    ],
    correctIndex: 1,
    explanation:
      'In multiple-instance systems, a cycle is not sufficient. In Scenario D3, a cycle exists (P1-R2-P2-R1-P1), but process P3 finishes, releases an instance of R1, and breaks the dependency chain without deadlock!',
  },
  {
    id: 'v5',
    topic: 'Deadlock Prevention',
    prompt: 'How does Havender’s Linear Resource Ordering scheme eliminate circular wait?',
    options: [
      'By forcing every process to hold all resources at boot time.',
      'By assigning numbers to resources and requiring requests to follow strictly increasing rank, making a cycle of dependencies impossible.',
      'By aborting the newest process when locks collide.',
      'By converting all resources into shareable read-only caches.',
    ],
    correctIndex: 1,
    explanation:
      'If resources are ordered R1 < R2 < ... < Rm and a process holding Rk can only request Rj where j > k, then in any chain of processes, the resource indices must strictly increase. A circular chain would require an index to be strictly greater than itself, which is a mathematical contradiction.',
  },
];

export const VivaModePanel: React.FC = () => {
  const [currentIdx, setCurrentIdx] = React.useState(0);
  const [selectedOption, setSelectedOption] = React.useState<number | null>(null);
  const [revealed, setRevealed] = React.useState(false);
  const [score, setScore] = React.useState(0);
  const [answeredCount, setAnsweredCount] = React.useState(0);

  const currentQ = VIVA_QUESTIONS[currentIdx];

  const handleSelectOption = (idx: number) => {
    if (revealed) return;
    setSelectedOption(idx);
  };

  const handleReveal = () => {
    if (revealed || selectedOption === null) return;
    setRevealed(true);
    setAnsweredCount((prev) => prev + 1);
    if (selectedOption === currentQ.correctIndex) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    setRevealed(false);
    setSelectedOption(null);
    setCurrentIdx((prev) => (prev + 1) % VIVA_QUESTIONS.length);
  };

  return (
    <div className="bg-slate-900/95 border-2 border-amber-500/50 rounded-2xl p-5 shadow-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              Viva Mode Active: Assessment Practice
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 font-mono">
                Interactive Drill
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Answers and Work vectors hidden until revealed. Test your prediction speed!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">Score:</span>
          <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-500/40 text-amber-300 font-bold">
            {score} / {answeredCount}
          </span>
        </div>
      </div>

      {/* Question Card */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono text-amber-400 font-semibold">
            Question {currentIdx + 1} of {VIVA_QUESTIONS.length} &bull; {currentQ.topic}
          </span>
        </div>

        <p className="text-sm font-semibold text-slate-100 leading-relaxed">
          {currentQ.prompt}
        </p>

        {/* Options */}
        <div className="space-y-2 pt-2">
          {currentQ.options.map((opt, optIdx) => {
            const isSelected = selectedOption === optIdx;
            const isCorrect = currentQ.correctIndex === optIdx;

            let btnStyle = 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850';
            if (isSelected && !revealed) {
              btnStyle = 'bg-blue-950/80 border-blue-500 text-blue-200';
            }
            if (revealed) {
              if (isCorrect) {
                btnStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-200 font-semibold';
              } else if (isSelected) {
                btnStyle = 'bg-red-950/80 border-red-500 text-red-200 line-through';
              }
            }

            return (
              <button
                key={optIdx}
                onClick={() => handleSelectOption(optIdx)}
                className={`w-full text-left p-3 rounded-lg border text-xs transition-all flex items-start gap-2.5 cursor-pointer ${btnStyle}`}
              >
                <span className="font-mono font-bold text-slate-400 shrink-0">
                  {String.fromCharCode(65 + optIdx)}.
                </span>
                <span className="leading-relaxed">{opt}</span>
              </button>
            );
          })}
        </div>

        {/* Reveal Explanation Banner */}
        {revealed && (
          <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-700 text-xs space-y-1.5 animate-in fade-in duration-200">
            <div className="flex items-center gap-1.5 font-bold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Viva Explanation &amp; Rationale:</span>
            </div>
            <p className="text-slate-300 leading-relaxed font-sans">
              {currentQ.explanation}
            </p>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={handleReveal}
          disabled={selectedOption === null || revealed}
          className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" />
          Reveal Answer &amp; Explanation
        </button>

        <button
          onClick={handleNext}
          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 cursor-pointer border border-slate-700"
        >
          <span>Next Challenge</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
