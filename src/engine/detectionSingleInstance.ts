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
import { detectDeadlockMultiInstance } from './detectionMultiInstance.js';

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

  const rawCycles: string[][] = [];
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
          rawCycles.push([...cycle]);
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

  // Deduplicate cyclic shifts so the same cycle is not reported twice
  const uniqueCycles: string[][] = [];
  const seenCycleKeys = new Set<string>();

  for (const c of rawCycles) {
    if (c.length === 0) continue;
    let minIdx = 0;
    for (let i = 1; i < c.length; i++) {
      if (c[i] < c[minIdx]) minIdx = i;
    }
    const rotated = [...c.slice(minIdx), ...c.slice(0, minIdx)];
    const key = rotated.join('->');
    if (!seenCycleKeys.has(key)) {
      seenCycleKeys.add(key);
      uniqueCycles.push(rotated);
    }
  }

  return uniqueCycles;
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

  // Build Wait-For Graph (WFG) edges between actual process names:
  // Pi is waiting for Pj if Pi requests R_k and Pj currently holds R_k.
  const wfgEdges: { from: string; to: string }[] = [];

  for (let i = 0; i < n; i++) {
    for (let k = 0; k < m; k++) {
      if (request[i]?.[k] > 0) {
        // Find which process currently holds resource k
        for (let j = 0; j < n; j++) {
          if (i !== j && (allocation[j]?.[k] || 0) > 0) {
            wfgEdges.push({ from: pNames[i], to: pNames[j] });
          }
        }
      }
    }
  }

  // Detect directed cycles directly over actual process names
  const cycles = findCyclesInGraph(pNames, wfgEdges);
  const deadlockedProcSet = new Set<number>();

  for (const cyc of cycles) {
    for (const pName of cyc) {
      const idx = pNames.indexOf(pName);
      if (idx !== -1) deadlockedProcSet.add(idx);
    }
  }

  const deadlockedProcessIds = Array.from(deadlockedProcSet).sort((a, b) => a - b);
  const hasDeadlock = deadlockedProcessIds.length > 0;
  const deadlockedProcessNames = deadlockedProcessIds.map((id) => pNames[id]);

  // Compute matrix reduction to obtain execution steps and completion sequence for any eligible processes
  const reductionRes = detectDeadlockMultiInstance(
    allocation,
    request,
    available,
    pNames,
    resourceNames
  );

  const finishArray = new Array(n).fill(true);
  for (const dId of deadlockedProcessIds) {
    finishArray[dId] = false;
  }

  const flatCycleNodes = cycles.flat();

  let explanation = '';
  if (hasDeadlock) {
    const cycleStr = cycles.map((c) => c.join(' → ') + ' → ' + c[0]).join(', ');
    explanation = `DEADLOCK DETECTED! Wait-for graph contains circular wait cycle (${cycleStr}). In single-instance resource systems, a cycle is necessary and sufficient for deadlock. Deadlocked processes: {${deadlockedProcessNames.join(', ')}}.`;
  } else {
    const safeSeq = reductionRes.resolvedProcessIds.map((id) => pNames[id]);
    if (safeSeq.length > 0) {
      explanation = `NO DEADLOCK DETECTED. Wait-for graph has no circular wait cycles. All remaining active processes can finish in sequence: <${safeSeq.join(' → ')}>. Final Work: [${reductionRes.finalWork.join(', ')}].`;
    } else {
      explanation = `NO DEADLOCK DETECTED. Wait-for graph has no circular wait cycles. All processes have finished or hold no resources.`;
    }
  }

  return {
    hasDeadlock,
    status: hasDeadlock ? 'DEADLOCK_DETECTED' : 'SAFE',
    isSingleInstance: true,
    deadlockedProcessIds,
    deadlockedProcessNames,
    resolvedProcessIds: hasDeadlock
      ? pNames.map((_, i) => i).filter((i) => !deadlockedProcSet.has(i))
      : reductionRes.resolvedProcessIds,
    steps: reductionRes.steps,
    finishArray: hasDeadlock ? finishArray : reductionRes.finishArray,
    finalWork: hasDeadlock ? cloneVector(available) : reductionRes.finalWork,
    cycleNodes: flatCycleNodes,
    explanation,
  };
}
