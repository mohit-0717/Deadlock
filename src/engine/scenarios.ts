/**
 * OS DeadlockLab: Built-In Verified Scenarios & Test Suite
 * Scenarios A, B, C, D1, D2, D3, E, F as defined in assignment specification.
 */

import { computeNeed, requestResource, safetyCheck } from './bankers.js';
import {
  detectDeadlockMultiInstance,
  detectDeadlockSingleInstance,
  terminateProcessAndRecover,
} from './detection.js';
import { checkAllAtOncePolicy, checkOrderingPolicy } from './prevention.js';
import { SystemState, TestCaseResult } from './types.js';
import { validateRequestFormat, validateSetup } from './validation.js';

/**
 * SCENARIO A: AVOIDANCE BASE
 * 3 resource types A,B,C; totals A=10, B=5, C=7; Available=[3,3,2]
 */
export function getScenarioA(): SystemState {
  const allocation = [
    [0, 1, 0], // P0
    [2, 0, 0], // P1
    [3, 0, 2], // P2
    [2, 1, 1], // P3
    [0, 0, 2], // P4
  ];

  const max = [
    [7, 5, 3], // P0
    [3, 2, 2], // P1
    [9, 0, 2], // P2
    [2, 2, 2], // P3
    [4, 3, 3], // P4
  ];

  const available = [3, 3, 2];
  const totalInstances = [10, 5, 7];

  return {
    processCount: 5,
    resourceCount: 3,
    resourceNames: ['A', 'B', 'C'],
    processNames: ['P0', 'P1', 'P2', 'P3', 'P4'],
    allocation,
    max,
    need: computeNeed(max, allocation),
    available,
    totalInstances,
  };
}

/**
 * SCENARIO D1: Single-instance deadlock
 * R1 and R2 1 instance each.
 * P1 holds R1, requests R2
 * P2 holds R2, requests R1
 */
export function getScenarioD1() {
  const allocation = [
    [1, 0], // P1 (index 0)
    [0, 1], // P2 (index 1)
  ];
  const request = [
    [0, 1], // P1 requests R2
    [1, 0], // P2 requests R1
  ];
  const available = [0, 0];
  const totalInstances = [1, 1];
  const processNames = ['P1', 'P2'];
  const resourceNames = ['R1', 'R2'];

  return {
    allocation,
    request,
    available,
    totalInstances,
    processNames,
    resourceNames,
  };
}

/**
 * SCENARIO D2: Multiple-instance deadlock
 * Types A=7, B=2, C=6; Available=[0,0,0]
 */
export function getScenarioD2() {
  const allocation = [
    [0, 1, 0], // P0
    [2, 0, 0], // P1
    [3, 0, 3], // P2
    [2, 1, 1], // P3
    [0, 0, 2], // P4
  ];

  const request = [
    [0, 0, 0], // P0
    [2, 0, 2], // P1
    [0, 0, 1], // P2
    [1, 0, 0], // P3
    [0, 0, 2], // P4
  ];

  const available = [0, 0, 0];
  const totalInstances = [7, 2, 6];
  const processNames = ['P0', 'P1', 'P2', 'P3', 'P4'];
  const resourceNames = ['A', 'B', 'C'];

  return {
    allocation,
    request,
    available,
    totalInstances,
    processNames,
    resourceNames,
  };
}

/**
 * SCENARIO D2 Variant (No deadlock when P2 requests [0,0,0])
 */
export function getScenarioD2Variant() {
  const base = getScenarioD2();
  return {
    ...base,
    request: [
      [0, 0, 0], // P0
      [2, 0, 2], // P1
      [0, 0, 0], // P2 requests nothing!
      [1, 0, 0], // P3
      [0, 0, 2], // P4
    ],
  };
}

/**
 * SCENARIO D3: Multi-instance "cycle but NOT deadlock"
 * R1 has 2 instances, R2 has 1 instance.
 * P1 holds 1 R1, requests R2;
 * P2 holds R2, requests R1;
 * P3 holds 1 R1, requests nothing.
 */
export function getScenarioD3() {
  const allocation = [
    [1, 0], // P1
    [0, 1], // P2
    [1, 0], // P3
  ];

  const request = [
    [0, 1], // P1 requests R2
    [1, 0], // P2 requests R1
    [0, 0], // P3 requests nothing
  ];

  const available = [0, 0];
  const totalInstances = [2, 1];
  const processNames = ['P1', 'P2', 'P3'];
  const resourceNames = ['R1', 'R2'];

  return {
    allocation,
    request,
    available,
    totalInstances,
    processNames,
    resourceNames,
  };
}

