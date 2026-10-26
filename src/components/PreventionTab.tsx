import React from 'react';
import {
  Shield,
  Layers,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  DoorOpen,
  RotateCcw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  evaluateOrderingRanks,
  evaluateAllAtOnceAdmission,
  getPreventionMetrics,
  RankOrderingResult,
  AllAtOnceAdmissionResult,
} from '../engine/prevention.js';

interface PreventionTabProps {
  speed?: number;
  reduceMotion?: boolean;
}

export const PreventionTab: React.FC<PreventionTabProps> = () => {
  // 1. Interactive Fixed Ordering policy state (Havender Linear Ordering with user-editable ranks)
  const [heldRankInput, setHeldRankInput] = React.useState<string>('2');
  const [requestedRankInput, setRequestedRankInput] = React.useState<string>('1');

  const rankResult = React.useMemo<RankOrderingResult>(() => {
    return evaluateOrderingRanks(heldRankInput, requestedRankInput);
  }, [heldRankInput, requestedRankInput]);

  // 2. Interactive Request-All-At-Once Admission Gate state (user-editable Demand & Available Pool)
  const [demandInputs, setDemandInputs] = React.useState<string[]>(['2', '2', '2']);
  const [availInputs, setAvailInputs] = React.useState<string[]>(['1', '2', '1']);

  const gateResult = React.useMemo<AllAtOnceAdmissionResult>(() => {
    return evaluateAllAtOnceAdmission(demandInputs, availInputs, ['A', 'B', 'C']);
  }, [demandInputs, availInputs]);

  // 3. Trade-off chart view: 'separate' (distinct axes & sub-charts) vs 'normalized' (0-100% index)
  const [chartView, setChartView] = React.useState<'separate' | 'normalized'>('separate');

  const metrics = React.useMemo(() => getPreventionMetrics(), []);

  const chartData = React.useMemo(() => {
    return [
      {
        name: 'No Prevention',
        utilization: 88,
        concurrency: 4.8,
        waitTime: 2.1,
        // Normalized 0-100% index values for comparative unified view
        concurrencyNorm: Math.round((4.8 / 5) * 100), // 96% of 5-process peak
        waitTimeNorm: Math.round((2.1 / 10) * 100),    // 21% of 10-tick delay ceiling
      },
      {
        name: 'Fixed Ordering',
        utilization: 74,
        concurrency: 3.9,
        waitTime: 3.8,
        concurrencyNorm: Math.round((3.9 / 5) * 100), // 78% of 5-process peak
        waitTimeNorm: Math.round((3.8 / 10) * 100),    // 38% of 10-tick delay ceiling
      },
      {
        name: 'Request All At Once',
        utilization: 49,
        concurrency: 2.2,
        waitTime: 7.4,
        concurrencyNorm: Math.round((2.2 / 5) * 100), // 44% of 5-process peak
        waitTimeNorm: Math.round((7.4 / 10) * 100),    // 74% of 10-tick delay ceiling
      },
    ];
  }, []);

  return (
    <div className="space-y-6">
      {/* 1. Academic Overview Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-slate-900">
            Deadlock Prevention (Havender Principles)
          </h2>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            Coffman Conditions
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1 max-w-3xl">
          Unlike <strong>Avoidance</strong> (which pre-tests states dynamically) or <strong>Detection</strong> (which finds existing cycles),
          <strong> Deadlock Prevention</strong> guarantees that deadlock is structurally impossible by permanently invalidating at least one of the four Coffman conditions (Hold &amp; Wait, Circular Wait, Mutual Exclusion, No Preemption).
        </p>
      </div>

      {/* 2. Prevention Techniques Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Technique 1: Fixed Resource Ordering */}
        <div className="rounded-xl shadow-2xs border border-slate-200 bg-white overflow-hidden flex flex-col justify-between">
          <div>
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  1. Havender Fixed Resource Ordering
                </h4>
                <span className="text-xs text-slate-500">
                  Eliminates Condition #4: Circular Wait
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Rule: R_req &gt; R_held
              </span>
            </div>

            <div className="p-4 space-y-3.5">
              <p className="text-xs text-slate-600 leading-relaxed">
                Resources are assigned a global numbering rank. A process holding resource <code className="text-indigo-800 font-bold">R_held</code> can only request <code className="text-indigo-800 font-bold">R_req</code> if rank(<code className="text-indigo-800 font-bold">R_req</code>) &gt; rank(<code className="text-indigo-800 font-bold">R_held</code>). This mathematically guarantees no circular wait can form.
              </p>

              {/* Interactive Tester */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 block text-xs">
                    Interactive Ordering Verification:
                  </span>
                  <button
                    onClick={() => {
                      setHeldRankInput('2');
                      setRequestedRankInput('1');
                    }}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer flex items-center gap-1"
                    title="Restore demo values (Held: 2, Requested: 1)"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Defaults</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
                  <div className="space-y-1">
                    <label className="block text-slate-600 font-semibold text-xs">
                      Currently Held Resource Rank:
                    </label>
                    <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-lg border border-slate-300 focus-within:border-indigo-500 shadow-2xs">
                      <span className="text-xs font-mono font-bold text-indigo-700 px-1">Rank</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={heldRankInput}
                        onChange={(e) => setHeldRankInput(e.target.value)}
                        placeholder="e.g. 2"
                        className="w-full text-xs font-mono font-bold text-slate-900 focus:outline-none"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 block font-sans">
                      Positive integer (&ge; 1). Default: 2
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-slate-600 font-semibold text-xs">
                      Requested Resource Rank:
                    </label>
                    <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-lg border border-slate-300 focus-within:border-indigo-500 shadow-2xs">
                      <span className="text-xs font-mono font-bold text-indigo-700 px-1">Rank</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={requestedRankInput}
                        onChange={(e) => setRequestedRankInput(e.target.value)}
                        placeholder="e.g. 1"
                        className="w-full text-xs font-mono font-bold text-slate-900 focus:outline-none"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 block font-sans">
                      Positive integer (&ge; 1). Default: 1
                    </span>
                  </div>
                </div>

                {/* Feedback */}
                <div
                  className={`p-3 rounded-lg border text-xs shadow-2xs ${
                    !rankResult.isValid
                      ? 'bg-rose-50 border-rose-300 text-rose-950'
                      : rankResult.allowed
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : 'bg-rose-50 border-rose-300 text-rose-950'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    {!rankResult.isValid ? (
                      <>
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span className="text-rose-900">INVALID INPUT</span>
                      </>
                    ) : rankResult.allowed ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="text-emerald-900">ORDERING POLICY SATISFIED</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span className="text-rose-900">BLOCKED BY ORDERING POLICY</span>
                      </>
                    )}
                  </div>
                  <p className="leading-relaxed text-slate-800 text-[11px] font-sans">
                    {rankResult.message}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 text-xs font-mono text-slate-600 border-t border-slate-200 flex items-center justify-between">
            <span>Coffman Condition #4 (Circular Wait) eliminated.</span>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Circular wait eliminated
            </span>
          </div>
        </div>

        {/* Technique 2: Request-All-At-Once */}
        <div className="rounded-xl shadow-2xs border border-slate-200 bg-white overflow-hidden flex flex-col justify-between">
          <div>
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  2. Request All Resources At Once
                </h4>
                <span className="text-xs text-slate-500">
                  Eliminates Condition #2: Hold and Wait
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                All-Or-Nothing Gate
              </span>
            </div>

            <div className="p-4 space-y-3.5">
              <p className="text-xs text-slate-600 leading-relaxed">
                A process must request and receive all required resources before beginning execution. If even one unit is unavailable, the process holds zero resources while waiting.
              </p>

              {/* Admission Gate Tester */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 block text-xs">
                    Process Admission Gate (User-Editable):
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    A, B, C Claims &amp; Free Pool
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Peak Demand Inputs */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-600 font-semibold text-xs">
                        Process Peak Demand [A, B, C]:
                      </span>
                      <span className="text-[10px] text-slate-400 font-sans">
                        Full claimed claim
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {['A', 'B', 'C'].map((resName, idx) => (
                        <div
                          key={`demand-${resName}`}
                          className="flex items-center gap-1.5 bg-white p-1.5 rounded-lg border border-slate-300 focus-within:border-indigo-500 shadow-2xs"
                        >
                          <span className="text-xs font-bold text-slate-600 font-mono pl-1">
                            {resName}:
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={demandInputs[idx]}
                            onChange={(e) => {
                              const next = [...demandInputs];
                              next[idx] = e.target.value;
                              setDemandInputs(next);
                            }}
                            className="w-full text-xs font-mono font-bold text-slate-900 focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Available Pool Inputs */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-600 font-semibold text-xs">
                        Available Pool [A, B, C]:
                      </span>
                      <span className="text-[10px] text-slate-400 font-sans">
                        Currently unallocated units
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {['A', 'B', 'C'].map((resName, idx) => (
                        <div
                          key={`avail-${resName}`}
                          className="flex items-center gap-1.5 bg-white p-1.5 rounded-lg border border-slate-300 focus-within:border-indigo-500 shadow-2xs"
                        >
                          <span className="text-xs font-bold text-indigo-700 font-mono pl-1">
                            {resName}:
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={availInputs[idx]}
                            onChange={(e) => {
                              const next = [...availInputs];
                              next[idx] = e.target.value;
                              setAvailInputs(next);
                            }}
                            className="w-full text-xs font-mono font-bold text-indigo-950 focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Visual Gate Status */}
                <div
                  className={`p-3 rounded-lg border text-xs shadow-2xs ${
                    !gateResult.isValid
                      ? 'bg-rose-50 border-rose-300 text-rose-950'
                      : gateResult.allowed
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : 'bg-amber-50 border-amber-300 text-amber-950'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    {!gateResult.isValid ? (
                      <>
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span className="text-rose-900">INVALID INPUT</span>
                      </>
                    ) : gateResult.allowed ? (
                      <>
                        <DoorOpen className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="text-emerald-900">ADMISSION GRANTED</span>
                      </>
                    ) : (
                      <>
                        <DoorOpen className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="text-amber-900">WAITING AT ADMISSION GATE (HOLDS NOTHING)</span>
                      </>
                    )}
                  </div>
                  <p className="leading-relaxed text-slate-800 text-[11px] font-sans">
                    {gateResult.message}
                  </p>
                </div>

                {/* Controls */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      setAvailInputs(['3', '3', '3']);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-semibold border border-indigo-200 cursor-pointer shadow-2xs transition-colors"
                  >
                    Simulate Available Pool &rarr; [3, 3, 3]
                  </button>
                  <button
                    onClick={() => {
                      setAvailInputs(['1', '2', '1']);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 cursor-pointer flex items-center gap-1 shadow-2xs transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Pool [1, 2, 1]</span>
                  </button>
                  <button
                    onClick={() => {
                      setDemandInputs(['2', '2', '2']);
                      setAvailInputs(['1', '2', '1']);
                    }}
                    className="px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 text-xs font-medium cursor-pointer transition-colors"
                    title="Reset both Demand and Available Pool to default [2,2,2] and [1,2,1]"
                  >
                    Reset All
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 text-xs font-mono text-slate-600 border-t border-slate-200 flex items-center justify-between">
            <span>Coffman Condition #2 (Hold and Wait) eliminated.</span>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Hold-and-wait eliminated
            </span>
          </div>
        </div>
      </div>

      {/* 3. Trade-off Comparison Chart */}
      <div className="rounded-xl shadow-2xs border border-slate-200 bg-white overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <h4 className="text-sm font-bold text-slate-800">
              Prevention Trade-Offs (Utilization vs Concurrency)
            </h4>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-[11px] text-slate-500 font-mono hidden md:inline">
              Illustrative Simulation Values
            </span>

            {/* View Selector: Separate Sub-Charts vs Normalized Index */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setChartView('separate')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  chartView === 'separate'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Separate Charts (Distinct Scales)
              </button>
              <button
                onClick={() => setChartView('normalized')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  chartView === 'normalized'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Normalized Index (0–100%)
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Scientific Disclaimer & Measurement Scale Explanation */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-xs">
                  Model Source &amp; Measurement Scales:
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                  Illustrative Simulation Values
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                Silberschatz OS Qualitative Architecture
              </span>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
              <strong>Viva Defense Note:</strong> These preset figures represent theoretical trade-offs described in Operating Systems textbooks. Percentage utilization, active thread count, and scheduling wait ticks have different physical units. They are separated into distinct charts below (or normalized to a common 0–100% relative index) so disparate units are never falsely plotted on the same scale.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px] font-sans pt-1">
              <div className="p-2 rounded-md bg-white border border-slate-200 flex items-start gap-2 shadow-2xs">
                <span className="w-3 h-3 rounded bg-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block font-semibold">Resource Utilization (%)</strong>
                  <span className="text-slate-500">Unit: Percentage (0% &ndash; 100%). Hardware capacity in active use.</span>
                </div>
              </div>
              <div className="p-2 rounded-md bg-white border border-slate-200 flex items-start gap-2 shadow-2xs">
                <span className="w-3 h-3 rounded bg-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block font-semibold">Avg Concurrency Degree</strong>
                  <span className="text-slate-500">Unit: Discrete processes (0 &ndash; 5). Active concurrent execution threads.</span>
                </div>
              </div>
              <div className="p-2 rounded-md bg-white border border-slate-200 flex items-start gap-2 shadow-2xs">
                <span className="w-3 h-3 rounded bg-amber-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block font-semibold">Average Wait Latency</strong>
                  <span className="text-slate-500">Unit: Scheduling delay ticks (0 &ndash; 10). Queue latency before admission.</span>
                </div>
              </div>
            </div>
          </div>

          {/* VIEW 1: Separate Clearly Labelled Charts (Eliminates Scale Conflation) */}
          {chartView === 'separate' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Chart A: Resource Utilization (%) */}
              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">
                      Chart 1: Resource Utilization (%)
                    </h5>
                    <span className="text-[10px] text-slate-500 block">
                      Hardware capacity actively doing computational work
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold">
                    Scale: 0% – 100%
                  </span>
                </div>

                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 10, right: 15, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                      <YAxis
                        stroke="#4f46e5"
                        fontSize={11}
                        domain={[0, 100]}
                        tickFormatter={(val) => `${val}%`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderColor: '#cbd5e1',
                          borderRadius: '0.5rem',
                          fontSize: '11px',
                        }}
                        formatter={(val: any) => [`${val}%`, 'Resource Utilization']}
                      />
                      <Bar
                        dataKey="utilization"
                        name="Utilization (%)"
                        fill="#4f46e5"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart B: Concurrency vs Wait Latency (Processes & Ticks) */}
              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">
                      Chart 2: Concurrency &amp; Wait Latency
                    </h5>
                    <span className="text-[10px] text-slate-500 block">
                      Active threads (0–5) vs Scheduling delay ticks (0–10)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">
                    Scale: 0 – 10 Units
                  </span>
                </div>

                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 10, right: 15, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                      <YAxis
                        stroke="#64748b"
                        fontSize={11}
                        domain={[0, 10]}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderColor: '#cbd5e1',
                          borderRadius: '0.5rem',
                          fontSize: '11px',
                        }}
                        formatter={(val: any, name?: any) => {
                          const n = String(name || '');
                          if (n.includes('Concurrency')) return [`${val} active processes`, 'Concurrency'];
                          if (n.includes('Wait')) return [`${val} scheduling delay ticks`, 'Wait Latency'];
                          return [val, n];
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                      <Bar
                        dataKey="concurrency"
                        name="Concurrency (Processes, 0–5)"
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="waitTime"
                        name="Wait Latency (Delay Ticks, 0–10)"
                        fill="#f59e0b"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            /* VIEW 2: Normalized Relative Index (0–100%) */
            <div className="space-y-3">
              <div className="p-2.5 rounded-lg bg-indigo-50/60 border border-indigo-200 text-xs text-indigo-950 flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">
                  Unified Normalization Method: Concurrency normalized out of 5 peak processes (c/5 &times; 100%); Latency normalized out of 10 maximum delay ticks (w/10 &times; 100%).
                </span>
                <span className="text-[11px] font-mono text-indigo-700 font-bold bg-white px-2 py-0.5 rounded border border-indigo-200">
                  Unified 0% – 100% Scale
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                    <YAxis
                      stroke="#4f46e5"
                      fontSize={11}
                      domain={[0, 100]}
                      tickFormatter={(val) => `${val}%`}
                      label={{ value: 'Normalized Index (%)', angle: -90, position: 'insideLeft', offset: 14, fontSize: 10, fill: '#4f46e5' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#cbd5e1',
                        borderRadius: '0.5rem',
                        fontSize: '12px',
                      }}
                      formatter={(val: any, name?: any) => {
                        const n = String(name || '');
                        if (n.includes('Utilization')) return [`${val}%`, 'Resource Utilization'];
                        if (n.includes('Concurrency')) return [`${val}% index (from active processes)`, 'Concurrency Index'];
                        if (n.includes('Wait Latency')) return [`${val}% index (from scheduling ticks)`, 'Wait Latency Index'];
                        return [`${val}%`, n];
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar
                      dataKey="utilization"
                      name="Resource Utilization (%)"
                      fill="#4f46e5"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="concurrencyNorm"
                      name="Concurrency Index (% of 5 max)"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="waitTimeNorm"
                      name="Wait Latency Index (% of 10 max)"
                      fill="#f59e0b"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Analysis Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2">
            {metrics.map((m) => {
              const isNoPrev = m.policy === 'standard';
              const label = m.deadlockStatusLabel || (isNoPrev ? 'Deadlock possible' : 'Deadlock eliminated');

              return (
                <div
                  key={m.policy}
                  className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5 gap-2">
                      <span className="font-bold text-slate-900 text-sm">{m.name}</span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded border whitespace-nowrap ${
                          isNoPrev
                            ? 'text-rose-800 bg-rose-50 border-rose-300'
                            : 'text-emerald-800 bg-emerald-50 border-emerald-300'
                        }`}
                      >
                        {label}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mb-2 leading-relaxed">{m.description}</p>

                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-slate-700">
                        <span className="text-slate-500">Eliminates:</span>
                        <span className="font-semibold text-indigo-700">{m.eliminatedCondition}</span>
                      </div>
                      <div className="flex justify-between text-slate-700">
                        <span className="text-slate-500">Starvation Risk:</span>
                        <span className="font-bold text-slate-800">{m.starvationRisk}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 space-y-0.5 text-xs text-slate-600">
                    <div>&bull; <strong>Pro:</strong> {m.pros[0]}</div>
                    <div>&bull; <strong>Con:</strong> {m.cons[0]}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
