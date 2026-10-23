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

export const TestLabTab: React.FC<TestLabTabProps> = ({ onLoadScenario }) => {
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
    <div className="space-y-4">
      {/* Header and Benchmark Banner */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 text-white p-4 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-2xs">
              <FlaskConical className="w-4 h-4" />
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-white font-sans tracking-tight">
              Algorithmic Verification Test Lab (TC1 &ndash; TC6)
            </h3>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-md font-sans font-bold border ${
                allPassed
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                  : 'bg-rose-950 text-rose-300 border-rose-700'
              }`}
            >
              {passCount} / {testResults.length} Tests Passing
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 font-sans">
            Automated test suite verifying dynamic avoidance, Wait-For Graph reduction, and state rollback invariants.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRunAll}
            disabled={isRunning}
            className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-sans font-bold text-xs sm:text-sm flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
          >
            <Play className="w-4 h-4" />
            <span>{isRunning ? 'Running Engine...' : 'Run All Tests'}</span>
          </button>

          <button
            onClick={handleCopyTable}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs sm:text-sm font-sans font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
          >
            <Copy className="w-3.5 h-3.5 text-slate-400" />
            <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs sm:text-sm font-sans font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Dynamic Results Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-left text-xs sm:text-sm border-collapse font-mono">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-white font-mono text-xs uppercase tracking-wider">
                <th className="py-3.5 px-3.5 w-1/6 font-bold">Test ID</th>
                <th className="py-3.5 px-3.5 w-1/6 font-bold">System Condition</th>
                <th className="py-3.5 px-3.5 w-1/6 font-bold">Actual Result (Engine)</th>
                <th className="py-3.5 px-3.5 w-1/6 font-bold">Expected Result</th>
                <th className="py-3.5 px-3.5 w-1/6 text-center font-bold">Status</th>
                <th className="py-3.5 px-3.5 w-1/6 font-bold">Analysis / Conclusion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {testResults.map((tc) => (
                <tr key={tc.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-3.5 align-top font-mono font-bold text-indigo-700 break-words">
                    <div className="text-sm">{tc.id}</div>
                    <div className="text-xs text-slate-500 font-sans font-normal mt-0.5">{tc.name}</div>
                  </td>

                  <td className="py-3.5 px-3.5 align-top text-slate-800 font-mono text-xs leading-relaxed font-semibold break-words">
                    {tc.condition}
                  </td>

                  <td className="py-3.5 px-3.5 align-top break-words">
                    <div className="mb-1.5">
                      <StatusBadge status={tc.actualStatus} size="sm" />
                    </div>
                    <span className="text-xs text-slate-900 font-bold block leading-relaxed">
                      {tc.actualDetail}
                    </span>
                  </td>

                  <td className="py-3.5 px-3.5 align-top break-words">
                    <span className="text-xs font-bold text-slate-800 block leading-relaxed">
                      &ldquo;{tc.expectedDetail}&rdquo;
                    </span>
                    <span className="text-xs font-mono text-slate-500 font-semibold block mt-1">
                      State: {tc.expectedStatus}
                    </span>
                  </td>

                  <td className="py-3.5 px-3.5 align-top text-center">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md font-bold font-mono text-xs shadow-2xs ${
                        tc.passed
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-rose-100 text-rose-900 border border-rose-300'
                      }`}
                    >
                      {tc.passed ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> PASS
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-rose-600" /> FAIL
                        </>
                      )}
                    </span>
                  </td>

                  <td className="py-3.5 px-3.5 align-top text-slate-700 text-xs font-sans leading-relaxed break-words">
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
