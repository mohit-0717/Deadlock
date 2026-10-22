/**
 * OS DeadlockLab: Banker's Algorithm (Deadlock Avoidance)
 *
 * Implements:
 * 1. computeNeed(max, allocation)
 * 2. safetyCheck(allocation, max, available, need?) -> returns Work trace + safe sequence
 * 3. requestResource(processId, request, currentState) -> strict Banker's multi-step flow
 *
 * Important Operating System Distinction:
 * Banker's Algorithm AVOIDS deadlock by ensuring the system never enters an UNSAFE state.
 * An UNSAFE state is NOT necessarily a deadlocked state; it means the system cannot guarantee
 * that all processes will eventually finish if they all request their maximum claims.
 */

import {
  RequestHandlingResult,
  SafetyResult,
  SafetyStep,
  StuckProcessDetail,
  SystemState,
} from './types.js';
import { validateRequestFormat } from './validation.js';

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

/**
 * Safety Algorithm (Dijkstra's Banker's Safety Algorithm):
 *
 * Let Work and Finish be vectors of length m and n respectively.
 * 1. Initialize: Work = Available, Finish[i] = false for all i = 0 .. n-1
 * 2. Find an index i such that:
 *      a) Finish[i] == false
 *      b) Need[i] <= Work  (Need[i][j] <= Work[j] for all j)
 *    If no such i exists, go to step 4.
 * 3. Work = Work + Allocation[i]
 *    Finish[i] = true
 *    Record process i in SafeSequence
 *    Go to step 2.
 * 4. If Finish[i] == true for all i, then the system is in a SAFE state.
 *    Otherwise, the system is in an UNSAFE state.
 */
export function safetyCheck(
  allocation: number[][],
  max: number[][],
  available: number[],
  customNeed?: number[][]
): SafetyResult {
  const n = allocation.length;
  const m = available.length;
  const need = customNeed || computeNeed(max, allocation);

  const work = cloneVector(available);
  const finish = new Array(n).fill(false);
  const safeSequence: number[] = [];
  const safeSequenceNames: string[] = [];
  const steps: SafetyStep[] = [];

  // Repeatedly look for an executable process using round-robin search
  // (canonical OS textbook order <P1, P3, P4, P0, P2>)
  let madeProgress = true;
  let stepCounter = 1;
  let searchStart = 0;

  while (madeProgress && safeSequence.length < n) {
    madeProgress = false;

    for (let offset = 0; offset < n; offset++) {
      const i = (searchStart + offset) % n;
      if (!finish[i]) {
        // Check if Need[i] <= Work for all resources j
        let canRun = true;
        for (let j = 0; j < m; j++) {
          if (need[i][j] > work[j]) {
            canRun = false;
            break;
          }
        }

        if (canRun) {
          const workBefore = cloneVector(work);

          // Simulate process execution and resource release
          for (let j = 0; j < m; j++) {
            work[j] += allocation[i][j];
          }
          finish[i] = true;
          safeSequence.push(i);
          safeSequenceNames.push(`P${i}`);

          const workAfter = cloneVector(work);

          steps.push({
            stepIndex: stepCounter++,
            processId: i,
            processName: `P${i}`,
            workBefore,
            need: cloneVector(need[i]),
            allocation: cloneVector(allocation[i]),
            workAfter,
            canRunReason: `Need [${need[i].join(',')}] ≤ Work [${workBefore.join(',')}]. Process executes and releases Allocation [${allocation[i].join(',')}].`,
          });

          madeProgress = true;
          searchStart = (i + 1) % n;
          break;
        }
      }
    }
  }

  const isSafe = safeSequence.length === n;

  // Identify any stuck processes if unsafe
  const stuckProcesses: StuckProcessDetail[] = [];
  if (!isSafe) {
    for (let i = 0; i < n; i++) {
      if (!finish[i]) {
        const failingResources = [];
        for (let j = 0; j < m; j++) {
          if (need[i][j] > work[j]) {
            failingResources.push({
              resourceIndex: j,
              resourceName: String.fromCharCode(65 + j),
              needAmount: need[i][j],
              workAmount: work[j],
              deficit: need[i][j] - work[j],
            });
          }
        }
        stuckProcesses.push({
          processId: i,
          processName: `P${i}`,
          need: cloneVector(need[i]),
          workAvailable: cloneVector(work),
          failingResources,
        });
      }
    }
  }

  const explanation = isSafe
    ? `System is SAFE. Found safe execution sequence: <${safeSequenceNames.join(', ')}>. All ${n} processes can complete without deadlock.`
    : `System is UNSAFE. Only ${safeSequence.length} of ${n} processes could finish (${safeSequenceNames.length ? safeSequenceNames.join(', ') : 'none'}). Stuck processes: ${stuckProcesses.map((p) => p.processName).join(', ')}. No complete safe sequence exists.`;

  return {
    isSafe,
    status: isSafe ? 'SAFE' : 'UNSAFE',
    safeSequence,
    safeSequenceNames,
    steps,
    stuckProcesses,
    finalWork: work,
    explanation,
  };
}

