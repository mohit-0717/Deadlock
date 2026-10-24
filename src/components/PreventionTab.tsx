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
  checkAllAtOncePolicy,
  checkOrderingPolicy,
  getPreventionMetrics,
  OrderingPolicyCheckResult,
  AllAtOnceCheckResult,
} from '../engine/prevention.js';

interface PreventionTabProps {
  speed?: number;
  reduceMotion?: boolean;
}

export const PreventionTab: React.FC<PreventionTabProps> = () => {
  // 1. Interactive Fixed Ordering policy state (Havender Linear Ordering)
  const [orderingProcess] = React.useState<number>(2); // P2
  const [orderingHeld] = React.useState<number[]>([0, 1]); // Holds R2
  const [orderingRequestRes, setOrderingRequestRes] = React.useState<number>(0); // Requests R1
  const [orderingResult, setOrderingResult] = React.useState<OrderingPolicyCheckResult>(() =>
    checkOrderingPolicy(2, 0, [0, 1], ['R1', 'R2'])
  );

  // 2. Interactive Request-All-At-Once Admission Gate state
  const [gateProcessId] = React.useState<number>(1);
  const [gatePeakClaim] = React.useState<number[]>([2, 2, 2]);
  const [gateAvailable, setGateAvailable] = React.useState<number[]>([1, 2, 1]);
  const [gateResult, setGateResult] = React.useState<AllAtOnceCheckResult>(() =>
    checkAllAtOncePolicy(1, [2, 2, 2], [1, 2, 1], [0, 0, 0], ['A', 'B', 'C'])
  );

  const metrics = React.useMemo(() => getPreventionMetrics(), []);

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
                Rule: R1 &lt; R2
              </span>
            </div>

            <div className="p-4 space-y-3.5">
              <p className="text-xs text-slate-600 leading-relaxed">
                Resources are assigned a global numbering rank. A process holding resource <code className="text-indigo-800 font-bold">R_i</code> can only request <code className="text-indigo-800 font-bold">R_j</code> if rank(<code className="text-indigo-800 font-bold">R_j</code>) &gt; rank(<code className="text-indigo-800 font-bold">R_i</code>). This mathematically guarantees no circular wait can form.
              </p>

              {/* Interactive Tester */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-3 text-xs">
                <span className="font-bold text-slate-700 block text-xs">
                  Interactive Ordering Verification:
                </span>

                <div className="grid grid-cols-2 gap-3 text-slate-700">
                  <div>
                    <span className="block text-slate-500 font-medium">Currently Held:</span>
                    <div className="font-bold text-indigo-900 mt-0.5">
                      P2 holds R2 (Rank 2)
                    </div>
                  </div>

                  <div>
                    <span className="block text-slate-500 font-medium mb-1">Target Request:</span>
                    <select
                      value={orderingRequestRes}
                      onChange={(e) => {
                        const resIdx = parseInt(e.target.value, 10);
                        setOrderingRequestRes(resIdx);
                        handleTestOrdering(2, resIdx, orderingHeld);
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-xs focus:border-indigo-500 focus:outline-none font-bold"
                    >
                      <option value={0}>Request R1 (Rank 1 - Lower)</option>
                      <option value={1}>Request R2 (Rank 2 - Same)</option>
                    </select>
                  </div>
                </div>

                {/* Feedback */}
                <div
                  className={`p-3 rounded-lg border text-xs ${
                    orderingResult.allowed
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : 'bg-rose-50 border-rose-300 text-rose-950'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    {orderingResult.allowed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                    )}
                    <span>{orderingResult.allowed ? 'PERMITTED BY ORDERING POLICY' : 'BLOCKED BY ORDERING POLICY'}</span>
                  </div>
                  <p className="leading-relaxed text-slate-800">{orderingResult.message}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 text-xs font-mono text-slate-600 border-t border-slate-200 flex items-center justify-between">
            <span>Circular wait is precluded.</span>
            <span className="text-emerald-700 font-bold">Deadlock Risk: 0%</span>
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
                <span className="font-bold text-slate-700 block text-xs">
                  Process Admission Gate:
                </span>

                <div className="grid grid-cols-2 gap-3 text-slate-700 font-mono">
                  <div>
                    <span className="text-slate-500 block font-sans">Process Peak Demand [A,B,C]:</span>
                    <span className="text-slate-900 font-bold">[{gatePeakClaim.join(', ')}]</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-sans">Available Pool [A,B,C]:</span>
                    <span className="text-indigo-900 font-bold">[{gateAvailable.join(', ')}]</span>
                  </div>
                </div>

                {/* Visual Gate Status */}
                <div
                  className={`p-3 rounded-lg border text-xs ${
                    gateResult.allowed
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : 'bg-amber-50 border-amber-300 text-amber-950'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <DoorOpen className="w-4 h-4 text-indigo-600" />
                    <span>{gateResult.allowed ? 'ADMISSION GATE OPEN (Granted)' : 'WAITING AT ADMISSION GATE (Holds Nothing)'}</span>
                  </div>
                  <p className="leading-relaxed text-slate-800">{gateResult.message}</p>
                </div>

                {/* Controls */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      const testAvail = [3, 3, 3];
                      setGateAvailable(testAvail);
                      handleTestGate(gatePeakClaim, testAvail, [0, 0, 0]);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-semibold border border-indigo-200 cursor-pointer"
                  >
                    Simulate Available Pool &rarr; [3, 3, 3]
                  </button>
                  <button
                    onClick={() => {
                      const testAvail = [1, 2, 1];
                      setGateAvailable(testAvail);
                      handleTestGate(gatePeakClaim, testAvail, [0, 0, 0]);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 cursor-pointer flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Pool</span>
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

      {/* 3. Trade-off Comparison Chart */}
      <div className="rounded-xl shadow-2xs border border-slate-200 bg-white overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <h4 className="text-sm font-bold text-slate-800">
              Prevention Trade-Offs (Utilization vs Concurrency)
            </h4>
          </div>
        </div>

        <div className="p-4 space-y-4">
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
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '6px' }} />
                <Bar dataKey="utilization" name="Resource Utilization %" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="concurrency" name="Avg Concurrency Degree" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="waitTime" name="Wait Latency" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Analysis Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2">
            {metrics.map((m) => (
              <div
                key={m.policy}
                className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-900 text-sm">{m.name}</span>
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                      0% Deadlock
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
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
