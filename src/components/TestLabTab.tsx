import React from 'react';
import {
  FlaskConical,
  Play,
  Download,
  Copy,
  Printer,
  CheckCircle2,
  XCircle,
  FileText,
  ExternalLink,
  Sparkles,
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

  const exportCSV = () => {
    const headers = ['Test Case', 'System Condition', 'Actual Result', 'Expected Result', 'Pass/Fail', 'Analysis'];
    const rows = testResults.map((t) => [
      t.id,
      `"${t.condition.replace(/"/g, '""')}"`,
      `"${t.actualDetail.replace(/"/g, '""')}"`,
      `"${t.expectedDetail.replace(/"/g, '""')}"`,
      t.passed ? 'PASS' : 'FAIL',
      `"${t.analysis.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `DeadlockLab_Test_Suite_TC1_TC6_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportJSON = () => {
    const jsonStr = JSON.stringify(testResults, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `DeadlockLab_Test_Suite_TC1_TC6_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-1.5 rounded-md bg-blue-500/20 text-blue-400">
              <FlaskConical className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Verification Test Lab (TC1 &ndash; TC6)
            </h3>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold font-mono border ${
                allPassed
                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/50'
                  : 'bg-red-950/80 text-red-400 border-red-500/50'
              }`}
            >
              {passCount} / {testResults.length} Tests Passing
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Automated test runner testing engine invariants against all OS assignment specification requirements.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRunAll}
            disabled={isRunning}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md hover:shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            {isRunning ? 'Executing Engine...' : 'Run All Tests'}
          </button>

          <button
            onClick={handleCopyTable}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            {copied ? 'Copied!' : 'Copy Table'}
          </button>

          <button
            onClick={exportCSV}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>

          <button
            onClick={exportJSON}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            JSON
          </button>

          <button
            onClick={handlePrint}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print View
          </button>
        </div>
      </div>

      {/* Dynamic Results Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3 w-16">Test ID</th>
                <th className="py-3 px-3 w-48">System Condition</th>
                <th className="py-3 px-3 w-56">Actual Result (Engine)</th>
                <th className="py-3 px-3 w-48">Expected Result</th>
                <th className="py-3 px-3 w-28 text-center">Status</th>
                <th className="py-3 px-3">Analysis / Conclusion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {testResults.map((tc) => (
                <tr key={tc.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-blue-300">
                    <div>{tc.id}</div>
                    <div className="text-[10px] text-slate-400 font-sans font-normal">{tc.name}</div>
                  </td>

                  <td className="py-3 px-3 text-slate-300 font-mono text-[11px] leading-relaxed">
                    {tc.condition}
                  </td>

                  <td className="py-3 px-3">
                    <div className="mb-1">
                      <StatusBadge status={tc.actualStatus} size="sm" />
                    </div>
                    <span className="text-[11px] text-slate-200 font-medium block">
                      {tc.actualDetail}
                    </span>
                  </td>

                  <td className="py-3 px-3">
                    <span className="text-[11px] font-semibold text-slate-300 block">
                      &ldquo;{tc.expectedDetail}&rdquo;
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      State: {tc.expectedStatus}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold font-mono text-xs ${
                        tc.passed
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/50'
                          : 'bg-red-950/80 text-red-400 border border-red-500/50'
                      }`}
                    >
                      {tc.passed ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" /> PASS
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5" /> FAIL
                        </>
                      )}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-slate-300 text-[11px] leading-relaxed">
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
