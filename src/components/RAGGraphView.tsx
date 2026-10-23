import React from 'react';
import { RAGGraph } from '../engine/types.js';

export interface RAGGraphViewProps {
  graph: RAGGraph;
  hasDeadlock: boolean;
  deadlockedProcessNames: string[];
  terminatedProcessId?: number | null;
  isSingleInstance?: boolean;
}

export const RAGGraphView: React.FC<RAGGraphViewProps> = ({
  graph,
  hasDeadlock,
  deadlockedProcessNames,
  terminatedProcessId,
  isSingleInstance = false,
}) => {
  const [hoveredNodeId, setHoveredNodeId] = React.useState<string | null>(null);

  // Expanded canvas dimensions to give nodes and edges ample breathing space
  const width = 820;
  const height = 480;
  const centerX = width / 2;
  const centerY = height / 2;

  const processNodes = graph.nodes.filter((n) => n.type === 'process');
  const resourceNodes = graph.nodes.filter((n) => n.type === 'resource');

  // Compute telemetry summary for hovered node spotlight
  const hoveredNodeInfo = React.useMemo(() => {
    if (!hoveredNodeId) return null;
    const node = graph.nodes.find((n) => n.id === hoveredNodeId);
    if (!node) return null;

    if (node.type === 'process') {
      const heldEdges = graph.edges.filter((e) => e.to === node.id && e.type === 'assignment');
      const reqEdges = graph.edges.filter((e) => e.from === node.id && e.type === 'request');
      const isDead = deadlockedProcessNames.includes(node.name) && hasDeadlock;

      const heldStr = heldEdges.length > 0 ? heldEdges.map((e) => `${e.from} (×${e.count})`).join(', ') : 'None';
      const reqStr = reqEdges.length > 0 ? reqEdges.map((e) => `${e.to} (×${e.count})`).join(', ') : 'None';

      return {
        name: node.name,
        type: 'process' as const,
        title: `Process ${node.name}`,
        held: heldStr,
        request: reqStr,
        status: isDead ? 'Deadlocked in circular dependency' : 'Active / Safe execution state',
        isDead,
      };
    } else {
      const heldBy = graph.edges.filter((e) => e.from === node.id && e.type === 'assignment');
      const reqBy = graph.edges.filter((e) => e.to === node.id && e.type === 'request');
      const heldByStr = heldBy.length > 0 ? heldBy.map((e) => `${e.to} (×${e.count})`).join(', ') : 'None';
      const reqByStr = reqBy.length > 0 ? reqBy.map((e) => `${e.from} (×${e.count})`).join(', ') : 'None';

      return {
        name: node.name,
        type: 'resource' as const,
        title: `Resource ${node.name}`,
        instances: node.instances || 1,
        available: node.availableInstances ?? 0,
        heldBy: heldByStr,
        requestedBy: reqByStr,
      };
    }
  }, [hoveredNodeId, graph, deadlockedProcessNames, hasDeadlock]);

  // Place processes on the left/upper circle or left column, resources on right
  const nodePositions: Record<string, { x: number; y: number }> = {};

  if (processNodes.length <= 4 && resourceNodes.length <= 3) {
    // Elliptical layout for clean cycle viewing
    const allNodes = [...processNodes, ...resourceNodes];
    const total = allNodes.length;
    allNodes.forEach((node, idx) => {
      const angle = (idx / total) * 2 * Math.PI - Math.PI / 2;
      const rx = 270;
      const ry = 160;
      nodePositions[node.id] = {
        x: centerX + rx * Math.cos(angle),
        y: centerY + ry * Math.sin(angle),
      };
    });
  } else {
    // Bipartite layout with wide horizontal span (580px) and vertical breathing space (82px)
    const pSpacing = (height - 60) / Math.max(processNodes.length, 1);
    processNodes.forEach((p, idx) => {
      nodePositions[p.id] = {
        x: 110,
        y: 40 + idx * pSpacing + pSpacing / 2,
      };
    });

    const rSpacing = (height - 80) / Math.max(resourceNodes.length, 1);
    resourceNodes.forEach((r, idx) => {
      nodePositions[r.id] = {
        x: width - 110,
        y: 50 + idx * rSpacing + rSpacing / 2,
      };
    });
  }

  return (
    <div className="relative w-full bg-white rounded-xl p-3 sm:p-4 overflow-hidden flex flex-col items-center">
      {/* Visual Legend */}
      <div className="w-full flex items-center justify-between text-xs text-slate-700 mb-2.5 px-2 flex-wrap gap-2.5">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-semibold">
            <span className="w-3.5 h-3.5 rounded-full border-2 border-blue-500 bg-blue-50 inline-block shadow-2xs" />
            Process Node
          </span>
          <span className="flex items-center gap-1.5 font-semibold">
            <span className="w-3.5 h-3.5 rounded-md border-2 border-purple-500 bg-purple-50 inline-block shadow-2xs" />
            Resource Node (Tokens)
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono font-bold flex-wrap text-xs">
          <span className="flex items-center gap-1.5 text-blue-700">
            <span className="w-4 h-0.5 bg-blue-600 inline-block" /> Assignment (R &rarr; P)
          </span>
          <span className="flex items-center gap-1.5 text-amber-700">
            <span className="w-4 h-0.5 bg-amber-600 border-b border-dashed inline-block" /> Request (P &rarr; R)
          </span>
          {isSingleInstance ? (
            hasDeadlock && (
              <span className="flex items-center gap-1.5 text-rose-700 font-extrabold">
                <span className="w-3.5 h-0.5 bg-rose-600 inline-block animate-pulse" /> Deadlock Cycle (Necessary &amp; Sufficient)
              </span>
            )
          ) : (
            <>
              {graph.cycles.length > 0 && (
                <span className="flex items-center gap-1.5 text-amber-700 font-semibold" title="Cycle alone does not prove deadlock in multi-instance systems">
                  <span className="w-3.5 h-0.5 bg-amber-500 border-b-2 border-dashed inline-block" /> Cycle (Not sufficient proof)
                </span>
              )}
              {hasDeadlock && (
                <span className="flex items-center gap-1.5 text-rose-700 font-extrabold">
                  <span className="w-3.5 h-0.5 bg-rose-600 inline-block" /> Deadlocked Dependency (Matrix Reduction)
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Interactive Hover Spotlight Strip or Topology Status Pill */}
      {hoveredNodeInfo ? (
        <div className="w-full mb-2 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-xs flex flex-wrap items-center justify-between gap-2 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-mono text-[11px] font-bold">
              {hoveredNodeInfo.title}
            </span>
            {hoveredNodeInfo.type === 'process' ? (
              <span className="text-slate-700 text-xs font-sans">
                Allocated: <strong className="font-mono text-blue-900 font-bold">[{hoveredNodeInfo.held}]</strong> &bull;
                Requesting: <strong className="font-mono text-amber-900 font-bold">[{hoveredNodeInfo.request}]</strong> &bull;
                Status: <strong className={hoveredNodeInfo.isDead ? 'text-rose-700 font-bold' : 'text-emerald-700 font-bold'}>{hoveredNodeInfo.status}</strong>
              </span>
            ) : (
              <span className="text-slate-700 text-xs font-sans">
                Capacity: <strong className="font-mono text-purple-900 font-bold">{hoveredNodeInfo.instances} units</strong> &bull;
                Available: <strong className="font-mono text-emerald-700 font-bold">{hoveredNodeInfo.available}</strong> &bull;
                Assigned to: <strong className="font-mono text-blue-900">[{hoveredNodeInfo.heldBy}]</strong> &bull;
                Requested by: <strong className="font-mono text-amber-900">[{hoveredNodeInfo.requestedBy}]</strong>
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono text-indigo-700 font-semibold bg-white px-2 py-0.5 rounded border border-indigo-200">
            Hover Spotlight Active
          </span>
        </div>
      ) : (
        <div className="w-full flex justify-end mb-2 px-2">
          {isSingleInstance ? (
            hasDeadlock ? (
              <span className="px-2.5 py-1 rounded-md bg-rose-100 text-rose-950 border border-rose-300 text-xs font-mono font-bold shadow-2xs">
                Single-Instance WFG Cycle &bull; Conclusive Deadlock
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-950 border border-emerald-300 text-xs font-mono font-bold shadow-2xs">
                Acyclic WFG &bull; System Safe
              </span>
            )
          ) : graph.cycles.length > 0 ? (
            <span
              className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold shadow-2xs ${
                hasDeadlock
                  ? 'bg-rose-50 text-rose-950 border border-rose-300'
                  : 'bg-amber-50 text-amber-950 border border-amber-300'
              }`}
            >
              Graph Cycle Detected &bull;{' '}
              {hasDeadlock ? 'Deadlock proven via Matrix Reduction' : 'Not sufficient proof of deadlock (Safe)'}
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-xs font-mono font-semibold">
              Acyclic Multi-Instance Graph
            </span>
          )}
        </div>
      )}

      {/* SVG Canvas with Dynamic Transitions & Ambient Filter Effects */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto max-h-[500px] select-none"
      >
        <defs>
          {/* Arrow markers with accurate radius offsets */}
          <marker
            id="arrow-assign"
            viewBox="0 0 10 10"
            refX="26"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#2563eb" />
          </marker>

          <marker
            id="arrow-request"
            viewBox="0 0 10 10"
            refX="34"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#d97706" />
          </marker>

          <marker
            id="arrow-cycle"
            viewBox="0 0 10 10"
            refX="26"
            refY="5"
            markerWidth="8"
            markerHeight="8"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 9 5 L 0 9 z" fill="#dc2626" />
          </marker>

          <marker
            id="arrow-cycle-warning"
            viewBox="0 0 10 10"
            refX="34"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f59e0b" />
          </marker>

          {/* Smooth Glow Filter for Deadlocked Nodes */}
          <filter id="rag-deadlock-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#dc2626" floodOpacity="0.45" />
          </filter>
        </defs>

        {/* Directed Edges */}
        {graph.edges.map((edge) => {
          const fromPos = nodePositions[edge.from];
          const toPos = nodePositions[edge.to];
          if (!fromPos || !toPos) return null;

          const isAssign = edge.type === 'assignment';
          const isDeadlockedDependency =
            !isSingleInstance &&
            hasDeadlock &&
            (deadlockedProcessNames.includes(edge.from) || deadlockedProcessNames.includes(edge.to));

          const isSingleInstanceCycle = isSingleInstance && edge.isCycleEdge && hasDeadlock;
          const isMultiInstanceCycle = !isSingleInstance && edge.isCycleEdge;

          // Smooth aerodynamic curvature for visual clarity and bidirectional separation
          const dx = toPos.x - fromPos.x;
          const dy = toPos.y - fromPos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const curvature = isAssign ? 26 : -26;
          const midX = (fromPos.x + toPos.x) / 2 + (dy / dist) * curvature;
          const midY = (fromPos.y + toPos.y) / 2 - (dx / dist) * curvature;

          const pathD = `M ${fromPos.x} ${fromPos.y} Q ${midX} ${midY} ${toPos.x} ${toPos.y}`;

          let strokeColor = isAssign ? '#2563eb' : '#d97706';
          let marker = isAssign ? 'url(#arrow-assign)' : 'url(#arrow-request)';
          let strokeWidth = 2;
          let dashArray: string | undefined = undefined;
          let animClass: string | undefined = undefined;

          if (isSingleInstanceCycle) {
            strokeColor = '#dc2626';
            marker = 'url(#arrow-cycle)';
            strokeWidth = 2.8;
            dashArray = '7,4';
            animClass = 'animate-dash-flow-fast';
          } else if (isDeadlockedDependency) {
            strokeColor = '#dc2626';
            marker = 'url(#arrow-cycle)';
            strokeWidth = 2.5;
            dashArray = '7,4';
            animClass = 'animate-dash-flow-fast';
          } else if (isMultiInstanceCycle) {
            strokeColor = '#f59e0b';
            marker = 'url(#arrow-cycle-warning)';
            strokeWidth = 2.2;
            dashArray = '5,4';
            animClass = 'animate-dash-flow';
          } else if (!isAssign) {
            // Pending request edges pulse gently
            strokeWidth = 1.9;
            dashArray = '5,4';
            animClass = 'animate-dash-flow-slow';
          }

          const isIncident = hoveredNodeId
            ? edge.from === hoveredNodeId || edge.to === hoveredNodeId
            : true;
          const edgeOpacity = hoveredNodeId ? (isIncident ? 1 : 0.12) : 1;

          return (
            <g
              key={edge.id}
              className="transition-all duration-300 ease-out"
              style={{ opacity: edgeOpacity }}
            >
              <path
                d={pathD}
                fill="none"
                stroke={strokeColor}
                strokeWidth={isIncident && hoveredNodeId ? strokeWidth + 1 : strokeWidth}
                strokeDasharray={dashArray}
                className={animClass}
                markerEnd={marker}
              >
                {isMultiInstanceCycle && (
                  <title>Cycle Edge: In multi-instance graphs, a cycle is not sufficient proof of deadlock</title>
                )}
              </path>

              {/* Edge Label Multiplier Badge Floating on Curve */}
              {edge.count > 1 && (
                <g
                  transform={`translate(${midX}, ${midY})`}
                  className="pointer-events-none select-none transition-transform duration-300"
                >
                  <rect
                    x="-12"
                    y="-9"
                    width="24"
                    height="18"
                    rx="5"
                    fill="#ffffff"
                    stroke={strokeColor}
                    strokeWidth="1.3"
                    className="shadow-2xs"
                  />
                  <text
                    x="0"
                    y="3.5"
                    fill={strokeColor}
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="800"
                    textAnchor="middle"
                  >
                    &times;{edge.count}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {graph.nodes.map((node) => {
          const pos = nodePositions[node.id];
          if (!pos) return null;

          const isConnected = hoveredNodeId
            ? node.id === hoveredNodeId ||
              graph.edges.some(
                (e) =>
                  (e.from === hoveredNodeId && e.to === node.id) ||
                  (e.to === hoveredNodeId && e.from === node.id)
              )
            : true;
          const nodeOpacity = hoveredNodeId ? (isConnected ? 1 : 0.25) : 1;

          if (node.type === 'process') {
            const isDeadlocked = deadlockedProcessNames.includes(node.name) && hasDeadlock;
            const isTerminated =
              terminatedProcessId !== null &&
              terminatedProcessId !== undefined &&
              node.id === `P${terminatedProcessId}`;

            return (
              <g
                key={node.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                className={`transition-all duration-300 ease-out cursor-pointer hover:scale-110 ${
                  isTerminated ? 'opacity-25' : ''
                }`}
                style={{
                  transformOrigin: `${pos.x}px ${pos.y}px`,
                  opacity: isTerminated ? 0.25 : nodeOpacity,
                }}
              >
                {/* Outer Breathing Aura when Deadlocked */}
                {isDeadlocked && (
                  <circle
                    r="32"
                    fill="rgba(239, 68, 68, 0.12)"
                    stroke="rgba(239, 68, 68, 0.35)"
                    strokeWidth="1.5"
                    className="animate-rag-pulse"
                  />
                )}

                {/* Main Node Rings */}
                <circle
                  r="24"
                  fill={isDeadlocked ? 'rgba(239, 68, 68, 0.18)' : 'rgba(59, 130, 246, 0.12)'}
                  stroke={isDeadlocked ? '#dc2626' : '#2563eb'}
                  strokeWidth={isDeadlocked ? 2.5 : 2}
                  className={isDeadlocked ? 'animate-node-glow' : undefined}
                />
                <circle
                  r="19"
                  fill="#ffffff"
                  stroke={isDeadlocked ? '#f87171' : '#93c5fd'}
                  strokeWidth="1.5"
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={isDeadlocked ? '#991b1b' : '#1e3a8a'}
                  fontWeight="800"
                  fontSize="12.5"
                  fontFamily="monospace"
                >
                  {node.name}
                </text>

                {/* DEADLOCKED Pill Badge with safe vertical offset */}
                {isDeadlocked && (
                  <g transform="translate(0, 31)">
                    <rect
                      x="-34"
                      y="-7"
                      width="68"
                      height="15"
                      rx="4"
                      fill="#fee2e2"
                      stroke="#fca5a5"
                      strokeWidth="0.8"
                    />
                    <text
                      textAnchor="middle"
                      y="4"
                      fill="#991b1b"
                      fontSize="8"
                      fontWeight="800"
                      fontFamily="monospace"
                    >
                      DEADLOCKED
                    </text>
                  </g>
                )}
              </g>
            );
          } else {
            // Resource Node (Square with Centered Token Dots & Free/Total Meter)
            const instances = node.instances || 1;
            const avail = node.availableInstances ?? 0;
            const boxSize = 64;
            const halfBox = boxSize / 2;

            // Compute perfectly centered, non-overlapping dots
            const renderDots = () => {
              if (instances <= 4) {
                const spacing = 12;
                const startX = halfBox - ((instances - 1) * spacing) / 2;
                return Array.from({ length: instances }, (_, idx) => {
                  const isFree = idx < avail;
                  return (
                    <circle
                      key={idx}
                      cx={startX + idx * spacing}
                      cy="46"
                      r="4"
                      fill={isFree ? '#16a34a' : '#a855f7'}
                      stroke="#ffffff"
                      strokeWidth="1.2"
                    />
                  );
                });
              } else if (instances <= 8) {
                // 2 balanced, symmetrical rows of dots (no text overlap!)
                const row1Count = Math.ceil(instances / 2);
                const row2Count = instances - row1Count;
                const spacing = 10;
                const startX1 = halfBox - ((row1Count - 1) * spacing) / 2;
                const startX2 = halfBox - ((row2Count - 1) * spacing) / 2;

                return (
                  <>
                    {Array.from({ length: row1Count }, (_, idx) => {
                      const isFree = idx < avail;
                      return (
                        <circle
                          key={`r1-${idx}`}
                          cx={startX1 + idx * spacing}
                          cy="40"
                          r="3.4"
                          fill={isFree ? '#16a34a' : '#a855f7'}
                          stroke="#ffffff"
                          strokeWidth="1"
                        />
                      );
                    })}
                    {Array.from({ length: row2Count }, (_, idx) => {
                      const overallIdx = row1Count + idx;
                      const isFree = overallIdx < avail;
                      return (
                        <circle
                          key={`r2-${idx}`}
                          cx={startX2 + idx * spacing}
                          cy="51"
                          r="3.4"
                          fill={isFree ? '#16a34a' : '#a855f7'}
                          stroke="#ffffff"
                          strokeWidth="1"
                        />
                      );
                    })}
                  </>
                );
              } else {
                return (
                  <text
                    x={halfBox}
                    y="46"
                    textAnchor="middle"
                    fill="#7e22ce"
                    fontSize="10"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {avail}/{instances} Free
                  </text>
                );
              }
            };

            return (
              <g
                key={node.id}
                transform={`translate(${pos.x - halfBox}, ${pos.y - halfBox})`}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                className="transition-all duration-300 ease-out cursor-pointer hover:scale-105"
                style={{
                  transformOrigin: `${pos.x}px ${pos.y}px`,
                  opacity: nodeOpacity,
                }}
              >
                {/* Resource Card */}
                <rect
                  width={boxSize}
                  height={boxSize}
                  rx="14"
                  fill="#faf5ff"
                  stroke="#9333ea"
                  strokeWidth="2"
                  filter="drop-shadow(0 2px 6px rgba(147, 51, 234, 0.14))"
                />

                {/* Resource Letter */}
                <text
                  x={halfBox}
                  y="18"
                  textAnchor="middle"
                  fill="#581c87"
                  fontWeight="800"
                  fontSize="15"
                  fontFamily="monospace"
                >
                  {node.name}
                </text>

                {/* Capacity & Availability Subtitle */}
                <text
                  x={halfBox}
                  y="29"
                  textAnchor="middle"
                  fill={avail > 0 ? '#15803d' : '#7e22ce'}
                  fontWeight="700"
                  fontSize="8.5"
                  fontFamily="monospace"
                >
                  {avail > 0 ? `${avail}/${instances} Free` : `${instances} Units`}
                </text>

                {/* Centered Instance Token Dots */}
                {renderDots()}
              </g>
            );
          }
        })}
      </svg>
    </div>
  );
};
