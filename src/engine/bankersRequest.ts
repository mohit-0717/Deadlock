/**
 * Banker's Resource-Request Algorithm
 *
 * Evaluates whether an incoming request from Process P_i can be safely granted:
 * 1. If Request_i > Need_i: Error condition (exceeded declared maximum claim).
 * 2. If Request_i > Available: Process P_i must wait (not enough free instances).
 * 3. Tentative Allocation:
 *      Available = Available - Request_i
 *      Allocation_i = Allocation_i + Request_i
 *      Need_i = Need_i - Request_i
 * 4. Run SafetyCheck on tentative state:
 *      - If Safe: Grant resources and commit state.
 *      - If Unsafe: Deny request and ROLLBACK state to previous configuration.
 */

import {
  RequestHandlingResult,
  SystemState,
} from './types.js';
import { cloneMatrix, cloneVector } from './bankers.js';
import { safetyCheck } from './bankersSafety.js';
import { validateRequestFormat } from './validation.js';

export function requestResource(
  processId: number,
  request: number[],
  currentState: SystemState
): RequestHandlingResult {
  const { processCount, resourceCount, available, allocation, max, need, resourceNames } = currentState;
  const pName = `P${processId}`;
  const resNames = resourceNames || Array.from({ length: resourceCount }, (_, i) => String.fromCharCode(65 + i));

  // Step 1: Validate format & bounds
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

  // Step 2: Check if Request <= Need[processId]
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

  // Step 3: Check if Request <= Available
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

  // Step 4: Tentative Allocation (pretend to allocate)
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
