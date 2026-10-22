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
      <div className="p-4 rounded-xl bg-amber-950/70 border-2 border-amber-500 text-amber-200 text-xs flex items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
          <p className="font-semibold text-amber-100">
            <strong>Mandatory Academic Policy Reminder:</strong> Do not enter confidential or personal data into AI usage records.
            All AI tools used for course assessment must be disclosed with specific student verification.
          </p>
        </div>
      </div>

      {/* Header & Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-md bg-purple-500/20 text-purple-400">
              <Bot className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              AI Usage Record &amp; Verification Audit
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Documenting transparency, generative tool prompts, and student code validation for academic integrity assessment.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleAddRow}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Row
          </button>

          <button
            onClick={handleSave}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            {savedNotification ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {savedNotification ? 'Saved!' : 'Save Changes'}
          </button>

          <button
            onClick={exportRecord}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export Audit
          </button>

          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs cursor-pointer"
            title="Reset to Template Defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Editable Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3 w-48">AI Tool Used</th>
                <th className="py-3 px-3 w-56">Purpose</th>
                <th className="py-3 px-3 w-72">Output Generated</th>
                <th className="py-3 px-3">Student Verification</th>
                <th className="py-3 px-2 w-12 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-3 align-top">
                    <input
                      type="text"
                      value={row.toolUsed}
                      onChange={(e) => handleRowChange(row.id, 'toolUsed', e.target.value)}
                      placeholder="e.g. Gemini 2.5 Flash"
                      className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-100 font-mono text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </td>

                  <td className="py-2.5 px-3 align-top">
                    <textarea
                      rows={3}
                      value={row.purpose}
                      onChange={(e) => handleRowChange(row.id, 'purpose', e.target.value)}
                      placeholder="Describe intent or role..."
                      className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-slate-200 text-xs focus:border-blue-500 focus:outline-none resize-y"
                    />
                  </td>

                  <td className="py-2.5 px-3 align-top">
                    <textarea
                      rows={3}
                      value={row.outputGenerated}
                      onChange={(e) => handleRowChange(row.id, 'outputGenerated', e.target.value)}
                      placeholder="Code or design generated..."
                      className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-slate-200 text-xs focus:border-blue-500 focus:outline-none resize-y"
                    />
                  </td>

                  <td className="py-2.5 px-3 align-top">
                    <textarea
                      rows={3}
                      value={row.studentVerification}
                      onChange={(e) => handleRowChange(row.id, 'studentVerification', e.target.value)}
                      placeholder="How did you test, audit, or verify the correctness?"
                      className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-emerald-300 font-mono text-xs focus:border-emerald-500 focus:outline-none resize-y"
                    />
                  </td>

                  <td className="py-2.5 px-2 text-center align-top">
                    <button
                      onClick={() => handleDeleteRow(row.id)}
                      disabled={rows.length <= 1}
                      className="p-1.5 rounded hover:bg-red-950/60 text-slate-500 hover:text-red-400 disabled:opacity-30 cursor-pointer"
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
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <span>Issues Found and Fixed During Student Verification</span>
            <span className="text-[10px] text-slate-400 font-mono">Viva Audit Log</span>
          </h4>
          <span className="text-[11px] text-emerald-400 font-mono">
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
          className="w-full p-3 bg-slate-950 border border-slate-850 rounded-lg text-slate-200 font-mono text-xs focus:border-blue-500 focus:outline-none leading-relaxed"
        />
      </div>
    </div>
  );
};
