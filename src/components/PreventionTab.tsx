import React from 'react';
import {
  Shield,
  Layers,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  DoorOpen,
  ArrowRight,
  RotateCcw,
  Cpu,
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
  checkAllAtOncePolicy,
  checkOrderingPolicy,
  getPreventionMetrics,
  OrderingPolicyCheckResult,
  AllAtOnceCheckResult,
} from '../engine/prevention.js';
import { StatusBadge } from './StatusBadge.js';

interface PreventionTabProps {
  speed: number;
  reduceMotion: boolean;
}

export const PreventionTab: React.FC<PreventionTabProps> = ({
  speed,
  reduceMotion,
}) => {
  // 1. Interactive Fixed Ordering policy state (Scenario E)
  // R1 < R2.
  // P2 holds R2 (index 1), requests R1 (index 0) -> policy blocks!
  const [orderingProcess, setOrderingProcess] = React.useState<number>(2); // P2
  const [orderingHeld, setOrderingHeld] = React.useState<number[]>([0, 1]); // Holds R2
  const [orderingRequestRes, setOrderingRequestRes] = React.useState<number>(0); // Requests R1
  const [orderingResult, setOrderingResult] = React.useState<OrderingPolicyCheckResult>(() =>
    checkOrderingPolicy(2, 0, [0, 1], ['R1', 'R2'])
  );

  // 2. Interactive Request-All-At-Once Admission Gate state
  const [gateProcessId, setGateProcessId] = React.useState<number>(1);
  const [gatePeakClaim, setGatePeakClaim] = React.useState<number[]>([2, 2, 2]);
  const [gateAvailable, setGateAvailable] = React.useState<number[]>([1, 2, 1]);
  const [gateCurrentlyHeld, setGateCurrentlyHeld] = React.useState<number[]>([0, 0, 0]);
  const [gateResult, setGateResult] = React.useState<AllAtOnceCheckResult>(() =>
    checkAllAtOncePolicy(1, [2, 2, 2], [1, 2, 1], [0, 0, 0], ['A', 'B', 'C'])
  );

  const metrics = React.useMemo(() => getPreventionMetrics(), []);

  // Format metrics data for Recharts
  const chartData = React.useMemo(() => {
    return [
      {
        name: 'No Prevention',
        utilization: 88,
        concurrency: 4.8,
        waitTime: 2.1,
      },
      {
        name: 'Fixed Ordering',
        utilization: 74,
        concurrency: 3.9,
        waitTime: 3.8,
      },
      {
        name: 'Request All At Once',
        utilization: 49,
        concurrency: 2.2,
        waitTime: 7.4,
      },
    ];
  }, []);

  const handleTestOrdering = (proc: number, reqIdx: number, heldRow: number[]) => {
    const res = checkOrderingPolicy(proc, reqIdx, heldRow, ['R1', 'R2']);
    setOrderingResult(res);
  };

  const handleTestGate = (claim: number[], avail: number[], held: number[]) => {
    const res = checkAllAtOncePolicy(gateProcessId, claim, avail, held, ['A', 'B', 'C']);
    setGateResult(res);
  };

  return (
    <div className="space-y-4">
      {/* Overview Banner */}
      <div className="rounded-xl p-4 shadow-2xs border border-slate-800 bg-slate-900 text-white">
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="p-1.5 rounded-md bg-indigo-600 text-white font-mono text-xs font-bold shadow-2xs">
            CP
          </div>
          <h3 className="text-sm sm:text-base font-extrabold text-white font-sans tracking-tight">
            Deadlock Prevention &amp; Coffman Invariant Enforcement
          </h3>
        </div>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
          Unlike <em className="text-indigo-300">Deadlock Avoidance</em> (which dynamically verifies tentative states via safety algorithms),
          <strong className="text-white"> Deadlock Prevention</strong> structurally restricts the resource acquisition protocol so that at least one of the four necessary Coffman conditions
          (Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait) can <em className="text-amber-300">never physically form</em>.
        </p>
      </div>

      {/* Two Prevention Techniques Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Technique 1: Fixed Resource Ordering (Eliminate Circular Wait) */}
        <div className="rounded-xl shadow-2xs border border-slate-200 bg-white overflow-hidden flex flex-col justify-between">
          <div>
            <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-xs font-bold border border-slate-700">
                  Havender
                </span>
                <div>
                  <h4 className="text-sm font-extrabold text-white font-sans tracking-tight">
                    1. Fixed Resource Ordering (Hierarchical)
                  </h4>
                  <span className="text-xs text-slate-400 font-sans">
                    Eliminates Condition #4: Circular Wait
                  </span>
                </div>
              </div>
              <span className="text-xs font-mono text-emerald-300 font-bold bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
                Rule: R1 &lt; R2 &lt; R3
              </span>
            </div>

            <div className="p-4 space-y-3.5">
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-sans">
                Assign a strict linear order to all resource types: <code className="text-indigo-800 font-mono font-bold">F(R) &rarr; N</code>. A process holding a resource with rank <code className="text-indigo-800 font-mono font-bold">F(Ri)</code> can only request <code className="text-indigo-800 font-mono font-bold">Rj</code> if <code className="text-indigo-800 font-mono font-bold">F(Rj) &gt; F(Ri)</code>.
              </p>

              {/* Scenario E Interactive Rig */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-3 text-xs sm:text-sm font-sans">
                <span className="font-bold text-slate-800 block text-xs uppercase tracking-wider font-mono">
                  Scenario E Live Verification:
                </span>

                <div className="grid grid-cols-2 gap-3 text-slate-700 font-mono">
                  <div>
                    <span className="block text-xs text-slate-500 font-sans font-semibold">Held Resource:</span>
                    <div className="text-sm font-bold text-indigo-900 mt-0.5">
                      P2 holds R2 (Rank 2)
                    </div>
                  </div>

                  <div>
                    <span className="block text-xs text-slate-500 font-sans font-semibold mb-1">Target Request:</span>
                    <select
                      value={orderingRequestRes}
                      onChange={(e) => {
                        const resIdx = parseInt(e.target.value, 10);
                        setOrderingRequestRes(resIdx);
                        handleTestOrdering(2, resIdx, orderingHeld);
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-xs focus:border-indigo-500 focus:outline-none shadow-2xs font-bold"
                    >
                      <option value={0}>Request R1 (Rank 1 - Lower)</option>
                      <option value={1}>Request R2 (Rank 2 - Same)</option>
                    </select>
                  </div>
                </div>

                {/* Policy Decision Feedback */}
                <div
                  className={`p-3 rounded-lg border text-xs sm:text-sm ${
                    orderingResult.allowed
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-2xs'
                      : 'bg-rose-50 border-rose-300 text-rose-950 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold mb-1 font-mono text-xs">
                    {orderingResult.allowed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                    )}
                    <span className="font-extrabold">{orderingResult.allowed ? 'POLICY PERMITTED' : 'BLOCKED BY ORDERING POLICY'}</span>
                  </div>
                  <p className="leading-normal font-sans text-xs sm:text-sm text-slate-800">{orderingResult.message}</p>

                  {orderingResult.requiresRelease && (
                    <div className="mt-2.5 pt-2 border-t border-rose-200 flex items-center gap-2 text-xs font-mono">
                      <span className="font-bold text-amber-900">Remedy:</span>
                      <span className="text-slate-700">P2 must release R2 before requesting lower rank R1.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 text-xs font-mono text-slate-600 border-t border-slate-200 flex items-center justify-between">
            <span>Circular wait graph cycle is mathematically precluded.</span>
            <span className="text-emerald-700 font-bold">Deadlock Risk: 0%</span>
          </div>
        </div>

        {/* Technique 2: Request-All-Before-Execution (Eliminate Hold & Wait) */}
        <div className="rounded-xl shadow-2xs border border-slate-200 bg-white overflow-hidden flex flex-col justify-between">
          <div>
            <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-xs font-bold border border-slate-700">
                  Admission Gate
                </span>
                <div>
                  <h4 className="text-sm font-extrabold text-white font-sans tracking-tight">
                    2. Request-All-Before-Execution
                  </h4>
                  <span className="text-xs text-slate-400 font-sans">
                    Eliminates Condition #2: Hold and Wait
                  </span>
                </div>
              </div>
              <span className="text-xs font-mono text-indigo-300 font-bold bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
                All-Or-Nothing
              </span>
            </div>

            <div className="p-4 space-y-3.5">
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-sans">
                A process must request and receive <em className="text-slate-900 font-semibold">all its required resources simultaneously</em> before beginning execution, or only when holding zero resources.
              </p>

              {/* Admission Gate Interactive Rig */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-3 text-xs sm:text-sm font-sans">
                <span className="font-bold text-slate-800 block text-xs uppercase tracking-wider font-mono">
                  Process Gate Simulator:
                </span>

                <div className="grid grid-cols-2 gap-3 text-slate-700 font-mono text-xs sm:text-sm">
                  <div>
                    <span className="text-slate-500 block text-xs font-sans font-semibold">Peak Claim [A,B,C]:</span>
                    <span className="text-purple-900 font-bold">[{gatePeakClaim.join(', ')}]</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs font-sans font-semibold">Pool Available [A,B,C]:</span>
                    <span className="text-indigo-900 font-bold">[{gateAvailable.join(', ')}]</span>
                  </div>
                </div>

                {/* Gate Visual Status */}
                <div
                  className={`p-3 rounded-lg border text-xs sm:text-sm ${
                    gateResult.allowed
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-2xs'
                      : 'bg-amber-50 border-amber-300 text-amber-950 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold mb-1 font-mono text-xs">
                    <DoorOpen className="w-4 h-4 text-indigo-600" />
                    <span className="font-extrabold">{gateResult.allowed ? 'ADMISSION GATE OPEN' : 'WAITING AT ADMISSION GATE'}</span>
                  </div>
                  <p className="leading-normal font-sans text-xs sm:text-sm text-slate-800">{gateResult.message}</p>
                </div>

                {/* Gate Controls */}
                <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
                  <button
                    onClick={() => {
                      const testAvail = [3, 3, 3];
                      setGateAvailable(testAvail);
                      handleTestGate(gatePeakClaim, testAvail, [0, 0, 0]);
                    }}
                    className="px-3 py-1.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold border border-indigo-200 cursor-pointer transition-colors shadow-2xs"
                  >
                    Simulate Pool &rarr; [3,3,3]
                  </button>
                  <button
                    onClick={() => {
                      const testAvail = [1, 2, 1];
                      setGateAvailable(testAvail);
                      handleTestGate(gatePeakClaim, testAvail, [0, 0, 0]);
                    }}
                    className="px-3 py-1.5 rounded-md bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-300 cursor-pointer transition-colors shadow-2xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5 inline mr-1" /> Reset Pool
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 text-xs font-mono text-slate-600 border-t border-slate-200 flex items-center justify-between">
            <span>Process holds zero resources while waiting.</span>
            <span className="text-emerald-700 font-bold">Deadlock Risk: 0%</span>
          </div>
        </div>
      </div>

      {/* Side-by-Side Trade-off Comparison & Recharts Chart */}
      <div className="rounded-xl shadow-2xs border border-slate-200 bg-white overflow-hidden space-y-3.5">
        <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            <div>
              <h4 className="text-sm font-extrabold text-white font-sans tracking-tight">
                Quantitative Engineering Trade-Offs
              </h4>
              <p className="text-xs text-slate-400 font-sans">
                Resource Utilization % vs. Degree of Concurrency vs. Queue Wait Latency
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Recharts Bar Chart */}
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 15, left: -15, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#cbd5e1',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(15,23,42,0.08)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '6px' }} />
                <Bar dataKey="utilization" name="Utilization %" fill="#0284c7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="concurrency" name="Avg Concurrency Degree" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="waitTime" name="Wait Latency" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Comparative Analysis Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
            {metrics.map((m) => (
              <div
                key={m.policy}
                className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-900 text-sm font-sans">{m.name}</span>
                    {m.deadlockOccurred ? (
                      <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-300 font-mono">
                        Deadlock Risk
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300 font-mono">
                        0% Deadlock
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-700 font-sans mb-2.5 leading-relaxed">{m.description}</p>

                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between text-slate-700">
                      <span className="text-slate-500 font-sans">Eliminates:</span>
                      <span className="font-semibold text-purple-800">{m.eliminatedCondition}</span>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span className="text-slate-500 font-sans">Starvation:</span>
                      <span
                        className={`font-bold ${
                          m.starvationRisk === 'High'
                            ? 'text-rose-700'
                            : m.starvationRisk === 'Medium'
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {m.starvationRisk}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-200 space-y-1 text-xs font-sans">
                  <div className="text-emerald-800 font-semibold">&bull; Pros: {m.pros[0]}</div>
                  <div className="text-amber-800 font-semibold">&bull; Cons: {m.cons[0]}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
