import React from 'react';
import {
  BookOpen,
  Award,
  ShieldCheck,
  CheckCircle2,
  Code2,
  Lightbulb,
  ExternalLink,
} from 'lucide-react';
import { VivaModePanel } from './VivaModePanel.js';

export const VivaTab: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Interactive Viva Drill */}
      <VivaModePanel />

      {/* Comprehensive Academic Concept Guide */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-sans tracking-tight">
              OS Viva &amp; Oral Exam Technical Guide
            </h3>
            <p className="text-xs text-slate-500 font-sans">
              Formal mathematical invariants, textbook citations (Silberschatz/Galvin/Gagne), and oral exam talking points.
            </p>
          </div>
        </div>

        {/* Algorithm Mapping Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
          {/* Avoidance Invariant */}
          <div className="p-3.5 rounded-lg bg-slate-50/70 border border-slate-200 space-y-2">
            <h4 className="font-bold text-emerald-900 flex items-center gap-1.5 font-sans">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              1. Banker&apos;s Avoidance Algorithm
            </h4>
            <p className="text-slate-700 leading-relaxed font-sans">
              <strong>Invariant:</strong> The system maintains the guarantee that at least one process can finish with currently available resources, and upon releasing its allocation, another process can finish, until all finish.
            </p>
            <div className="font-mono text-[11px] bg-white border border-slate-200 p-2.5 rounded-md text-slate-800 space-y-0.5 shadow-2xs">
              <div>Need[i][j] = Max[i][j] - Allocation[i][j]</div>
              <div>Safety Check Condition: Need[i] &le; Work</div>
              <div>Post-Execution Work Update: Work &larr; Work + Allocation[i]</div>
            </div>
            <p className="text-[11px] text-slate-600 font-sans">
              <strong>Viva Question:</strong> &ldquo;Can an unsafe state avoid deadlock?&rdquo; &rarr; <em>Yes!</em> Because processes rarely require their maximum claim all at once. An unsafe state only means the OS can no longer guarantee avoidance under worst-case peak demand.
            </p>
          </div>

          {/* Detection Invariant */}
          <div className="p-3.5 rounded-lg bg-slate-50/70 border border-slate-200 space-y-2">
            <h4 className="font-bold text-rose-900 flex items-center gap-1.5 font-sans">
              <CheckCircle2 className="w-4 h-4 text-rose-600" />
              2. Multi-Instance Deadlock Detection Algorithm
            </h4>
            <p className="text-slate-700 leading-relaxed font-sans">
              <strong>Invariant:</strong> Operates directly on the <em>Request matrix</em> rather than the Need matrix. Initializes Finish[i] = true for processes with zero allocation (they hold no locks).
            </p>
            <div className="font-mono text-[11px] bg-white border border-slate-200 p-2.5 rounded-lg text-slate-800 space-y-0.5 shadow-2xs">
              <div>Work = Available</div>
              <div>Finish[i] = (Allocation[i] == 0) ? true : false</div>
              <div>Scan for: Finish[i] == false &amp;&amp; Request[i] &le; Work</div>
            </div>
            <p className="text-[11px] text-slate-600 font-sans">
              <strong>Viva Question:</strong> &ldquo;Why isn&apos;t a cycle conclusive in multi-instance graphs?&rdquo; &rarr; Because a process outside the cycle can finish and release multiple instances, satisfying one of the nodes in the cycle and breaking it.
            </p>
          </div>

          {/* Havender Scheme */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-2">
            <h4 className="font-bold text-purple-800 flex items-center gap-1.5 font-mono">
              <Lightbulb className="w-4 h-4 text-purple-600" />
              3. Havender&apos;s Linear Resource Ordering (Prevention)
            </h4>
            <p className="text-slate-700 leading-relaxed font-sans">
              <strong>Invariant:</strong> Assigns an injective function <code className="text-purple-700 font-bold font-mono">F: R &rarr; N</code>. A process holding <code className="text-purple-700 font-bold font-mono">Ri</code> may only request <code className="text-purple-700 font-bold font-mono">Rj</code> if <code className="text-purple-700 font-bold font-mono">F(Rj) &gt; F(Ri)</code>.
            </p>
            <p className="text-slate-600 text-[11px] font-sans">
              <strong>Proof Sketch:</strong> Suppose a circular wait exists: <code className="text-purple-700 font-bold font-mono">P0 &rarr; P1 &rarr; ... &rarr; Pk &rarr; P0</code>.
              Then <code className="text-purple-700 font-bold font-mono">F(R0) &lt; F(R1) &lt; ... &lt; F(Rk) &lt; F(R0)</code>, which implies <code className="text-purple-700 font-bold font-mono">F(R0) &lt; F(R0)</code>.
              Contradiction! Hence no circular wait can ever form.
            </p>
          </div>

          {/* Coffman Conditions */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-2">
            <h4 className="font-bold text-blue-800 flex items-center gap-1.5 font-mono">
              <Code2 className="w-4 h-4 text-blue-600" />
              4. The 4 Coffman Conditions (1971)
            </h4>
            <ol className="list-decimal list-inside text-slate-700 space-y-1 text-[11px] font-sans">
              <li><strong>Mutual Exclusion:</strong> &ge; 1 resource held in a non-shareable mode.</li>
              <li><strong>Hold and Wait:</strong> Process holds &ge; 1 resource while waiting for others.</li>
              <li><strong>No Preemption:</strong> Resources can only be released voluntarily.</li>
              <li><strong>Circular Wait:</strong> Set &#123;P0..Pn&#125; where P0 waits for P1, ..., Pn waits for P0.</li>
            </ol>
            <p className="text-[11px] text-slate-600 mt-1 font-sans">
              Eliminating any single condition guarantees deadlock cannot form.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