/**
 * Strict Banker's Algorithm Request Handling (Order specified by assignment):
 *
 * a) Invalid input (unknown process ID, negative, non-numeric, wrong length) -> INVALID
 * b) request > Need (exceeds declared maximum claim) -> INVALID
 * c) request > Available -> WAITING / DEFERRED; state completely unchanged
 * d) otherwise TEMPORARILY allocate (Available -= Req, Allocation += Req, Need -= Req), run safety check:
 *      safe -> GRANT and commit
 *      unsafe -> DENY and RESTORE the original state (show the rollback visibly), keep original state
 */
export function requestResource(
  processId: number,
  request: number[],
  currentState: SystemState
): RequestHandlingResult {
  const { processCount, resourceCount, available, allocation, max, need, resourceNames } = currentState;
  const pName = `P${processId}`;
  const resNames = resourceNames || Array.from({ length: resourceCount }, (_, i) => String.fromCharCode(65 + i));

  // Step a) Validate format & bounds
  const formatCheck = validateRequestFormat(processId, request, processCount, resourceCount);
  if (!formatCheck.isValid) {
    return {
      status: 'INVALID_INPUT',
      granted: false,
      message: `Invalid Request Format: ${formatCheck.error}`,
      reason: formatCheck.error || 'Request format or process ID is invalid.',
      ruleCode: 'a_invalid_format',
      priorState: currentState,
      newState: currentState,
      rollbackPerformed: false,
    };
  }

  // Step b) Check if Request <= Need[processId]
  const procNeed = need[processId];
  const exceedsNeedIndices: number[] = [];
  for (let j = 0; j < resourceCount; j++) {
    if (request[j] > procNeed[j]) {
      exceedsNeedIndices.push(j);
    }
  }

  if (exceedsNeedIndices.length > 0) {
    const details = exceedsNeedIndices
      .map((j) => `${resNames[j]}: Requested ${request[j]} > Max Remaining Need ${procNeed[j]}`)
      .join('; ');
    return {
      status: 'INVALID_INPUT',
      granted: false,
      message: `Request Denied: Process ${pName} exceeded its declared maximum claim!`,
      reason: `Rule Violation (Request ≤ Need): ${details}. A process cannot request more resources than its declared Maximum minus current Allocation.`,
      ruleCode: 'b_exceeds_need',
      priorState: currentState,
      newState: currentState,
      rollbackPerformed: false,
    };
  }

  // Step c) Check if Request <= Available
  const exceedsAvailIndices: number[] = [];
  const deficitList: { resourceIndex: number; resourceName: string; requested: number; available: number }[] = [];
  for (let j = 0; j < resourceCount; j++) {
    if (request[j] > available[j]) {
      exceedsAvailIndices.push(j);
      deficitList.push({
        resourceIndex: j,
        resourceName: resNames[j],
        requested: request[j],
        available: available[j],
      });
    }
  }

  if (exceedsAvailIndices.length > 0) {
    const details = deficitList
      .map((d) => `${d.resourceName}: Requested ${d.requested} > Available ${d.available}`)
      .join(', ');
    return {
      status: 'WAITING',
      granted: false,
      message: `Request Deferred: Process ${pName} must wait for resources to become available.`,
      reason: `Rule (Request ≤ Available): Not enough free resources right now (${details}). The request is valid (within Need) but must be queued in WAITING state. The system state remains completely unchanged.`,
      ruleCode: 'c_exceeds_available',
      priorState: currentState,
      newState: currentState,
      rollbackPerformed: false,
      deficit: deficitList,
    };
  }

  // Step d) Trial Allocation (pretend to allocate)
  const trialAvailable = cloneVector(available);
  const trialAllocation = cloneMatrix(allocation);
  const trialNeed = cloneMatrix(need);

  for (let j = 0; j < resourceCount; j++) {
    trialAvailable[j] -= request[j];
    trialAllocation[processId][j] += request[j];
    trialNeed[processId][j] -= request[j];
  }

  const trialState: SystemState = {
    ...currentState,
    available: trialAvailable,
    allocation: trialAllocation,
    need: trialNeed,
  };

  // Run Safety Algorithm on trial state
  const safety = safetyCheck(trialAllocation, max, trialAvailable, trialNeed);

  if (safety.isSafe) {
    // GRANT: Commit the trial state
    return {
      status: 'SAFE',
      granted: true,
      message: `Request GRANTED for ${pName}: System remains in a SAFE state!`,
      reason: `Trial allocation confirmed safe sequence: <${safety.safeSequenceNames.join(', ')}>. System committed the new allocation.`,
      ruleCode: 'd_safe_granted',
      priorState: currentState,
      newState: trialState,
      trialState,
      safetyResult: safety,
      rollbackPerformed: false,
    };
  } else {
    // DENY: ROLLBACK to original state!
    return {
      status: 'UNSAFE',
      granted: false,
      message: `Request DENIED for ${pName}: Trial allocation leads to an UNSAFE state!`,
      reason: `If granted, Available would drop to [${trialAvailable.join(', ')}], leaving processes [${safety.stuckProcesses.map((p) => p.processName).join(', ')}] unable to guarantee completion. The system executed a ROLLBACK to preserve the safe base state.`,
      ruleCode: 'd_unsafe_denied',
      priorState: currentState,
      newState: currentState, // Rollback preserved
      trialState,
      safetyResult: safety,
      rollbackPerformed: true,
    };
  }
}