/**
 * Runs the complete suite of Test Cases TC1 - TC6 dynamically on the pure engine.
 */
export function runAllTestCases(): TestCaseResult[] {
  const results: TestCaseResult[] = [];

  // TC1: Safe state (Scenario A base)
  {
    const state = getScenarioA();
    const safety = safetyCheck(state.allocation, state.max, state.available, state.need);
    const passed = safety.isSafe && safety.safeSequence.length === 5;
    results.push({
      id: 'TC1',
      name: 'Safe State Verification',
      condition: 'Scenario A Base: Available=[3,3,2], 5 processes with valid declared Max and Allocation',
      actualStatus: safety.status,
      actualDetail: `Safe sequence found: <${safety.safeSequenceNames.join(' → ')}> with all ${safety.steps.length} execution steps verified dynamically`,
      expectedStatus: 'SAFE',
      expectedDetail: 'Safe sequence found',
      passed,
      analysis: passed
        ? "Banker's safety algorithm confirmed all 5 processes satisfy Need <= Work and execute to completion."
        : 'Safety check failed to find expected safe sequence.',
    });
  }

  // TC2: Request exceeds Available (Scenario B)
  {
    const state = getScenarioA();
    // P0 requests [7, 4, 3]. Need is [7, 4, 3], Available is [3, 3, 2].
    const reqRes = requestResource(0, [7, 4, 3], state);
    const passed = reqRes.status === 'WAITING' && !reqRes.granted && !reqRes.rollbackPerformed;
    results.push({
      id: 'TC2',
      name: 'Request Exceeds Available (Queued)',
      condition: 'Scenario B: P0 requests [7,4,3] <= Need [7,4,3], but > Available [3,3,2]',
      actualStatus: reqRes.status,
      actualDetail: `P0 request [7,4,3] deferred: status=${reqRes.status}, queued (Available preserved at [${reqRes.newState.available.join(', ')}])`,
      expectedStatus: 'WAITING',
      expectedDetail: 'Request not granted immediately',
      passed,
      analysis: passed
        ? 'Correctly identified Request <= Need but Request > Available; deferred without altering system state.'
        : 'Request was not properly placed in WAITING state.',
    });
  }

  // TC3: Request makes state unsafe (Scenario C)
  {
    const baseState = getScenarioA();
    // From baseline Available [3,3,2], P0 requests [0, 0, 2] <= Need [7,4,3] and <= Available [3,3,2]
    // Tentative Available becomes [3, 3, 0], leaving all 5 processes unable to finish.
    const step = requestResource(0, [0, 0, 2], baseState);
    const passed =
      step.status === 'UNSAFE' &&
      !step.granted &&
      step.rollbackPerformed &&
      step.newState.available[2] === 2 && // Rolled back!
      step.trialState?.available[2] === 0;
    results.push({
      id: 'TC3',
      name: 'Request Causes Unsafe State (Rollback)',
      condition: 'Scenario C: From baseline Available=[3,3,2], P0 requests [0,0,2]; tentative Available=[3,3,0] leaves no process able to finish',
      actualStatus: step.status,
      actualDetail: `P0 trial request [0,0,2] denied: status=${step.status}, rollback restored Available to [${step.newState.available.join(', ')}] (trial was [${step.trialState?.available.join(', ')}])`,
      expectedStatus: 'UNSAFE',
      expectedDetail: 'Request denied; state unchanged',
      passed,
      analysis: passed
        ? "Banker's algorithm detected trial state [3,3,0] had no safe sequence, denied the request, and cleanly restored the original state."
        : 'Rollback or unsafe state detection failed.',
    });
  }

  // TC4: Deadlocked scenario (D2 multi-instance + D1 single-instance)
  {
    const d2 = getScenarioD2();
    const d2Result = detectDeadlockMultiInstance(d2.allocation, d2.request, d2.available, d2.processNames, d2.resourceNames);
    const d1 = getScenarioD1();
    const d1Result = detectDeadlockSingleInstance(d1.allocation, d1.request, d1.available, d1.processNames, d1.resourceNames);

    const passed =
      d2Result.hasDeadlock &&
      d2Result.deadlockedProcessNames.join(',') === 'P1,P2,P3,P4' &&
      d1Result.hasDeadlock &&
      d1Result.deadlockedProcessNames.join(',') === 'P1,P2';

    results.push({
      id: 'TC4',
      name: 'Deadlock Detection (Single & Multi-Instance)',
      condition: 'Scenario D2 (multi-instance): Available=[0,0,0], P0 completes but P1-P4 stuck; Scenario D1 (single-instance): 2-process circular wait',
      actualStatus: d2Result.hasDeadlock && d1Result.hasDeadlock ? 'DEADLOCK_DETECTED' : 'SAFE',
      actualDetail: `Multi-Instance deadlock on {${d2Result.deadlockedProcessNames.join(', ')}}; Single-Instance cycle on <${d1Result.cycleNodes?.join(' → ') || d1Result.deadlockedProcessNames.join(' → ')}>`,
      expectedStatus: 'DEADLOCK_DETECTED',
      expectedDetail: 'Deadlock identified by the selected detection method',
      passed,
      analysis: passed
        ? 'Multi-instance detection algorithm and single-instance WFG cycle detection both successfully identified the exact deadlocked process sets.'
        : 'Deadlock detection failed to locate expected deadlock sets.',
    });
  }

  // TC5: Prevention policy applied (Scenario E)
  {
    // Apply ordering policy to D1: P2 (holding R2, rank 2) requests R1 (rank 1)
    const policyCheck = checkOrderingPolicy(2, 0, [0, 1], ['R1', 'R2']); // P2 requests R1 (index 0) while holding R2 (index 1)
    const allAtOnceCheck = checkAllAtOncePolicy(1, [1, 1], [0, 0], [1, 0], ['R1', 'R2']);

    const passed = !policyCheck.allowed && policyCheck.requiresRelease && !allAtOnceCheck.allowed;

    results.push({
      id: 'TC5',
      name: 'Deadlock Prevention Protocols',
      condition: 'Scenario E: Linear ordering R1 < R2 prevents P2 from requesting R1 while holding R2; Hold-and-wait eliminated via admission gate',
      actualStatus: (!policyCheck.allowed && !allAtOnceCheck.allowed) ? 'SAFE' : 'UNSAFE',
      actualDetail: `Ordering Policy: ${policyCheck.allowed ? 'Allowed' : 'Blocked'} (${policyCheck.message}); Gate: ${allAtOnceCheck.allowed ? 'Admitted' : 'Waiting'} (${allAtOnceCheck.message})`,
      expectedStatus: 'SAFE',
      expectedDetail: 'Selected deadlock condition eliminated',
      passed,
      analysis: passed
        ? 'Prevention policies actively blocked circular wait and hold-and-wait requests before allocation, guaranteeing freedom from deadlock.'
        : 'Prevention policies failed to block violating requests.',
    });
  }

  // TC6: Boundary and invalid inputs (Scenario F)
  {
    const state = getScenarioA();

    // 1. Boundary: Request [0, 0, 0] is valid
    const reqZero = requestResource(0, [0, 0, 0], state);
    // 2. Invalid: Non-existent process ID (P9)
    const reqP9 = requestResource(9, [1, 0, 0], state);
    // 3. Invalid: Negative request
    const reqNeg = requestResource(0, [-1, 0, 0], state);
    // 4. Invalid: Request > Need
    const reqExceedNeed = requestResource(0, [8, 0, 0], state); // P0 need is [7, 4, 3]
    // 5. Invalid: Setup with Allocation > Max
    const invalidSetup = validateSetup({
      processCount: 1,
      resourceCount: 1,
      allocation: [[5]],
      max: [[2]],
      available: [0],
    });

    const passed =
      reqZero.status === 'SAFE' &&
      reqP9.status === 'INVALID_INPUT' &&
      reqNeg.status === 'INVALID_INPUT' &&
      reqExceedNeed.status === 'INVALID_INPUT' &&
      !invalidSetup.isValid;

    results.push({
      id: 'TC6',
      name: 'Boundary & Invalid Input Guardrails',
      condition: 'Scenario F: Non-existent P9, negative request [-1,0,0], request > Need, Allocation > Max, and zero vector boundary tests',
      actualStatus: (reqNeg.status === 'INVALID_INPUT' && reqExceedNeed.status === 'INVALID_INPUT' && !invalidSetup.isValid) ? 'INVALID_INPUT' : 'SAFE',
      actualDetail: `P9: ${reqP9.status}; Neg: ${reqNeg.status}; ExceedNeed: ${reqExceedNeed.status}; Alloc>Max setup valid=${invalidSetup.isValid}`,
      expectedStatus: 'INVALID_INPUT',
      expectedDetail: 'Correct handling or validation message',
      passed,
      analysis: passed
        ? 'Engine strictly enforced OS boundary conditions: zero requests handled as safe no-ops, invalid IDs and excessive claims rejected with explicit diagnostic messages.'
        : 'Validation failed to flag invalid boundary inputs correctly.',
    });
  }

  return results;
}
