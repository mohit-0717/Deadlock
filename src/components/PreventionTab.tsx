import React from 'react';
import {
  Shield,
  Layers,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  DoorOpen,
  ArrowRight,
  TrendingDown,
  Info,
  Clock,
  RotateCcw,
  Radio,
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
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="cockpit-glass rounded-2xl p-4 sm:p-5 shadow-xl border border-cyan-500/20">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
            <Shield className="w-4 h-4 text-purple-400" />
          </div>
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest font-mono">
            Deadlock Prevention: Eliminating Coffman Conditions
          </h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed font-sans">
          While <em>Deadlock Avoidance</em> dynamically checks requests at runtime using safety algorithms,
          <strong> Deadlock Prevention</strong> constrains the resource request protocol structurally so that at least one of the four necessary Coffman conditions
          (Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait) can <em>never physically form</em>.
        </p>
      </div>

      {/* Two Prevention Techniques Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Technique 1: Fixed Resource Ordering (Eliminate Circular Wait) */}
        <div className="cockpit-glass rounded-2xl p-5 sm:p-6 shadow-xl border border-cyan-500/20 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-300 font-mono text-xs font-bold border border-blue-500/40">
                  Havender
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
                    1. Fixed Resource Ordering (Hierarchical)
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Eliminates Condition #4: Circular Wait
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-500/40">
                Rule: R1 &lt; R2 &lt; R3
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-3 font-sans">
              Assign a strict linear order to all resource types: <code className="text-cyan-300 font-mono">F(R) &rarr; N</code>. A process holding a resource with rank <code className="text-cyan-300 font-mono">F(Ri)</code> can only request <code className="text-cyan-300 font-mono">Rj</code> if <code className="text-cyan-300 font-mono">F(Rj) &gt; F(Ri)</code>.
            </p>

            {/* Scenario E Interactive Rig */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 text-xs">
              <span className="font-semibold text-slate-200 block text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                Scenario E Live Test:
              </span>

              <div className="grid grid-cols-2 gap-3 text-slate-300 font-mono">
                <div>
                  <span className="block text-[10px] text-slate-400">Process &amp; Held Resource:</span>
                  <div className="text-xs font-bold text-cyan-400 mt-1">
                    P2 holds R2 (Rank 2)
                  </div>
                </div>

                <div>
                  <span className="block text-[10px] text-slate-400 mb-1">Target Request:</span>
                  <select
                    value={orderingRequestRes}
                    onChange={(e) => {
                      const resIdx = parseInt(e.target.value, 10);
                      setOrderingRequestRes(resIdx);
                      handleTestOrdering(2, resIdx, orderingHeld);
                    }}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono text-xs focus:border-cyan-500 focus:outline-none"
                  >
                    <option value={0}>Request R1 (Rank 1 - Lower)</option>
                    <option value={1}>Request R2 (Rank 2 - Same)</option>
                  </select>
                </div>
              </div>

              {/* Policy Decision Feedback */}
              <div
                className={`p-3.5 rounded-xl border text-xs ${
                  orderingResult.allowed
                    ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                    : 'bg-rose-950/70 border-rose-500/60 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-1 font-mono">
                  {orderingResult.allowed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  )}
                  <span>{orderingResult.allowed ? 'POLICY PERMITTED' : 'BLOCKED BY ORDERING POLICY'}</span>
                </div>
                <p className="leading-relaxed font-sans">{orderingResult.message}</p>

                {orderingResult.requiresRelease && (
                  <div className="mt-2.5 pt-2 border-t border-rose-500/30 flex items-center gap-2 text-[11px] font-mono">
                    <span className="font-bold text-amber-300">Required Remedy:</span>
                    <span>P2 must release R2 before it is allowed to acquire R1.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="text-[11px] font-mono text-slate-400 border-t border-slate-800 pt-3 flex items-center justify-between">
            <span>Circular wait graph cycle is mathematically precluded.</span>
            <span className="text-emerald-400 font-bold">Deadlock Risk: 0%</span>
          </div>
        </div>

        {/* Technique 2: Request-All-Before-Execution (Eliminate Hold & Wait) */}
        <div className="cockpit-glass rounded-2xl p-5 sm:p-6 shadow-xl border border-cyan-500/20 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/40">
                  Admission Gate
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
                    2. Request-All-Before-Execution
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Eliminates Condition #2: Hold and Wait
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-mono text-cyan-400 font-bold bg-cyan-950/80 px-2.5 py-1 rounded-lg border border-cyan-500/40">
                All-Or-Nothing
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-3 font-sans">
              A process must request and receive <em>all its required resources simultaneously</em> before beginning execution, or only when holding zero resources.
            </p>

            {/* Admission Gate Interactive Rig */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 text-xs">
              <span className="font-semibold text-slate-200 block text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                Process Gate Simulator:
              </span>

              <div className="grid grid-cols-2 gap-3 text-slate-300 font-mono text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">Peak Claim [A,B,C]:</span>
                  <span className="text-purple-300 font-bold">[{gatePeakClaim.join(', ')}]</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Pool Available [A,B,C]:</span>
                  <span className="text-cyan-300 font-bold">[{gateAvailable.join(', ')}]</span>
                </div>
              </div>

              {/* Gate Visual Status */}
              <div
                className={`p-3.5 rounded-xl border text-xs ${
                  gateResult.allowed
                    ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                    : 'bg-amber-950/70 border-amber-500/60 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-1 font-mono">
                  <DoorOpen className="w-4 h-4 text-cyan-400" />
                  <span>{gateResult.allowed ? 'ADMISSION GATE OPEN' : 'WAITING AT ADMISSION GATE'}</span>
                </div>
                <p className="leading-relaxed font-sans">{gateResult.message}</p>
              </div>

              {/* Gate Controls */}
              <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
                <button
                  onClick={() => {
                    const testAvail = [3, 3, 3];
                    setGateAvailable(testAvail);
                    handleTestGate(gatePeakClaim, testAvail, [0, 0, 0]);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-cyan-950/70 hover:bg-cyan-900 text-cyan-300 text-[11px] border border-cyan-500/40 cursor-pointer transition-all"
                >
                  Simulate Available Pool Increase &rarr; [3,3,3]
                </button>
                <button
                  onClick={() => {
                    const testAvail = [1, 2, 1];
                    setGateAvailable(testAvail);
                    handleTestGate(gatePeakClaim, testAvail, [0, 0, 0]);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] border border-slate-700 cursor-pointer transition-all"
                >
                  <RotateCcw className="w-3 h-3 inline mr-1" /> Reset Pool
                </button>
              </div>
            </div>
          </div>

          <div className="text-[11px] font-mono text-slate-400 border-t border-slate-800 pt-3 flex items-center justify-between">
            <span>Process holds zero resources while waiting.</span>
            <span className="text-emerald-400 font-bold">Deadlock Risk: 0%</span>
          </div>
        </div>
      </div>

      {/* Side-by-Side Trade-off Comparison & Recharts Chart */}
      <div className="cockpit-glass rounded-2xl p-5 sm:p-6 shadow-xl border border-cyan-500/20 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-bold text-slate-100 font-mono tracking-tight">
                Operating System Performance &amp; Engineering Trade-Offs
              </h4>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Quantitative comparison: Resource Utilization % vs Degree of Concurrency vs Queue Wait Latency
              </p>
            </div>
          </div>
        </div>

        {/* Recharts Bar Chart */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 20, left: -10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#070a14',
                  borderColor: 'rgba(56, 189, 248, 0.3)',
                  borderRadius: '0.75rem',
                  fontSize: '11px',
                  boxShadow: '0 0 15px rgba(0,0,0,0.8)',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="utilization" name="Resource Utilization %" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              <Bar dataKey="concurrency" name="Avg Concurrency Degree" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="waitTime" name="Average Wait Latency (Units)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Comparative Analysis Table & Viva Talking Points */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {metrics.map((m) => (
            <div
              key={m.policy}
              className="p-4 rounded-xl cockpit-glass-subtle border border-cyan-500/20 space-y-2.5 text-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-100 text-xs font-mono">{m.name}</span>
                  {m.deadlockOccurred ? (
                    <span className="text-[10px] font-bold text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded-full border border-rose-500/40 font-mono">
                      Deadlock Risk
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/40 font-mono">
                      0% Deadlock
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-300 font-sans mb-2.5">{m.description}</p>

                <div className="space-y-1.5 text-[11px] font-mono">
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Eliminates:</span>
                    <span className="font-semibold text-purple-300 text-right">{m.eliminatedCondition}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Starvation Risk:</span>
                    <span
                      className={`font-semibold ${
                        m.starvationRisk === 'High'
                          ? 'text-rose-400'
                          : m.starvationRisk === 'Medium'
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {m.starvationRisk}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-800/80 space-y-1 text-[10px] font-mono">
                <div className="text-emerald-400 font-semibold">&bull; Advantage: {m.pros[0]}</div>
                <div className="text-amber-400 font-semibold">&bull; Cost: {m.cons[0]}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
