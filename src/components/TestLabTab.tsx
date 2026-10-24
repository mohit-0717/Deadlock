import React from 'react';
import {
  FlaskConical,
  Play,
  Copy,
  Printer,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { TestCaseResult } from '../engine/types.js';
import { runAllTestCases } from '../engine/scenarios.js';
import { StatusBadge } from './StatusBadge.js';

interface TestLabTabProps {
  onLoadScenario?: (scenarioId: string) => void;
}

export const TestLabTab: React.FC<TestLabTabProps> = () => {
  const [testResults, setTestResults] = React.useState<TestCaseResult[]>(() => runAllTestCases());
  const [isRunning, setIsRunning] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const handleRunAll = () => {
    setIsRunning(true);
    setTimeout(() => {
      const results = runAllTestCases();
      setTestResults(results);
      setIsRunning(false);
    }, 250);
  };

  const allPassed = testResults.every((t) => t.passed);
  const passCount = testResults.filter((t) => t.passed).length;

  const handleCopyTable = () => {
    const text = testResults
      .map(
        (t) =>
          `${t.id} (${t.name}): [${t.passed ? 'PASS' : 'FAIL'}]\nCondition: ${t.condition}\nActual: ${t.actualDetail}\nExpected: ${t.expectedDetail}\nAnalysis: ${t.analysis}\n`
      )
      .join('\n---\n');

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header and Benchmark Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">
              Algorithm Verification Suite (TC1 &ndash; TC6)
            </h2>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                allPassed
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-rose-50 text-rose-800 border-rose-300'
              }`}
            >
              {passCount} / {testResults.length} Tests Passing
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl">
            Automated regression and verification test suite confirming Banker&apos;s Avoidance invariants, Wait-For Graph reduction, and rollback semantics.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRunAll}
            disabled={isRunning}
            className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{isRunning ? 'Running Tests...' : 'Run All Tests'}</span>
          </button>

          <button
            onClick={handleCopyTable}
            className="px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-slate-500" />
            <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Dynamic Results Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-mono text-xs uppercase tracking-wider">
                <th className="py-3 px-3.5 w-1/6 font-bold">Test ID</th>
                <th className="py-3 px-3.5 w-1/6 font-bold">System Condition</th>
                <th className="py-3 px-3.5 w-1/6 font-bold">Actual Result</th>
                <th className="py-3 px-3.5 w-1/6 font-bold">Expected Result</th>
                <th className="py-3 px-3.5 w-1/6 text-center font-bold">Status</th>
                <th className="py-3 px-3.5 w-1/6 font-bold">Analysis / Conclusion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {testResults.map((tc) => (
                <tr key={tc.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3.5 align-top font-mono font-bold text-indigo-700 break-words">
                    <div className="text-xs">{tc.id}</div>
                    <div className="text-[11px] text-slate-500 font-sans font-normal mt-0.5">{tc.name}</div>
                  </td>

                  <td className="py-3 px-3.5 align-top text-slate-800 font-mono text-xs leading-relaxed font-semibold break-words">
                    {tc.condition}
                  </td>

                  <td className="py-3 px-3.5 align-top break-words">
                    <div className="mb-1">
                      <StatusBadge status={tc.actualStatus} size="sm" />
                    </div>
                    <span className="text-xs text-slate-900 font-bold block leading-relaxed">
                      {tc.actualDetail}
                    </span>
                  </td>

                  <td className="py-3 px-3.5 align-top break-words">
                    <span className="text-xs font-bold text-slate-800 block leading-relaxed">
                      &ldquo;{tc.expectedDetail}&rdquo;
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 font-semibold block mt-1">
                      State: {tc.expectedStatus}
                    </span>
                  </td>

                  <td className="py-3 px-3.5 align-top text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded font-bold font-mono text-xs ${
                        tc.passed
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-rose-100 text-rose-900 border border-rose-300'
                      }`}
                    >
                      {tc.passed ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> PASS
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-rose-600" /> FAIL
                        </>
                      )}
                    </span>
                  </td>

                  <td className="py-3 px-3.5 align-top text-slate-700 text-xs font-sans leading-relaxed break-words">
                    {tc.analysis}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
