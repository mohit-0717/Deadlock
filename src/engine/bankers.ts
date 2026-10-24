/**
 * OS DeadlockLab: Banker's Algorithm (Deadlock Avoidance)
 *
 * Implements:
 * 1. computeNeed(max, allocation)
 * 2. safetyCheck(allocation, max, available, need?) -> in bankersSafety.ts
 * 3. requestResource(processId, request, currentState) -> in bankersRequest.ts
 */

export { safetyCheck } from './bankersSafety.js';
export { requestResource } from './bankersRequest.js';

/**
 * Computes Need matrix = Maximum - Allocation.
 * Guarantees Need[i][j] >= 0 assuming Allocation <= Max.
 */
export function computeNeed(max: number[][], allocation: number[][]): number[][] {
  const n = max.length;
  const m = max[0]?.length || 0;
  const need: number[][] = [];

  for (let i = 0; i < n; i++) {
    need[i] = [];
    for (let j = 0; j < m; j++) {
      const mx = max[i]?.[j] ?? 0;
      const al = allocation[i]?.[j] ?? 0;
      need[i][j] = Math.max(0, mx - al);
    }
  }
  return need;
}

/**
 * Deep clones a 2D matrix.
 */
export function cloneMatrix(matrix: number[][]): number[][] {
  return matrix.map((row) => [...row]);
}

/**
 * Deep clones a 1D vector.
 */
export function cloneVector(vector: number[]): number[] {
  return [...vector];
}
