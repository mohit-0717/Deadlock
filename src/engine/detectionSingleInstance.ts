/**
 * Single-Instance Deadlock Detection via Wait-For Graph (WFG)
 *
 * Algorithm description:
 * In single-instance systems, a cycle in the Wait-For Graph is both
 * necessary and sufficient for a deadlock to exist:
 *   Cycle in WFG <=> Deadlock
 */

import {
  DetectionResult,
} from './types.js';
import { cloneVector } from './bankers.js';
import { buildRAG } from './detection.js';

/**
 * Finds directed cycles in graph using Depth-First Search (DFS).
 */
export function findCyclesInGraph(
  nodeIds: string[],
  edges: { from: string; to: string }[]
): string[][] {
  const adj = new Map<string, string[]>();
  for (const id of nodeIds) {
    adj.set(id, []);
  }
  for (const edge of edges) {
    if (adj.has(edge.from)) {
      adj.get(edge.from)!.push(edge.to);
    }
  }

  const cycles: string[][] = [];
  const visited = new Map<string, boolean>();
  const recursionStack = new Map<string, boolean>();
  const parentPath: string[] = [];

  function dfs(current: string) {
    visited.set(current, true);
    recursionStack.set(current, true);
    parentPath.push(current);

    const neighbors = adj.get(current) || [];
    for (const neighbor of neighbors) {
      if (!visited.get(neighbor)) {
        dfs(neighbor);
      } else if (recursionStack.get(neighbor)) {
        // Cycle detected
        const cycleStartIndex = parentPath.indexOf(neighbor);
        if (cycleStartIndex !== -1) {
          const cycle = parentPath.slice(cycleStartIndex);
          cycles.push([...cycle]);
        }
      }
    }

    parentPath.pop();
    recursionStack.set(current, false);
  }

  for (const id of nodeIds) {
    if (!visited.get(id)) {
      dfs(id);
    }
  }

  return cycles;
}

export function detectDeadlockSingleInstance(
  allocation: number[][],
  request: number[][],
  available: number[],
  processNames?: string[],
  resourceNames?: string[]
): DetectionResult {
  const n = allocation.length;
  const m = available.length;
  const pNames = processNames || Array.from({ length: n }, (_, i) => `P${i}`);

  // Build Wait-For Graph edges between processes:
  // Pi is waiting for Pj if Pi requests R_k and Pj currently holds R_k.
  const wfgEdges: { from: string; to: string }[] = [];
  const procIds = Array.from({ length: n }, (_, i) => `P${i}`);

  for (let i = 0; i < n; i++) {
    for (let k = 0; k < m; k++) {
      if (request[i][k] > 0) {
        // Find which process holds resource k
        for (let j = 0; j < n; j++) {
          if (i !== j && allocation[j][k] > 0) {
            wfgEdges.push({ from: `P${i}`, to: `P${j}` });
          }
        }
      }
    }
  }

  const cycles = findCyclesInGraph(procIds, wfgEdges);
  const deadlockedProcSet = new Set<number>();
  for (const cyc of cycles) {
    for (const pNode of cyc) {
      const idx = parseInt(pNode.replace('P', ''), 10);
      if (!isNaN(idx)) deadlockedProcSet.add(idx);
    }
  }

  const deadlockedProcessIds = Array.from(deadlockedProcSet).sort((a, b) => a - b);
  const hasDeadlock = deadlockedProcessIds.length > 0;
  const deadlockedProcessNames = deadlockedProcessIds.map((id) => pNames[id]);

  const finishArray = new Array(n).fill(true);
  for (const dId of deadlockedProcessIds) {
    finishArray[dId] = false;
  }

  const flatCycleNodes = cycles.flat();

  let explanation = '';
  if (hasDeadlock) {
    const cycleStr = cycles.map((c) => c.join(' → ') + ' → ' + c[0]).join(', ');
    explanation = `DEADLOCK DETECTED! Wait-for graph contains cycle (${cycleStr}). For single-instance resources, a cycle is both necessary and sufficient for deadlock. Deadlocked processes: {${deadlockedProcessNames.join(', ')}}.`;
  } else {
    explanation = `NO DEADLOCK DETECTED. Wait-for graph has no circular wait cycles. All processes can proceed.`;
  }

  return {
    hasDeadlock,
    status: hasDeadlock ? 'DEADLOCK_DETECTED' : 'SAFE',
    isSingleInstance: true,
    deadlockedProcessIds,
    deadlockedProcessNames,
    resolvedProcessIds: procIds.map((_, i) => i).filter((i) => !deadlockedProcSet.has(i)),
    steps: [],
    finishArray,
    finalWork: cloneVector(available),
    cycleNodes: flatCycleNodes,
    explanation,
  };
}
