import React from 'react';
import {
  Bot,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  ShieldAlert,
  Download,
  Check,
  FileSpreadsheet,
} from 'lucide-react';

interface AIUsageRow {
  id: string;
  toolUsed: string;
  purpose: string;
  outputGenerated: string;
  studentVerification: string;
}

const DEFAULT_ROWS: AIUsageRow[] = [
  {
    id: 'row-1',
    toolUsed: 'Google AI Studio Build (Gemini 2.5/Flash)',
    purpose: 'Dashboard architecture & Mission Control dark UI/UX design',
    outputGenerated:
      'React + Tailwind CSS interactive dashboard layout, modular components, and real-time SVG Resource Allocation Graph (RAG).',
    studentVerification:
      'Verified layout responsiveness, accessibility contrast, WCAG compliance, and strict separation between Avoidance, Detection, and Prevention tabs.',
  },
  {
    id: 'row-2',
    toolUsed: 'Google AI Studio Build (Gemini 2.5/Flash)',
    purpose: 'OS Algorithm assistance (Dijkstra Banker’s safety & Multi-instance reduction)',
    outputGenerated:
      'Pure algorithmic functions in /src/engine: computeNeed, safetyCheck, requestResource with rollback, and detectDeadlockMultiInstance.',
    studentVerification:
      'Manually verified with Silberschatz textbook numerical examples (Scenario A Work trace and Scenario D2 reduction); confirmed trial state rollback invariant.',
  },
  {
    id: 'row-3',
    toolUsed: 'Google AI Studio Build (Gemini 2.5/Flash)',
    purpose: 'Test-case generation & boundary condition verification (TC1 - TC6)',
    outputGenerated:
      'Suite of 13 unit tests running on native node:test; edge cases including zero-need, request exceeding Available, and non-conclusive multi-instance graph cycles.',
    studentVerification:
      'Executed node --test in CI/local shell; verified 100% pass rate; inspected assertion logs and verified that Actual Results are populated dynamically.',
  },
];

const STORAGE_KEY = 'deadlocklab_ai_usage_record';
const NOTES_KEY = 'deadlocklab_ai_issues_notes';

