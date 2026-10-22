import React from 'react';
import { RAGGraph } from '../engine/types.js';

interface RAGGraphViewProps {
  graph: RAGGraph;
  hasDeadlock: boolean;
  deadlockedProcessNames: string[];
  terminatedProcessId?: number | null;
}

export const RAGGraphView: React.FC<RAGGraphViewProps> = ({
  graph,
  hasDeadlock,
  deadlockedProcessNames,
  terminatedProcessId,
}) => {
  // Compute positions in an SVG circle or bipartite layout
  const width = 640;
  const height = 360;
  const centerX = width / 2;
  const centerY = height / 2;

  const processNodes = graph.nodes.filter((n) => n.type === 'process');
  const resourceNodes = graph.nodes.filter((n) => n.type === 'resource');

  // Place processes on the left/upper circle or left column, resources on right
  const nodePositions: Record<string, { x: number; y: number }> = {};

  if (processNodes.length <= 4 && resourceNodes.length <= 3) {
    // Elliptical layout for clean cycle viewing
    const allNodes = [...processNodes, ...resourceNodes];
    const total = allNodes.length;
    allNodes.forEach((node, idx) => {
      const angle = (idx / total) * 2 * Math.PI - Math.PI / 2;
      const rx = 220;
      const ry = 130;
      nodePositions[node.id] = {
        x: centerX + rx * Math.cos(angle),
        y: centerY + ry * Math.sin(angle),
      };
    });
  } else {
    // Bipartite columns: processes on left, resources on right
    const pSpacing = height / (processNodes.length + 1);
    processNodes.forEach((p, idx) => {
      nodePositions[p.id] = {
        x: 160,
        y: pSpacing * (idx + 1),
      };
    });

    const rSpacing = height / (resourceNodes.length + 1);
    resourceNodes.forEach((r, idx) => {
      nodePositions[r.id] = {
        x: width - 160,
        y: rSpacing * (idx + 1),
      };
    });
  }

  return (
    <div className="relative w-full bg-slate-950 border border-slate-800 rounded-xl p-3 overflow-hidden shadow-inner flex flex-col items-center">
      {/* Visual Legend */}
      <div className="w-full flex items-center justify-between text-[11px] text-slate-400 mb-1 px-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full border-2 border-blue-400 bg-blue-950/60 inline-block" />
            Process Node
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded border-2 border-purple-400 bg-purple-950/60 inline-block" />
            Resource Node (Instance dots)
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-blue-400 inline-block" /> Assignment (R &rarr; P)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-amber-400 border-b border-dashed inline-block" /> Request (P &rarr; R)
          </span>
          {hasDeadlock && (
            <span className="flex items-center gap-1 text-red-400 font-bold">
              <span className="w-3 h-0.5 bg-red-500 inline-block animate-pulse" /> Deadlock Cycle
            </span>
          )}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto max-h-[380px] select-none"
      >
        <defs>
          {/* Arrow markers */}
          <marker
            id="arrow-assign"
            viewBox="0 0 10 10"
            refX="22"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#60a5fa" />
          </marker>

          <marker
            id="arrow-request"
            viewBox="0 0 10 10"
            refX="24"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
          </marker>

          <marker
            id="arrow-cycle"
            viewBox="0 0 10 10"
            refX="24"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#ef4444" />
          </marker>
        </defs>

        {/* Directed Edges */}
        {graph.edges.map((edge) => {
          const fromPos = nodePositions[edge.from];
          const toPos = nodePositions[edge.to];
          if (!fromPos || !toPos) return null;

          const isCycle = edge.isCycleEdge && hasDeadlock;
          const isAssign = edge.type === 'assignment';

          // Slight curve for visual clarity if bi-directional
          const dx = toPos.x - fromPos.x;
          const dy = toPos.y - fromPos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const curvature = isAssign ? 18 : -18;
          const midX = (fromPos.x + toPos.x) / 2 + (dy / dist) * curvature;
          const midY = (fromPos.y + toPos.y) / 2 - (dx / dist) * curvature;

          const pathD = `M ${fromPos.x} ${fromPos.y} Q ${midX} ${midY} ${toPos.x} ${toPos.y}`;

          let strokeColor = isAssign ? '#60a5fa' : '#f59e0b';
          let marker = isAssign ? 'url(#arrow-assign)' : 'url(#arrow-request)';
          if (isCycle) {
            strokeColor = '#ef4444';
            marker = 'url(#arrow-cycle)';
          }

          return (
            <g key={edge.id}>
              <path
                d={pathD}
                fill="none"
                stroke={strokeColor}
                strokeWidth={isCycle ? 2.8 : 1.8}
                strokeDasharray={isAssign ? undefined : '5,3'}
                className={isCycle ? 'animate-dash-flow' : undefined}
                markerEnd={marker}
              />
              {/* Edge Label if count > 1 */}
              {edge.count > 1 && (
                <text
                  x={midX}
                  y={midY}
                  fill={strokeColor}
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                  textAnchor="middle"
                  className="bg-black px-1"
                >
                  &times;{edge.count}
                </text>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {graph.nodes.map((node) => {
          const pos = nodePositions[node.id];
          if (!pos) return null;

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
                className={`transition-all duration-300 ${isTerminated ? 'opacity-25' : ''}`}
              >
                {/* Outer Glow */}
                <circle
                  r="24"
                  fill={isDeadlocked ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.15)'}
                  stroke={isDeadlocked ? '#ef4444' : '#3b82f6'}
                  strokeWidth={isDeadlocked ? 2.5 : 1.8}
                  className={isDeadlocked ? 'animate-pulse' : undefined}
                />
                <circle r="18" fill="#0f172a" />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={isDeadlocked ? '#f87171' : '#93c5fd'}
                  fontWeight="bold"
                  fontSize="12"
                  fontFamily="monospace"
                >
                  {node.name}
                </text>
                {isDeadlocked && (
                  <text
                    y="32"
                    textAnchor="middle"
                    fill="#ef4444"
                    fontSize="9"
                    fontWeight="bold"
                  >
                    DEADLOCKED
                  </text>
                )}
              </g>
            );
          } else {
            // Resource Node (Square)
            const instances = node.instances || 1;
            const avail = node.availableInstances ?? 0;

            return (
              <g
                key={node.id}
                transform={`translate(${pos.x - 22}, ${pos.y - 22})`}
              >
                <rect
                  width="44"
                  height="44"
                  rx="6"
                  fill="#1e1b4b"
                  stroke="#a855f7"
                  strokeWidth="1.8"
                />
                <text
                  x="22"
                  y="14"
                  textAnchor="middle"
                  fill="#d8b4fe"
                  fontWeight="bold"
                  fontSize="11"
                  fontFamily="monospace"
                >
                  {node.name}
                </text>

                {/* Instance Dots inside Resource */}
                <g transform="translate(7, 22)">
                  {Array.from({ length: Math.min(instances, 4) }, (_, dotIdx) => {
                    const isFree = dotIdx < avail;
                    return (
                      <circle
                        key={dotIdx}
                        cx={dotIdx * 9 + 4}
                        cy="6"
                        r="3"
                        fill={isFree ? '#22c55e' : '#a855f7'}
                        stroke="#000"
                        strokeWidth="0.5"
                      />
                    );
                  })}
                  {instances > 4 && (
                    <text x="24" y="9" fontSize="8" fill="#d8b4fe" fontFamily="monospace">
                      +{instances - 4}
                    </text>
                  )}
                </g>
              </g>
            );
          }
        })}
      </svg>
    </div>
  );
};
