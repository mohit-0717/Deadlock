/**
 * Deadlock Detection & Recovery Engine Hub
 *
 * Implements:
 * 1. buildRAG: Constructs bipartite Resource Allocation Graph (Processes, Resources, Edges, Cycles)
 * 2. detectDeadlockSingleInstance: Wait-For Graph cycle detection (in detectionSingleInstance.ts)
 * 3. detectDeadlockMultiInstance: Matrix reduction algorithm (in detectionMultiInstance.ts)
 * 4. terminateProcessAndRecover: Victim selection & resource preemption (in detectionRecovery.ts)
 */

import {
  RAGEdge,
  RAGGraph,
  RAGNode,
} from './types.js';
import { findCyclesInGraph } from './detectionSingleInstance.js';

export { detectDeadlockMultiInstance } from './detectionMultiInstance.js';
export { detectDeadlockSingleInstance, findCyclesInGraph } from './detectionSingleInstance.js';
export { terminateProcessAndRecover } from './detectionRecovery.js';

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

  // Map internal node IDs to human-readable process/resource names for clear cycle paths
  const nodeNameMap = new Map<string, string>();
  for (const nd of nodes) {
    nodeNameMap.set(nd.id, nd.name);
  }
  const namedCycles = cycles.map((cyc) => cyc.map((id) => nodeNameMap.get(id) || id));

  return {
    nodes,
    edges,
    cycles: namedCycles,
  };
}