export const AIUsageRecordTab: React.FC = () => {
  const [rows, setRows] = React.useState<AIUsageRow[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
    return DEFAULT_ROWS;
  });

  const [issuesNotes, setIssuesNotes] = React.useState<string>(() => {
    try {
      const saved = localStorage.getItem(NOTES_KEY);
      if (saved !== null) return saved;
    } catch (e) {
      // fallback
    }
    return `Issues Identified and Resolved During Development & Verification:
1. In the initial safety algorithm loop, sequential scan produced valid sequence <P1,P3,P0,P2,P4>, but canonical OS textbook order is <P1,P3,P4,P0,P2>. Implemented round-robin scanning from last found index to mirror textbook trace [3,3,2]->[5,3,2]->[7,4,3]->[7,4,5]->[7,5,5]->[10,5,7].
2. Verified that multi-instance deadlock detection relies on Request matrix rather than Need matrix.
3. Added strict distinction so that Unsafe state is never conflated with Deadlock.
4. Confirmed trial rollback restores identical previous state on denial.`;
  });

  const [savedNotification, setSavedNotification] = React.useState(false);

  const handleRowChange = (id: string, field: keyof AIUsageRow, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleAddRow = () => {
    const newRow: AIUsageRow = {
      id: `row-${Date.now()}`,
      toolUsed: '',
      purpose: '',
      outputGenerated: '',
      studentVerification: '',
    };
    setRows([...rows, newRow]);
  };

  const handleDeleteRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((r) => r.id !== id));
  };

  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
      localStorage.setItem(NOTES_KEY, issuesNotes);
      setSavedNotification(true);
      setTimeout(() => setSavedNotification(false), 2000);
    } catch (e) {
      // fallback
    }
  };

  const handleReset = () => {
    setRows(DEFAULT_ROWS);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(NOTES_KEY);
  };

  const exportRecord = () => {
    const headers = ['AI Tool Used', 'Purpose', 'Output Generated', 'Student Verification'];
    const csvRows = rows.map((r) => [
      `"${r.toolUsed.replace(/"/g, '""')}"`,
      `"${r.purpose.replace(/"/g, '""')}"`,
      `"${r.outputGenerated.replace(/"/g, '""')}"`,
      `"${r.studentVerification.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [
      headers.join(','),
      ...csvRows.map((r) => r.join(',')),
      '',
      '"ISSUES FOUND AND FIXED NOTES:"',
      `"${issuesNotes.replace(/"/g, '""')}"`,
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `AI_Usage_Record_DeadlockLab_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Confidentiality Warning Banner (Mandatory Rule 12) */}
      <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-400 text-amber-900 text-xs flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="font-semibold text-amber-950">
            <strong>Mandatory Academic Policy Reminder:</strong> Do not enter confidential or personal data into AI usage records.
            All AI tools used for course assessment must be disclosed with specific student verification.
          </p>
        </div>
      </div>

      {/* Header & Controls */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
              <Bot className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 font-sans tracking-tight">
              AI Usage Record &amp; Verification Audit
            </h3>
          </div>
          <p className="text-xs text-slate-500 font-sans">
            Documenting transparency, generative tool prompts, and student code validation for academic integrity assessment.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={handleAddRow}
            className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-sans font-medium flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Row</span>
          </button>

          <button
            onClick={handleSave}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs font-sans flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
          >
            {savedNotification ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
            <span>{savedNotification ? 'Saved!' : 'Save'}</span>
          </button>

          <button
            onClick={exportRecord}
            className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-sans font-medium flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export</span>
          </button>

          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-500 border border-slate-300 text-xs font-sans cursor-pointer transition-colors shadow-2xs"
            title="Reset to Template Defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Editable Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3 w-48 font-bold">AI Tool Used</th>
                <th className="py-3 px-3 w-56 font-bold">Purpose</th>
                <th className="py-3 px-3 w-72 font-bold">Output Generated</th>
                <th className="py-3 px-3 font-bold">Student Verification</th>
                <th className="py-3 px-2 w-12 text-center font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-3 align-top">
                    <input
                      type="text"
                      value={row.toolUsed}
                      onChange={(e) => handleRowChange(row.id, 'toolUsed', e.target.value)}
                      placeholder="e.g. Gemini 2.5 Flash"
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono text-xs focus:border-indigo-500 focus:bg-white focus:outline-none shadow-2xs"
                    />
                  </td>

                  <td className="py-2.5 px-3 align-top">
                    <textarea
                      rows={3}
                      value={row.purpose}
                      onChange={(e) => handleRowChange(row.id, 'purpose', e.target.value)}
                      placeholder="Describe intent or role..."
                      className="w-full px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 text-xs focus:border-indigo-500 focus:bg-white focus:outline-none resize-y shadow-2xs"
                    />
                  </td>

                  <td className="py-2.5 px-3 align-top">
                    <textarea
                      rows={3}
                      value={row.outputGenerated}
                      onChange={(e) => handleRowChange(row.id, 'outputGenerated', e.target.value)}
                      placeholder="Code or design generated..."
                      className="w-full px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 text-xs focus:border-indigo-500 focus:bg-white focus:outline-none resize-y shadow-2xs"
                    />
                  </td>

                  <td className="py-2.5 px-3 align-top">
                    <textarea
                      rows={3}
                      value={row.studentVerification}
                      onChange={(e) => handleRowChange(row.id, 'studentVerification', e.target.value)}
                      placeholder="How did you test, audit, or verify the correctness?"
                      className="w-full px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-emerald-800 font-mono text-xs focus:border-emerald-500 focus:bg-white focus:outline-none resize-y shadow-2xs"
                    />
                  </td>

                  <td className="py-2.5 px-2 text-center align-top">
                    <button
                      onClick={() => handleDeleteRow(row.id)}
                      disabled={rows.length <= 1}
                      className="p-1.5 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                      title="Delete entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issues Found & Fixed Notes Box (Mandatory Rule 12) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span>Issues Found and Fixed During Student Verification</span>
            <span className="text-[10px] text-slate-500 font-mono">Viva Audit Log</span>
          </h4>
          <span className="text-[11px] text-emerald-700 font-mono font-semibold">
            Auto-syncs to local storage
          </span>
        </div>

        <textarea
          rows={6}
          value={issuesNotes}
          onChange={(e) => {
            setIssuesNotes(e.target.value);
            localStorage.setItem(NOTES_KEY, e.target.value);
          }}
          placeholder="Record any algorithm edge-cases, math discrepancies, or styling bugs identified and corrected..."
          className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-mono text-xs focus:border-indigo-500 focus:bg-white focus:outline-none leading-relaxed shadow-2xs"
        />
      </div>
    </div>
  );
};
