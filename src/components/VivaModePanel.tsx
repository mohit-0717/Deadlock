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
    <div className="bg-white border border-amber-200 rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 font-sans tracking-tight">
                Viva Assessment Drill &bull; Interactive Oral Exam Mode
              </h3>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 font-sans font-semibold border border-amber-200">
                Drill Mode
              </span>
            </div>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              Work vectors and step outcomes are hidden. Predict the next algorithmic state before revealing!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-sans">
          <span className="text-slate-500 font-medium">Score:</span>
          <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-300 text-amber-900 font-bold font-mono shadow-2xs">
            {score} / {answeredCount}
          </span>
        </div>
      </div>

      {/* Question Card */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="font-mono text-amber-800 font-bold">
            Question {currentIdx + 1} of {VIVA_QUESTIONS.length} &bull; {currentQ.topic}
          </span>
        </div>

        <p className="text-sm font-bold text-slate-900 leading-relaxed font-sans">
          {currentQ.prompt}
        </p>

        {/* Options */}
        <div className="space-y-2 pt-2">
          {currentQ.options.map((opt, optIdx) => {
            const isSelected = selectedOption === optIdx;
            const isCorrect = currentQ.correctIndex === optIdx;

            let btnStyle = 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs';
            if (isSelected && !revealed) {
              btnStyle = 'bg-indigo-50 border-indigo-400 text-indigo-900 font-semibold shadow-xs';
            }
            if (revealed) {
              if (isCorrect) {
                btnStyle = 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold shadow-xs';
              } else if (isSelected) {
                btnStyle = 'bg-rose-50 border-rose-300 text-rose-800 line-through opacity-80';
              }
            }

            return (
              <button
                key={optIdx}
                onClick={() => handleSelectOption(optIdx)}
                className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-start gap-2.5 cursor-pointer ${btnStyle}`}
              >
                <span className="font-mono font-bold text-slate-500 shrink-0">
                  {String.fromCharCode(65 + optIdx)}.
                </span>
                <span className="leading-relaxed font-sans">{opt}</span>
              </button>
            );
          })}
        </div>

        {/* Reveal Explanation Banner */}
        {revealed && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs space-y-1.5 animate-in fade-in duration-200">
            <div className="flex items-center gap-1.5 font-bold text-emerald-800 font-mono">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Viva Explanation &amp; Rationale:</span>
            </div>
            <p className="text-slate-700 leading-relaxed font-sans">
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
          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
        >
          <Eye className="w-3.5 h-3.5" />
          Reveal Answer &amp; Explanation
        </button>

        <button
          onClick={handleNext}
          className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center gap-1.5 cursor-pointer border border-slate-300 shadow-2xs transition-all"
        >
          <span>Next Challenge</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
