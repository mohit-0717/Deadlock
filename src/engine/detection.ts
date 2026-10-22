/**
 * OS DeadlockLab: Deadlock Detection & Recovery Engine
 *
 * Implements:
 * 1. Multi-instance Deadlock Detection Algorithm (Silberschatz/Galvin/Gagne OS Concepts):
 *    - Uses Allocation, Request Matrix, Available (NOT Need/Max).
 *    - Finish[i] is initialized to true if Allocation[i] == 0, else false.
 *    - Steps through Work vector trace.
 *    - Identifies exact set of deadlocked processes.
 * 2. Single-instance Resource Allocation Graph (RAG) & Wait-For Graph cycle detection.
 * 3. Recovery via process termination or preemption, demonstrating resource recovery.
 *
 * Important Operating System Distinction:
 * Banker's avoids future deadlock; Detection finds actual deadlocks ALREADY occurring.
 * A cycle in a RAG is a necessary and sufficient condition ONLY for single-instance resources.
 * For multiple-instance resources, a cycle does NOT guarantee deadlock!
 */

import {
  DetectionResult,
  DetectionStep,
  RAGEdge,
  RAGGraph,
  RAGNode,
} from './types.js';
import { cloneMatrix, cloneVector } from './bankers.js';

/**
 * Multiple-Instance Deadlock Detection Algorithm:
 *
 * 1. Let Work and Finish be vectors of length m and n respectively.
 *    Initialize:
 *      Work = Available
 *      For i = 0, 1, ..., n-1:
 *        if Allocation[i] != 0, then Finish[i] = false;
 *        otherwise, Finish[i] = true.
 *
 * 2. Find an index i such that both:
 *      a) Finish[i] == false
 *      b) Request[i] <= Work  (Request[i][j] <= Work[j] for all j = 0..m-1)
 *    If no such i exists, go to step 4.
 *
 * 3. Work = Work + Allocation[i]
 *    Finish[i] = true
 *    Go to step 2.
 *
 * 4. If Finish[i] == false for any 0 <= i < n, then the system is in DEADLOCK.
 *    Moreover, if Finish[i] == false, then process Pi is deadlocked.
 */
export function detectDeadlockMultiInstance(
  allocation: number[][],
  request: number[][],
  available: number[],
  processNames?: string[],
  resourceNames?: string[]
): DetectionResult {
  const n = allocation.length;
  const m = available.length;
  const pNames = processNames || Array.from({ length: n }, (_, i) => `P${i}`);
  const rNames = resourceNames || Array.from({ length: m }, (_, i) => String.fromCharCode(65 + i));

  const work = cloneVector(available);
  const finish = new Array(n).fill(false);

  // Step 1: If process has 0 allocation, it holds nothing and cannot block anyone
  for (let i = 0; i < n; i++) {
    const isZeroAlloc = allocation[i].every((val) => val === 0);
    if (isZeroAlloc) {
      finish[i] = true;
    }
  }

  const steps: DetectionStep[] = [];
  const resolvedProcessIds: number[] = [];
  let stepIndex = 1;
  let progress = true;

  while (progress) {
    progress = false;

    for (let i = 0; i < n; i++) {
      if (!finish[i]) {
        // Check Request[i] <= Work
        let canComplete = true;
        for (let j = 0; j < m; j++) {
          const reqVal = request[i]?.[j] ?? 0;
          if (reqVal > work[j]) {
            canComplete = false;
            break;
          }
        }

        if (canComplete) {
          const workBefore = cloneVector(work);
          // Release process allocation into work
          for (let j = 0; j < m; j++) {
            work[j] += allocation[i][j];
          }
          finish[i] = true;
          resolvedProcessIds.push(i);
          const workAfter = cloneVector(work);

          steps.push({
            stepIndex: stepIndex++,
            processId: i,
            processName: pNames[i],
            workBefore,
            request: cloneVector(request[i]),
            allocation: cloneVector(allocation[i]),
            workAfter,
            reason: `Request [${request[i].join(',')}] ≤ Work [${workBefore.join(',')}]. ${pNames[i]} runs to completion and releases Allocation [${allocation[i].join(',')}].`,
          });

          progress = true;
          break; // Greedily restart scan
        }
      }
    }
  }

  // Step 4: Any process with Finish[i] == false is deadlocked
  const deadlockedProcessIds: number[] = [];
  for (let i = 0; i < n; i++) {
    if (!finish[i]) {
      deadlockedProcessIds.push(i);
    }
  }

  const hasDeadlock = deadlockedProcessIds.length > 0;
  const deadlockedProcessNames = deadlockedProcessIds.map((id) => pNames[id]);

  let explanation = '';
  if (hasDeadlock) {
    explanation = `DEADLOCK DETECTED! Deadlocked processes: {${deadlockedProcessNames.join(', ')}}. None of these processes can satisfy their pending requests with current available resources.`;
  } else {
    explanation = `NO DEADLOCK DETECTED. All processes can successfully satisfy their requests and release their resources in order: <${resolvedProcessIds.map((id) => pNames[id]).join(', ')}>.`;
  }

  return {
    hasDeadlock,
    status: hasDeadlock ? 'DEADLOCK_DETECTED' : 'SAFE',
    isSingleInstance: false,
    deadlockedProcessIds,
    deadlockedProcessNames,
    resolvedProcessIds,
    steps,
    finishArray: finish,
    finalWork: work,
    explanation,
  };
}

