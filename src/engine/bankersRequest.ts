/**
 * Banker's Resource-Request Algorithm
 *
 * Evaluates whether an incoming request from Process P_i can be safely granted:
 * 1. Format & Non-negative check
 * 2. If Request_i > Need_i: Error condition (exceeded declared maximum claim).
 * 3. If Request_i > Available: Process P_i must wait (not enough free instances).
 * 4. Tentative Allocation:
 *      Available = Available - Request_i
 *      Allocation_i = Allocation_i + Request_i
 *      Need_i = Need_i - Request_i
 * 5. Run SafetyCheck on tentative state:
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

  // Step 1: Validate format & non-negative bounds
  const formatCheck = validateRequestFormat(processId, request, processCount, resourceCount, resNames);
  if (!formatCheck.isValid) {
    const errorMsg = formatCheck.error || 'Request format or process ID is invalid.';
    return {
      status: 'INVALID_INPUT',
      outcome: 'INVALID_INPUT',
      granted: false,
      message: `Invalid Request: ${errorMsg}`,
      reason: errorMsg,
      explanation: `The request was rejected during input validation: ${errorMsg} No algorithm checks were executed, and the system state remains completely unchanged.`,
      ruleCode: 'a_invalid_format',
      priorState: currentState,
      newState: currentState,
      rollbackPerformed: false,
      checks: {
        format: { status: 'FAILED', detail: errorMsg },
        need: { status: 'NOT_EVALUATED', detail: 'Skipped due to input validation failure' },
        available: { status: 'NOT_EVALUATED', detail: 'Skipped due to input validation failure' },
        safety: { status: 'NOT_EVALUATED', detail: 'Skipped due to input validation failure' },
      },
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
      .map((j) => `${resNames[j]}: Requested ${request[j]} > Remaining Need ${procNeed[j]}`)
      .join('; ');
    const firstFailingRes = resNames[exceedsNeedIndices[0]];
    const firstReq = request[exceedsNeedIndices[0]];
    const firstNeed = procNeed[exceedsNeedIndices[0]];

    const reason = `Rule Violation (Request ≤ Need): ${details}. A process cannot request more resources than its declared Maximum minus current Allocation.`;
    const explanation = `The request exceeds ${pName}'s remaining Need for resource ${firstFailingRes} (requested ${firstReq} > remaining Need ${firstNeed}). In Banker's Algorithm, a process cannot exceed its declared maximum claim. The request was rejected before tentative allocation.`;

    return {
      status: 'INVALID_INPUT',
      outcome: 'INVALID_REQUEST',
      granted: false,
      message: `Request Denied: Process ${pName} exceeded its declared maximum claim!`,
      reason,
      explanation,
      ruleCode: 'b_exceeds_need',
      priorState: currentState,
      newState: currentState,
      rollbackPerformed: false,
      checks: {
        format: { status: 'PASSED', detail: `Valid non-negative integer vector [${request.join(', ')}]` },
        need: { status: 'FAILED', detail: details },
        available: { status: 'NOT_EVALUATED', detail: 'Skipped because request exceeds process Need' },
        safety: { status: 'NOT_EVALUATED', detail: 'Skipped because request exceeds process Need' },
      },
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
    const reason = `Rule (Request ≤ Available): Not enough free resources right now (${details}). The request is valid (within Need) but must be queued in WAITING state. The system state remains completely unchanged.`;
    const explanation = `The request is within ${pName}'s remaining Need ([${request.join(', ')}] ≤ [${procNeed.join(', ')}]), but exceeds currently Available resources (${details}). The request cannot be granted immediately. ${pName} must wait until other processes release instances. Current system matrices remain completely unchanged.`;

    return {
      status: 'WAITING',
      outcome: 'WAITING',
      granted: false,
      message: `Request Deferred: Process ${pName} must wait for resources to become available.`,
      reason,
      explanation,
      ruleCode: 'c_exceeds_available',
      priorState: currentState,
      newState: currentState,
      rollbackPerformed: false,
      deficit: deficitList,
      checks: {
        format: { status: 'PASSED', detail: `Valid request vector [${request.join(', ')}]` },
        need: { status: 'PASSED', detail: `Request [${request.join(', ')}] ≤ Need [${procNeed.join(', ')}]` },
        available: { status: 'WAITING', detail: details },
        safety: { status: 'NOT_EVALUATED', detail: 'Skipped because process must wait for free resources' },
      },
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
    const seqStr = safety.safeSequenceNames.join(' → ');
    return {
      status: 'SAFE',
      outcome: 'GRANTED',
      granted: true,
      message: `Request GRANTED for ${pName}: System remains in a SAFE state!`,
      reason: `Trial allocation confirmed safe sequence: <${seqStr}>. System committed the new allocation.`,
      explanation: `The request passed all 3 Banker's checks: Request ≤ Need, Request ≤ Available, and Tentative Safety. Tentatively allocating the requested resources leaves a verified safe execution sequence <${seqStr}>, guaranteeing no deadlock can occur. The allocation was committed.`,
      ruleCode: 'd_safe_granted',
      priorState: currentState,
      newState: trialState,
      trialState,
      safetyResult: safety,
      rollbackPerformed: false,
      checks: {
        format: { status: 'PASSED', detail: `Valid request vector [${request.join(', ')}]` },
        need: { status: 'PASSED', detail: `Request [${request.join(', ')}] ≤ Need [${procNeed.join(', ')}]` },
        available: { status: 'PASSED', detail: `Request [${request.join(', ')}] ≤ Available [${available.join(', ')}]` },
        safety: { status: 'PASSED', detail: `Safe sequence verified: <${seqStr}>` },
      },
    };
  } else {
    // DENY: ROLLBACK to original state!
    const stuckNames = safety.stuckProcesses.map((p) => p.processName).join(', ');
    const reason = `If granted, Available would drop to [${trialAvailable.join(', ')}], leaving processes [${stuckNames}] unable to guarantee completion. The system executed a ROLLBACK to preserve the safe base state.`;
    const explanation = `The request passed the Need and Availability checks, but the tentative allocation would leave Available at [${trialAvailable.join(', ')}]. Under this allocation, no complete safe sequence exists (processes [${stuckNames}] cannot finish). To prevent entering an unsafe state, the OS denied the request and restored the exact original state.`;

    return {
      status: 'UNSAFE',
      outcome: 'DENIED_UNSAFE',
      granted: false,
      message: `Request DENIED for ${pName}: Trial allocation leads to an UNSAFE state!`,
      reason,
      explanation,
      ruleCode: 'd_unsafe_denied',
      priorState: currentState,
      newState: currentState, // Rollback preserved
      trialState,
      safetyResult: safety,
      rollbackPerformed: true,
      checks: {
        format: { status: 'PASSED', detail: `Valid request vector [${request.join(', ')}]` },
        need: { status: 'PASSED', detail: `Request [${request.join(', ')}] ≤ Need [${procNeed.join(', ')}]` },
        available: { status: 'PASSED', detail: `Request [${request.join(', ')}] ≤ Available [${available.join(', ')}]` },
        safety: { status: 'FAILED', detail: `No safe sequence exists (stuck: [${stuckNames}])` },
      },
    };
  }
}