/**
 * Builds a Resource Allocation Graph (RAG) structure and identifies cycles.
 */
export function buildRAG(
  allocation: number[][],
  request: number[][],
  available: number[],
  totalInstances?: number[],
  processNames?: string[],
  resourceNames?: string[]
): RAGGraph {
  const n = allocation.length;
  const m = available.length;
  const pNames = processNames || Array.from({ length: n }, (_, i) => `P${i}`);
  const rNames = resourceNames || Array.from({ length: m }, (_, i) => `R${i + 1}`);

  const nodes: RAGNode[] = [];
  const edges: RAGEdge[] = [];

  // Add process nodes
  for (let i = 0; i < n; i++) {
    nodes.push({
      id: `P${i}`,
      type: 'process',
      name: pNames[i],
    });
  }

  // Add resource nodes
  for (let j = 0; j < m; j++) {
    const total = totalInstances ? totalInstances[j] : available[j] + allocation.reduce((acc, row) => acc + (row[j] || 0), 0);
    nodes.push({
      id: `R${j}`,
      type: 'resource',
      name: rNames[j],
      instances: total,
      availableInstances: available[j],
    });
  }

  // Assignment Edges: R_j -> P_i (process holds resource)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      const held = allocation[i][j];
      if (held > 0) {
        edges.push({
          id: `alloc-R${j}-P${i}`,
          from: `R${j}`,
          to: `P${i}`,
          type: 'assignment',
          resourceName: rNames[j],
          count: held,
        });
      }
    }
  }

  // Request Edges: P_i -> R_j (process requests resource)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      const req = request[i][j];
      if (req > 0) {
        edges.push({
          id: `req-P${i}-R${j}`,
          from: `P${i}`,
          to: `R${j}`,
          type: 'request',
          resourceName: rNames[j],
          count: req,
        });
      }
    }
  }

  // Cycle detection in the directed graph
  const cycles = findCyclesInGraph(nodes.map((nd) => nd.id), edges);

  // Mark cycle edges
  const cycleEdgesSet = new Set<string>();
  for (const cycle of cycles) {
    for (let k = 0; k < cycle.length; k++) {
      const u = cycle[k];
      const v = cycle[(k + 1) % cycle.length];
      cycleEdgesSet.add(`${u}->${v}`);
    }
  }

  for (const edge of edges) {
    if (cycleEdgesSet.has(`${edge.from}->${edge.to}`)) {
      edge.isCycleEdge = true;
    }
  }

  return {
    nodes,
    edges,
    cycles,
  };
}

/**
 * Finds elementary cycles in a directed graph using DFS.
 */
export function findCyclesInGraph(nodeIds: string[], edges: { from: string; to: string }[]): string[][] {
  const adj: Record<string, string[]> = {};
  for (const id of nodeIds) adj[id] = [];
  for (const e of edges) {
    if (adj[e.from]) adj[e.from].push(e.to);
  }

  const cycles: string[][] = [];
  const visited: Record<string, boolean> = {};
  const inStack: Record<string, boolean> = {};
  const currentPath: string[] = [];

  function dfs(u: string) {
    visited[u] = true;
    inStack[u] = true;
    currentPath.push(u);

    for (const v of adj[u] || []) {
      if (!visited[v]) {
        dfs(v);
      } else if (inStack[v]) {
        // Cycle detected from v to u
        const cycleStartIndex = currentPath.indexOf(v);
        if (cycleStartIndex !== -1) {
          const cycle = currentPath.slice(cycleStartIndex);
          // Only add unique cycles
          cycles.push([...cycle]);
        }
      }
    }

    currentPath.pop();
    inStack[u] = false;
  }

  for (const id of nodeIds) {
    if (!visited[id]) {
      dfs(id);
    }
  }

  return cycles;
}

/**
 * Single-Instance Deadlock Detection via Wait-For Graph (WFG):
 * In single-instance systems, Wait-For Graph has cycle <=> Deadlock exists.
 */
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

  const rag = buildRAG(allocation, request, available, undefined, processNames, resourceNames);
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

/**
 * Deadlock Recovery by Process Termination:
 * Reclaims all resources held by terminated process, resets its allocations and requests to 0,
 * then re-runs detection to demonstrate recovery.
 */
export function terminateProcessAndRecover(
  processId: number,
  allocation: number[][],
  request: number[][],
  available: number[],
  isSingleInstance: boolean = false,
  processNames?: string[],
  resourceNames?: string[]
): {
  newAllocation: number[][];
  newRequest: number[][];
  newAvailable: number[];
  releasedResources: number[];
  detectionResult: DetectionResult;
} {
  const newAllocation = cloneMatrix(allocation);
  const newRequest = cloneMatrix(request);
  const newAvailable = cloneVector(available);

  const releasedResources = cloneVector(allocation[processId]);

  // Release resources back to Available
  for (let j = 0; j < newAvailable.length; j++) {
    newAvailable[j] += releasedResources[j];
    newAllocation[processId][j] = 0;
    newRequest[processId][j] = 0;
  }

  const detectionResult = isSingleInstance
    ? detectDeadlockSingleInstance(newAllocation, newRequest, newAvailable, processNames, resourceNames)
    : detectDeadlockMultiInstance(newAllocation, newRequest, newAvailable, processNames, resourceNames);

  return {
    newAllocation,
    newRequest,
    newAvailable,
    releasedResources,
    detectionResult,
  };
}
