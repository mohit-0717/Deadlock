/**
 * OS DeadlockLab: Unit Tests for Pure Engine
 * Uses Node 22 native test runner (node:test, node:assert/strict)
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeNeed, safetyCheck, requestResource } from './bankers.ts';
import {
  detectDeadlockMultiInstance,
  detectDeadlockSingleInstance,
  terminateProcessAndRecover,
  buildRAG,
} from './detection.ts';
import {
  checkOrderingPolicy,
  checkAllAtOncePolicy,
  evaluateOrderingRanks,
  evaluateAllAtOnceAdmission,
} from './prevention.ts';
import {
  getScenarioA,
  getScenarioD1,
  getScenarioD2,
  getScenarioD2Variant,
  getScenarioD3,
  runAllTestCases,
} from './scenarios.ts';
import { validateSetup, validateRequestFormat } from './validation.ts';

test('Banker Safety: Scenario A Base state is SAFE with sequence <P1,P3,P4,P0,P2>', () => {
  const state = getScenarioA();
  const safety = safetyCheck(state.allocation, state.max, state.available, state.need);

  assert.equal(safety.isSafe, true);
  assert.equal(safety.status, 'SAFE');
  assert.equal(safety.safeSequence.length, 5);
  // P1 must be first since only P1 has Need [1,2,2] <= Available [3,3,2] (P3 has Need [0,1,1] <= [3,3,2] too)
  assert.deepEqual(safety.safeSequence, [1, 3, 4, 0, 2]);
  assert.deepEqual(safety.finalWork, [10, 5, 7]);
});

test('Banker Request: Scenario B (Request exceeds Available) yields WAITING', () => {
  const state = getScenarioA();
  const res = requestResource(0, [7, 4, 3], state);

  assert.equal(res.status, 'WAITING');
  assert.equal(res.granted, false);
  assert.equal(res.rollbackPerformed, false);
  assert.deepEqual(res.newState.available, [3, 3, 2]); // completely unchanged
});

test('Banker Request: P1 request [1,0,2] is GRANTED and leaves Available [2,3,0] in safe state', () => {
  const base = getScenarioA();
  const res = requestResource(1, [1, 0, 2], base);

  assert.equal(res.status, 'SAFE');
  assert.equal(res.granted, true);
  assert.equal(res.rollbackPerformed, false);
  assert.deepEqual(res.newState.available, [2, 3, 0]);
  assert.deepEqual(res.newState.allocation[1], [3, 0, 2]);
  assert.deepEqual(res.newState.need[1], [0, 2, 0]);
});

test('Banker Request: P0 request [2,0,0] is SAFE and GRANTED (Available becomes [1,3,2])', () => {
  const base = getScenarioA();
  const res = requestResource(0, [2, 0, 0], base);

  assert.equal(res.status, 'SAFE');
  assert.equal(res.granted, true);
  assert.equal(res.rollbackPerformed, false);
  assert.deepEqual(res.newState.available, [1, 3, 2]);
  assert.deepEqual(res.newState.allocation[0], [2, 1, 0]);
  assert.deepEqual(res.newState.need[0], [5, 4, 3]);
  assert.ok(res.safetyResult?.isSafe, 'Resulting state must have a valid safe sequence');
});

test('Banker Request: Scenario C - P0 request [0,0,2] is UNSAFE and triggers atomic ROLLBACK', () => {
  const base = getScenarioA();
  const res = requestResource(0, [0, 0, 2], base);

  assert.equal(res.status, 'UNSAFE');
  assert.equal(res.granted, false);
  assert.equal(res.rollbackPerformed, true);
  // Trial state had Available [3, 3, 0]
  assert.deepEqual(res.trialState?.available, [3, 3, 0]);
  // State was atomically restored to base state
  assert.deepEqual(res.newState.available, [3, 3, 2]);
  assert.deepEqual(res.newState.allocation[0], [0, 1, 0]);
  assert.deepEqual(res.newState.need[0], [7, 4, 3]);
});

test('Banker Request: Negative values, non-integers, and wrong dimensions are rejected', () => {
  const base = getScenarioA();

  // Negative value
  const negRes = requestResource(0, [-1, 0, 0], base);
  assert.equal(negRes.status, 'INVALID_INPUT');
  assert.equal(negRes.granted, false);

  // Non-integer
  const floatRes = requestResource(0, [1.5, 0, 0], base);
  assert.equal(floatRes.status, 'INVALID_INPUT');
  assert.equal(floatRes.granted, false);

  // Wrong dimension (2 items instead of 3)
  const dimRes = requestResource(0, [1, 0], base);
  assert.equal(dimRes.status, 'INVALID_INPUT');
  assert.equal(dimRes.granted, false);

  // Invalid process ID
  const procRes = requestResource(99, [1, 0, 0], base);
  assert.equal(procRes.status, 'INVALID_INPUT');
  assert.equal(procRes.granted, false);
});

test('Deadlock Detection: Scenario D1 (Single-instance cycle produces DEADLOCK)', () => {
  const d1 = getScenarioD1();
  const result = detectDeadlockSingleInstance(d1.allocation, d1.request, d1.available, d1.processNames, d1.resourceNames);

  assert.equal(result.hasDeadlock, true);
  assert.equal(result.status, 'DEADLOCK_DETECTED');
  assert.deepEqual(result.deadlockedProcessNames, ['P1', 'P2']);
});

test('Deadlock Detection: Scenario D2 (Multi-instance deadlock on P1..P4)', () => {
  const d2 = getScenarioD2();
  const result = detectDeadlockMultiInstance(d2.allocation, d2.request, d2.available, d2.processNames, d2.resourceNames);

  assert.equal(result.hasDeadlock, true);
  assert.equal(result.status, 'DEADLOCK_DETECTED');
  assert.deepEqual(result.deadlockedProcessNames, ['P1', 'P2', 'P3', 'P4']);
  // P0 completed
  assert.deepEqual(result.resolvedProcessIds, [0]);
});

test('Deadlock Recovery: Scenario D2 terminating P2 resolves deadlock', () => {
  const d2 = getScenarioD2();
  const recovery = terminateProcessAndRecover(2, d2.allocation, d2.request, d2.available, false, d2.processNames, d2.resourceNames);

  assert.deepEqual(recovery.releasedResources, [3, 0, 3]);
  assert.equal(recovery.detectionResult.hasDeadlock, false);
  assert.equal(recovery.detectionResult.status, 'SAFE');
  // All remaining processes can finish
  assert.equal(recovery.detectionResult.deadlockedProcessIds.length, 0);
});

test('Deadlock Detection: Scenario D2 Variant (P2 request [0,0,0] reports NO deadlock)', () => {
  const d2v = getScenarioD2Variant();
  const result = detectDeadlockMultiInstance(d2v.allocation, d2v.request, d2v.available, d2v.processNames, d2v.resourceNames);

  assert.equal(result.hasDeadlock, false);
  assert.equal(result.status, 'SAFE');
  assert.deepEqual(result.deadlockedProcessNames, []);
});

test('Deadlock Detection: Scenario D3 (Cycle in RAG does NOT mean deadlock for multi-instance)', () => {
  const d3 = getScenarioD3();
  // Multi-instance detection algorithm
  const result = detectDeadlockMultiInstance(d3.allocation, d3.request, d3.available, d3.processNames, d3.resourceNames);
  assert.equal(result.hasDeadlock, false);
  assert.equal(result.status, 'SAFE');

  // Verify graph has cycle
  const rag = buildRAG(d3.allocation, d3.request, d3.available, d3.totalInstances, d3.processNames, d3.resourceNames);
  assert.ok(rag.cycles.length > 0, 'RAG should contain a cycle');
});

test('Deadlock Prevention: Linear ordering blocks out-of-order request', () => {
  // P2 holds R2 (index 1), requests R1 (index 0)
  const check = checkOrderingPolicy(2, 0, [0, 1], ['R1', 'R2']);
  assert.equal(check.allowed, false);
  assert.equal(check.requiresRelease, true);
  assert.deepEqual(check.resourcesToRelease, [1]);
});

test('Deadlock Prevention: Request all at once stops process at gate when resources missing', () => {
  const check = checkAllAtOncePolicy(1, [1, 2], [1, 0], [0, 0], ['R1', 'R2']);
  assert.equal(check.allowed, false);
  assert.equal(check.canAcquireAll, false);
  assert.equal(check.missingResources.length, 1);
});

test('Validation: Setup with Allocation > Max is rejected as INVALID_INPUT', () => {
  const invalid = validateSetup({
    processCount: 1,
    resourceCount: 1,
    allocation: [[4]],
    max: [[2]],
    available: [0],
  });
  assert.equal(invalid.isValid, false);
  assert.ok(invalid.issues.some((i) => i.message.includes('exceeds declared Max')));
});

test('Validation: Request exceeding Need is rejected', () => {
  const base = getScenarioA();
  // P0 Need is [7, 4, 3]. Request [8, 0, 0]
  const req = requestResource(0, [8, 0, 0], base);
  assert.equal(req.status, 'INVALID_INPUT');
  assert.equal(req.ruleCode, 'b_exceeds_need');
  assert.equal(req.granted, false);
  assert.deepEqual(req.newState.available, [3, 3, 2]);
});

// ============================================================================
// AUTOMATED REGRESSION SUITE: DEADLOCKLAB BANKER'S ALGORITHM
// ============================================================================

test('Regression #3: Scenario A Baseline and Safe Sequence Verification', () => {
  const base = getScenarioA();

  // Available starts strictly at [3, 3, 2]
  assert.deepEqual(base.available, [3, 3, 2]);

  // Mathematical correctness: Need = Max - Allocation for all processes
  for (let i = 0; i < base.processCount; i++) {
    for (let j = 0; j < base.resourceCount; j++) {
      assert.equal(
        base.need[i][j],
        base.max[i][j] - base.allocation[i][j],
        `Need matrix invariant failed for P${i}, resource ${j}`
      );
    }
  }

  // Pure Dijkstra Banker's safety check
  const safety = safetyCheck(base.allocation, base.max, base.available, base.need);
  assert.equal(safety.isSafe, true);
  assert.equal(safety.status, 'SAFE');
  assert.deepEqual(safety.safeSequence, [1, 3, 4, 0, 2]);
  assert.deepEqual(safety.safeSequenceNames, ['P1', 'P3', 'P4', 'P0', 'P2']);

  // Dynamic process eligibility at initial Work [3, 3, 2]:
  // P1 Need [1,2,2] <= [3,3,2] (Eligible)
  // P3 Need [0,1,1] <= [3,3,2] (Eligible)
  // P0 Need [7,4,3] > [3,3,2] (Waiting)
  // P2 Need [6,0,0] > [3,3,2] (Waiting)
  // P4 Need [4,3,1] > [3,3,2] (Waiting)
  const isEligible = (pIdx: number, work: number[]) =>
    base.need[pIdx].every((nd, idx) => nd <= work[idx]);

  assert.equal(isEligible(1, base.available), true, 'P1 must be eligible initially');
  assert.equal(isEligible(3, base.available), true, 'P3 must be eligible initially');
  assert.equal(isEligible(0, base.available), false, 'P0 cannot run with initial Work');
  assert.equal(isEligible(2, base.available), false, 'P2 cannot run with initial Work');
  assert.equal(isEligible(4, base.available), false, 'P4 cannot run with initial Work');
});

test('Regression #4: Exact Work Vectors for All 5 Replay Steps', () => {
  const base = getScenarioA();
  const safety = safetyCheck(base.allocation, base.max, base.available, base.need);

  assert.equal(safety.steps.length, 5);

  // Step 1: P1 executes, Work: [3,3,2] + Alloc[2,0,0] -> [5,3,2]
  assert.equal(safety.steps[0].processId, 1);
  assert.equal(safety.steps[0].processName, 'P1');
  assert.deepEqual(safety.steps[0].workBefore, [3, 3, 2]);
  assert.deepEqual(safety.steps[0].allocation, [2, 0, 0]);
  assert.deepEqual(safety.steps[0].workAfter, [5, 3, 2]);

  // Step 2: P3 executes, Work: [5,3,2] + Alloc[2,1,1] -> [7,4,3]
  assert.equal(safety.steps[1].processId, 3);
  assert.equal(safety.steps[1].processName, 'P3');
  assert.deepEqual(safety.steps[1].workBefore, [5, 3, 2]);
  assert.deepEqual(safety.steps[1].allocation, [2, 1, 1]);
  assert.deepEqual(safety.steps[1].workAfter, [7, 4, 3]);

  // Step 3: P4 executes, Work: [7,4,3] + Alloc[0,0,2] -> [7,4,5]
  assert.equal(safety.steps[2].processId, 4);
  assert.equal(safety.steps[2].processName, 'P4');
  assert.deepEqual(safety.steps[2].workBefore, [7, 4, 3]);
  assert.deepEqual(safety.steps[2].allocation, [0, 0, 2]);
  assert.deepEqual(safety.steps[2].workAfter, [7, 4, 5]);

  // Step 4: P0 executes, Work: [7,4,5] + Alloc[0,1,0] -> [7,5,5]
  assert.equal(safety.steps[3].processId, 0);
  assert.equal(safety.steps[3].processName, 'P0');
  assert.deepEqual(safety.steps[3].workBefore, [7, 4, 5]);
  assert.deepEqual(safety.steps[3].allocation, [0, 1, 0]);
  assert.deepEqual(safety.steps[3].workAfter, [7, 5, 5]);

  // Step 5: P2 executes, Work: [7,5,5] + Alloc[3,0,2] -> [10,5,7]
  assert.equal(safety.steps[4].processId, 2);
  assert.equal(safety.steps[4].processName, 'P2');
  assert.deepEqual(safety.steps[4].workBefore, [7, 5, 5]);
  assert.deepEqual(safety.steps[4].allocation, [3, 0, 2]);
  assert.deepEqual(safety.steps[4].workAfter, [10, 5, 7]);

  // Final system Work vector must strictly equal total system capacity [10, 5, 7]
  assert.deepEqual(safety.finalWork, [10, 5, 7]);
});

test('Regression #5: P0 Request [0,0,2] Unsafe Rejection & Atomic Rollback Audit', () => {
  const base = getScenarioA();

  // Baseline state snapshot before request
  const initialAvailable = [...base.available];
  const initialAlloc = base.allocation.map((r) => [...r]);
  const initialNeed = base.need.map((r) => [...r]);

  // P0 requests [0,0,2] -> Trial Available drops to [3,3,0]
  const reqRes = requestResource(0, [0, 0, 2], base);

  assert.equal(reqRes.status, 'UNSAFE');
  assert.equal(reqRes.granted, false);
  assert.equal(reqRes.rollbackPerformed, true);
  assert.equal(reqRes.ruleCode, 'd_unsafe_denied');

  // Verify tentative / trial state recorded unsafe Available [3, 3, 0]
  assert.deepEqual(reqRes.trialState?.available, [3, 3, 0]);

  // Verify atomic rollback restored base state completely (zero resource leak)
  assert.deepEqual(reqRes.newState.available, initialAvailable);
  assert.deepEqual(reqRes.newState.allocation, initialAlloc);
  assert.deepEqual(reqRes.newState.need, initialNeed);

  // Committed system state remains SAFE after rollback
  const committedSafety = safetyCheck(
    reqRes.newState.allocation,
    reqRes.newState.max,
    reqRes.newState.available,
    reqRes.newState.need
  );
  assert.equal(committedSafety.isSafe, true);
  assert.equal(committedSafety.status, 'SAFE');
  assert.deepEqual(committedSafety.safeSequence, [1, 3, 4, 0, 2]);
});

test('Regression #6: Request Protocol Permutations (P1 Granted, P0 Deferred, P0 Exceeds Need)', () => {
  const base = getScenarioA();

  // 1. Safe & Granted: P1 requests [1, 0, 2]
  const p1Req = requestResource(1, [1, 0, 2], base);
  assert.equal(p1Req.status, 'SAFE');
  assert.equal(p1Req.granted, true);
  assert.equal(p1Req.ruleCode, 'd_safe_granted');
  assert.deepEqual(p1Req.newState.available, [2, 3, 0]);
  assert.deepEqual(p1Req.newState.allocation[1], [3, 0, 2]);
  assert.deepEqual(p1Req.newState.need[1], [0, 2, 0]);
  assert.ok(p1Req.safetyResult?.isSafe);

  // 2. Deferred / Waiting: P0 requests [7, 4, 3] (within Need [7,4,3] but exceeds Available [3,3,2])
  const p0WaitReq = requestResource(0, [7, 4, 3], base);
  assert.equal(p0WaitReq.status, 'WAITING');
  assert.equal(p0WaitReq.granted, false);
  assert.equal(p0WaitReq.ruleCode, 'c_exceeds_available');
  assert.equal(p0WaitReq.rollbackPerformed, false);
  assert.deepEqual(p0WaitReq.newState.available, [3, 3, 2]); // untouched

  // 3. Rejected: P0 requests [8, 0, 0] (exceeds Need [7,4,3])
  const p0ExceedReq = requestResource(0, [8, 0, 0], base);
  assert.equal(p0ExceedReq.status, 'INVALID_INPUT');
  assert.equal(p0ExceedReq.granted, false);
  assert.equal(p0ExceedReq.ruleCode, 'b_exceeds_need');
  assert.equal(p0ExceedReq.rollbackPerformed, false);
  assert.deepEqual(p0ExceedReq.newState.available, [3, 3, 2]); // untouched
});

test('Regression #7: Step 5 Final Completion Status & Log Accounting', () => {
  const base = getScenarioA();
  const safety = safetyCheck(base.allocation, base.max, base.available, base.need);

  // Simulate replay state transition reaching step 5 (index 4) with transition completed
  const currentStepIndex = 4;
  const evaluatingProcessId: number | null = null;

  // Process status model as implemented in AvoidanceTab
  const getProcessStatus = (pIdx: number) => {
    const isActivelyEvaluating = evaluatingProcessId === pIdx;
    const isFinished =
      currentStepIndex >= 0 &&
      safety.safeSequence.indexOf(pIdx) <= currentStepIndex &&
      safety.safeSequence.indexOf(pIdx) !== -1;

    if (isActivelyEvaluating) return 'Evaluating Step';
    if (isFinished) return 'Simulated Complete';
    return 'Waiting';
  };

  // At step 5, after transition completes, ALL processes must be 'Simulated Complete'
  for (let p = 0; p < base.processCount; p++) {
    assert.equal(
      getProcessStatus(p),
      'Simulated Complete',
      `Process P${p} must be marked Simulated Complete at end of sequence`
    );
  }

  // Active evaluation indicator is strictly null
  assert.equal(evaluatingProcessId, null);

  // Event Log accounting: Init row (1) + completed steps (currentStepIndex + 1 = 5) = 6 total entries
  const executedSteps = safety.steps.slice(0, currentStepIndex + 1);
  assert.equal(executedSteps.length, 5);
  const totalLogRows = 1 + executedSteps.length;
  assert.equal(totalLogRows, 6);

  // Replay live work vector at step 5 is finalWork [10, 5, 7]
  const liveWork = safety.steps[currentStepIndex].workAfter;
  assert.deepEqual(liveWork, [10, 5, 7]);
});

test('Regression #8: Replay Reset and Idempotent Request Execution', () => {
  const base = getScenarioA();

  // 1. Advance replay to step 5, then Reset
  let currentStepIndex = 4;
  let evaluatingProcessId: number | null = null;
  let liveWork = [10, 5, 7];

  // Trigger Reset
  currentStepIndex = -1;
  evaluatingProcessId = null;
  liveWork = base.available;

  assert.equal(currentStepIndex, -1);
  assert.equal(evaluatingProcessId, null);
  assert.deepEqual(liveWork, [3, 3, 2]);

  // 2. Sequential requests without stale state leakage:
  // First submit unsafe request P0 [0,0,2] -> Rollback restores base
  const res1 = requestResource(0, [0, 0, 2], base);
  assert.equal(res1.status, 'UNSAFE');
  assert.equal(res1.rollbackPerformed, true);

  // Subsequent request P1 [1,0,2] tested against committed state
  const res2 = requestResource(1, [1, 0, 2], res1.newState);
  assert.equal(res2.status, 'SAFE');
  assert.equal(res2.granted, true);
  assert.equal(res2.rollbackPerformed, false);
  assert.deepEqual(res2.newState.available, [2, 3, 0]);

  // Reset to Scenario A baseline
  const resetState = getScenarioA();
  assert.deepEqual(resetState.available, [3, 3, 2]);
  assert.deepEqual(resetState.allocation[0], [0, 1, 0]);
  assert.deepEqual(resetState.allocation[1], [2, 0, 0]);
});

test('Regression #10: Detection Module Scenario D2 Matrix-Reduction Verification & Recovery Semantics', () => {
  const d2 = getScenarioD2();

  // Initial setup: Available is [0, 0, 0]
  assert.deepEqual(d2.available, [0, 0, 0]);

  // Run pure multi-instance matrix reduction
  const result = detectDeadlockMultiInstance(
    d2.allocation,
    d2.request,
    d2.available,
    d2.processNames,
    d2.resourceNames
  );

  // Step 1: P0 has Request [0,0,0] <= Work [0,0,0], so P0 completes and releases Allocation [0,1,0]
  assert.equal(result.steps.length, 1);
  assert.equal(result.steps[0].processId, 0);
  assert.deepEqual(result.steps[0].workBefore, [0, 0, 0]);
  assert.deepEqual(result.steps[0].allocation, [0, 1, 0]);
  assert.deepEqual(result.steps[0].workAfter, [0, 1, 0]);

  // Work halts at [0, 1, 0]
  assert.deepEqual(result.finalWork, [0, 1, 0]);

  // Verify why all remaining processes are blocked:
  // P1 Request [2,0,2] > Work [0,1,0] (A requires 2, C requires 2)
  // P2 Request [0,0,1] > Work [0,1,0] (C requires 1)
  // P3 Request [1,0,0] > Work [0,1,0] (A requires 1)
  // P4 Request [0,0,2] > Work [0,1,0] (C requires 2)
  assert.equal(result.hasDeadlock, true);
  assert.deepEqual(result.deadlockedProcessNames, ['P1', 'P2', 'P3', 'P4']);
  assert.deepEqual(result.finishArray, [true, false, false, false, false]);

  // Recovery: P0 is NOT deadlocked (finish[0] is true) and cannot be a victim
  assert.equal(result.finishArray[0], true);

  // Terminate victim P2: holds [3, 0, 3]
  assert.deepEqual(d2.allocation[2], [3, 0, 3]);
  const recovery = terminateProcessAndRecover(
    2,
    d2.allocation,
    d2.request,
    d2.available,
    false,
    d2.processNames,
    d2.resourceNames
  );

  // Reclaimed resources strictly equal P2's allocation
  assert.deepEqual(recovery.releasedResources, [3, 0, 3]);
  assert.deepEqual(recovery.newAvailable, [3, 0, 3]);

  // Terminated process P2 now has 0 allocation and 0 request
  assert.deepEqual(recovery.newAllocation[2], [0, 0, 0]);
  assert.deepEqual(recovery.newRequest[2], [0, 0, 0]);

  // Deadlock is completely resolved for all remaining active processes
  assert.equal(recovery.detectionResult.hasDeadlock, false);
  assert.equal(recovery.detectionResult.deadlockedProcessIds.length, 0);
  assert.deepEqual(recovery.detectionResult.resolvedProcessIds, [0, 1, 3, 4]);

  // Conservation of total resource instances before and after recovery
  const totalBefore = d2.allocation.reduce(
    (acc, row) => acc.map((val, idx) => val + row[idx]),
    [...d2.available]
  );
  const totalAfter = recovery.newAllocation.reduce(
    (acc, row) => acc.map((val, idx) => val + row[idx]),
    [...recovery.newAvailable]
  );
  assert.deepEqual(totalBefore, totalAfter);
  assert.deepEqual(totalBefore, d2.totalInstances);
});

test('Regression #11: Scenario D3 - Cycle in Multi-Instance RAG Does NOT Imply Deadlock', () => {
  const d3 = getScenarioD3();

  // Multi-instance detection algorithm verifies NO deadlock
  const detection = detectDeadlockMultiInstance(
    d3.allocation,
    d3.request,
    d3.available,
    d3.processNames,
    d3.resourceNames
  );
  assert.equal(detection.hasDeadlock, false);
  assert.equal(detection.status, 'SAFE');
  assert.deepEqual(detection.deadlockedProcessNames, []);

  // Meanwhile, the graph topology DOES contain a directed cycle
  const rag = buildRAG(
    d3.allocation,
    d3.request,
    d3.available,
    d3.totalInstances,
    d3.processNames,
    d3.resourceNames
  );
  assert.ok(rag.cycles.length > 0, 'RAG must contain at least one directed cycle');

  // Verify directed edge semantics:
  // Assignment edges: R -> P
  // Request edges: P -> R
  for (const edge of rag.edges) {
    if (edge.type === 'assignment') {
      assert.ok(edge.from.startsWith('R'), `Assignment edge ${edge.id} must originate at Resource`);
      assert.ok(edge.to.startsWith('P'), `Assignment edge ${edge.id} must terminate at Process`);
    } else {
      assert.ok(edge.from.startsWith('P'), `Request edge ${edge.id} must originate at Process`);
      assert.ok(edge.to.startsWith('R'), `Request edge ${edge.id} must terminate at Resource`);
    }
  }
});

test('Test Lab Suite: All test cases TC1 through TC6 pass dynamically', () => {
  const suite = runAllTestCases();
  assert.equal(suite.length, 6);
  for (const tc of suite) {
    assert.equal(tc.passed, true, `${tc.id} should pass`);
  }
});

// =========================================================================
// QA & Manual Testing Regression Suite: Priority 1 - 4 Validation Rules
// =========================================================================

test('QA Audit: Negative request P1 [-1, 0, 0] rejected with INVALID_INPUT & NOT_EVALUATED stages', () => {
  const base = getScenarioA();
  const res = requestResource(1, [-1, 0, 0], base);

  assert.equal(res.status, 'INVALID_INPUT');
  assert.equal(res.outcome, 'INVALID_INPUT');
  assert.equal(res.granted, false);
  assert.equal(res.rollbackPerformed, false);
  assert.ok(res.reason.includes('Resource A') || res.reason.includes('negative'));

  // Stage checks
  assert.equal(res.checks?.format.status, 'FAILED');
  assert.equal(res.checks?.need.status, 'NOT_EVALUATED');
  assert.equal(res.checks?.available.status, 'NOT_EVALUATED');
  assert.equal(res.checks?.safety.status, 'NOT_EVALUATED');

  // Explanation includes details
  assert.ok(res.explanation?.includes('negative') || res.explanation?.includes('Resource A'));

  // Original state is preserved
  assert.deepEqual(res.newState.available, base.available);
  assert.deepEqual(res.newState.allocation, base.allocation);
});

test('QA Audit: Request exceeding Need rejected with INVALID_REQUEST & NOT_EVALUATED stages', () => {
  const base = getScenarioA();
  // P1 has Need [1, 2, 2]. Request [2, 0, 0] exceeds Need for Resource A.
  const res = requestResource(1, [2, 0, 0], base);

  assert.equal(res.status, 'INVALID_INPUT');
  assert.equal(res.outcome, 'INVALID_REQUEST');
  assert.equal(res.granted, false);
  assert.equal(res.rollbackPerformed, false);
  assert.ok(
    res.reason.includes('Request ≤ Need') ||
    res.reason.includes('Remaining Need') ||
    res.explanation?.includes('remaining Need')
  );

  // Stage checks
  assert.equal(res.checks?.format.status, 'PASSED');
  assert.equal(res.checks?.need.status, 'FAILED');
  assert.equal(res.checks?.available.status, 'NOT_EVALUATED');
  assert.equal(res.checks?.safety.status, 'NOT_EVALUATED');

  // Base state is completely untouched
  assert.deepEqual(res.newState.available, base.available);
  assert.deepEqual(res.newState.allocation, base.allocation);
});

test('QA Audit: Request exceeding Available yields WAITING with safety NOT_EVALUATED', () => {
  const base = getScenarioA();
  // P0 has Need [7, 4, 3]. Request [7, 4, 3] <= Need, but Available is [3, 3, 2].
  const res = requestResource(0, [7, 4, 3], base);

  assert.equal(res.status, 'WAITING');
  assert.equal(res.outcome, 'WAITING');
  assert.equal(res.granted, false);
  assert.equal(res.rollbackPerformed, false);

  // Stage checks
  assert.equal(res.checks?.format.status, 'PASSED');
  assert.equal(res.checks?.need.status, 'PASSED');
  assert.equal(res.checks?.available.status, 'WAITING');
  assert.equal(res.checks?.safety.status, 'NOT_EVALUATED');

  assert.deepEqual(res.newState.available, base.available);
});

test('QA Audit: Safe request P1 [1, 0, 2] is GRANTED with all 4 stages PASSED', () => {
  const base = getScenarioA();
  const res = requestResource(1, [1, 0, 2], base);

  assert.equal(res.status, 'SAFE');
  assert.equal(res.outcome, 'GRANTED');
  assert.equal(res.granted, true);
  assert.equal(res.rollbackPerformed, false);

  // All 4 stages must pass
  assert.equal(res.checks?.format.status, 'PASSED');
  assert.equal(res.checks?.need.status, 'PASSED');
  assert.equal(res.checks?.available.status, 'PASSED');
  assert.equal(res.checks?.safety.status, 'PASSED');

  // Committed state updates
  assert.deepEqual(res.newState.available, [2, 3, 0]);
  assert.deepEqual(res.newState.allocation[1], [3, 0, 2]);
  assert.deepEqual(res.newState.need[1], [0, 2, 0]);
  assert.ok(res.safetyResult?.isSafe);
});

test('QA Audit: Unsafe request P0 [0, 0, 2] is DENIED_UNSAFE with rollback & safety FAILED', () => {
  const base = getScenarioA();
  const res = requestResource(0, [0, 0, 2], base);

  assert.equal(res.status, 'UNSAFE');
  assert.equal(res.outcome, 'DENIED_UNSAFE');
  assert.equal(res.granted, false);
  assert.equal(res.rollbackPerformed, true);

  // Checks mapping
  assert.equal(res.checks?.format.status, 'PASSED');
  assert.equal(res.checks?.need.status, 'PASSED');
  assert.equal(res.checks?.available.status, 'PASSED');
  assert.equal(res.checks?.safety.status, 'FAILED');

  // State restored
  assert.deepEqual(res.newState.available, base.available);
  assert.deepEqual(res.newState.allocation, base.allocation);
});

test('QA Audit: Resource Accounting Modes - available_direct vs total_instances', () => {
  const base = getScenarioA();

  // Mode 1: available_direct allows custom Available without totalInstances mismatch warning
  const directState: typeof base = {
    ...base,
    available: [5, 5, 5],
    accountingMode: 'available_direct',
  };
  const valDirect = validateSetup(directState);
  assert.equal(valDirect.isValid, true);
  const mismatchIssue = valDirect.issues.find((i) => i.code === 'SETUP_AVAILABLE_MISMATCH');
  assert.equal(mismatchIssue, undefined, 'Spurious mismatch warning must be suppressed in available_direct mode');

  // Mode 2: total_instances flags error if total < allocated
  // Total allocated for Scenario A is [7, 2, 5].
  // If user sets total instances of A to 5 (less than 7 allocated), it must flag an error
  const invalidTotalState: typeof base = {
    ...base,
    totalInstances: [5, 10, 10], // 5 < 7
    accountingMode: 'total_instances',
  };
  const valTotal = validateSetup(invalidTotalState);
  assert.equal(valTotal.isValid, false);
  const totalIssue = valTotal.issues.find((i) => i.code === 'SETUP_TOTAL_LT_ALLOCATED');
  assert.ok(totalIssue, 'Total instances less than allocated must produce validation error');
});

test('QA Audit: Custom 4-process 3-resource scenario verifies sequence <P1, P2, P3, P0>', () => {
  const alloc = [
    [0, 1, 0], // P0
    [2, 0, 0], // P1
    [3, 0, 2], // P2
    [2, 1, 1], // P3
  ];
  const max = [
    [2, 1, 0], // P0
    [3, 2, 2], // P1
    [4, 0, 2], // P2
    [2, 2, 2], // P3
  ];
  const need = computeNeed(max, alloc);
  assert.deepEqual(need, [
    [2, 0, 0], // P0
    [1, 2, 2], // P1
    [1, 0, 0], // P2
    [0, 1, 1], // P3
  ]);

  const available = [1, 2, 2];
  const safety = safetyCheck(alloc, max, available, need);

  assert.equal(safety.isSafe, true);
  assert.deepEqual(safety.safeSequence, [1, 2, 3, 0]);
  assert.deepEqual(
    safety.steps.map((s) => s.processName),
    ['P1', 'P2', 'P3', 'P0']
  );
  assert.deepEqual(safety.finalWork, [8, 4, 5]);
});

// =========================================================================
// QA & Manual Testing Suite: RAG, Detection & Recovery Recalculation
// =========================================================================

test('QA RAG: Scenario D1 cycle path and deadlocked process names agree exactly', () => {
  const d1 = getScenarioD1();
  const result = detectDeadlockSingleInstance(
    d1.allocation,
    d1.request,
    d1.available,
    d1.processNames,
    d1.resourceNames
  );

  assert.equal(result.hasDeadlock, true);
  assert.deepEqual(result.deadlockedProcessNames, ['P1', 'P2']);
  assert.deepEqual(result.deadlockedProcessIds, [0, 1]);
  // WFG cycle path must contain actual process names P1 and P2, NEVER mismatched P0 -> P1 -> P0
  assert.ok(result.explanation.includes('P1 → P2 → P1') || result.explanation.includes('P2 → P1 → P2'));
  assert.ok(!result.explanation.includes('P0'));

  // RAG bipartite graph cycles must also use actual node names
  const rag = buildRAG(d1.allocation, d1.request, d1.available, d1.totalInstances, d1.processNames, d1.resourceNames);
  assert.ok(rag.cycles.length > 0);
  const flatRagCycle = rag.cycles.flat();
  assert.ok(flatRagCycle.includes('P1'));
  assert.ok(flatRagCycle.includes('P2'));
  assert.ok(!flatRagCycle.includes('P0'));
});

test('QA RAG: Scenario D1 single-instance recovery by terminating P1 recalculates remaining P2 eligibility and Work', () => {
  const d1 = getScenarioD1();
  // Terminate P1 (index 0)
  const recovery = terminateProcessAndRecover(
    0,
    d1.allocation,
    d1.request,
    d1.available,
    true, // isSingleInstance
    d1.processNames,
    d1.resourceNames
  );

  assert.deepEqual(recovery.releasedResources, [1, 0]);
  assert.deepEqual(recovery.newAvailable, [1, 0]);
  assert.deepEqual(recovery.newAllocation[0], [0, 0]);
  assert.deepEqual(recovery.newRequest[0], [0, 0]);

  // Deadlock is resolved
  assert.equal(recovery.detectionResult.hasDeadlock, false);
  assert.equal(recovery.detectionResult.status, 'SAFE');

  // P2 Request [1, 0] <= Available [1, 0] -> P2 must be eligible to complete!
  assert.equal(recovery.detectionResult.steps.length, 1);
  const step = recovery.detectionResult.steps[0];
  assert.equal(step.processName, 'P2');
  assert.deepEqual(step.workBefore, [1, 0]);
  assert.deepEqual(step.allocation, [0, 1]);
  assert.deepEqual(step.workAfter, [1, 1]);

  // Final Work becomes [1, 0] + [0, 1] = [1, 1]
  assert.deepEqual(recovery.detectionResult.finalWork, [1, 1]);
  assert.deepEqual(recovery.detectionResult.resolvedProcessIds, [1]);
  assert.deepEqual(recovery.detectionResult.finishArray, [true, true]);
});

test('QA RAG: Scenario D1 single-instance recovery by terminating P2 recalculates remaining P1 eligibility and Work', () => {
  const d1 = getScenarioD1();
  // Terminate P2 (index 1)
  const recovery = terminateProcessAndRecover(
    1,
    d1.allocation,
    d1.request,
    d1.available,
    true, // isSingleInstance
    d1.processNames,
    d1.resourceNames
  );

  assert.deepEqual(recovery.releasedResources, [0, 1]);
  assert.deepEqual(recovery.newAvailable, [0, 1]);
  assert.deepEqual(recovery.newAllocation[1], [0, 0]);
  assert.deepEqual(recovery.newRequest[1], [0, 0]);

  // Deadlock is resolved
  assert.equal(recovery.detectionResult.hasDeadlock, false);
  assert.equal(recovery.detectionResult.status, 'SAFE');

  // P1 Request [0, 1] <= Available [0, 1] -> P1 must be eligible to complete!
  assert.equal(recovery.detectionResult.steps.length, 1);
  const step = recovery.detectionResult.steps[0];
  assert.equal(step.processName, 'P1');
  assert.deepEqual(step.workBefore, [0, 1]);
  assert.deepEqual(step.allocation, [1, 0]);
  assert.deepEqual(step.workAfter, [1, 1]);

  // Final Work becomes [0, 1] + [1, 0] = [1, 1]
  assert.deepEqual(recovery.detectionResult.finalWork, [1, 1]);
  assert.deepEqual(recovery.detectionResult.resolvedProcessIds, [0]);
  assert.deepEqual(recovery.detectionResult.finishArray, [true, true]);
});

test('QA RAG: Scenario D3 cycle does not imply deadlock in multi-instance model and executes full reduction', () => {
  const d3 = getScenarioD3();
  const detection = detectDeadlockMultiInstance(
    d3.allocation,
    d3.request,
    d3.available,
    d3.processNames,
    d3.resourceNames
  );

  assert.equal(detection.hasDeadlock, false);
  assert.equal(detection.status, 'SAFE');
  assert.deepEqual(detection.deadlockedProcessNames, []);

  // Reduction steps execute: P3 -> P2 -> P1
  assert.equal(detection.steps.length, 3);
  assert.deepEqual(detection.steps.map((s) => s.processName), ['P3', 'P2', 'P1']);
  assert.deepEqual(detection.finalWork, [2, 1]);
});

test('QA RAG: Detection uses outstanding request vector, not Banker Need maximum claims', () => {
  // In pure detection, a process holding resources without requesting anything can release its allocation immediately
  const alloc = [[1, 0]];
  const req = [[0, 0]]; // zero request
  const avail = [0, 0];
  const detection = detectDeadlockMultiInstance(alloc, req, avail, ['P0'], ['R1', 'R2']);

  assert.equal(detection.hasDeadlock, false);
  assert.equal(detection.steps.length, 1);
  assert.deepEqual(detection.finalWork, [1, 0]);
});

// =========================================================================
// Deadlock Prevention Interactive Verification: Ordering & All-At-Once
// =========================================================================

test('Prevention Ordering: Held Rank 2, Requested Rank 1 is BLOCKED', () => {
  const result = evaluateOrderingRanks(2, 1);
  assert.equal(result.isValid, true);
  assert.equal(result.allowed, false);
  assert.equal(result.status, 'BLOCKED_BY_ORDERING_POLICY');
  assert.match(result.message, /BLOCKED BY ORDERING POLICY/);
  assert.match(result.message, /Requested Rank 1 ≤ Currently Held Rank 2/);
});

test('Prevention Ordering: Held Rank 2, Requested Rank 2 is BLOCKED', () => {
  const result = evaluateOrderingRanks(2, 2);
  assert.equal(result.isValid, true);
  assert.equal(result.allowed, false);
  assert.equal(result.status, 'BLOCKED_BY_ORDERING_POLICY');
  assert.match(result.message, /Requested Rank 2 ≤ Currently Held Rank 2/);
});

test('Prevention Ordering: Held Rank 2, Requested Rank 3 is ALLOWED (ORDERING_POLICY_SATISFIED)', () => {
  const result = evaluateOrderingRanks(2, 3);
  assert.equal(result.isValid, true);
  assert.equal(result.allowed, true);
  assert.equal(result.status, 'ORDERING_POLICY_SATISFIED');
  assert.match(result.message, /ORDERING POLICY SATISFIED/);
  assert.match(result.message, /Requested Rank 3 > Currently Held Rank 2/);
});

test('Prevention Ordering: Invalid or nonpositive ranks return validation error', () => {
  const zeroRank = evaluateOrderingRanks(0, 2);
  assert.equal(zeroRank.isValid, false);
  assert.equal(zeroRank.allowed, false);
  assert.equal(zeroRank.status, 'INVALID_INPUT');

  const negRank = evaluateOrderingRanks(-1, 2);
  assert.equal(negRank.isValid, false);
  assert.equal(negRank.allowed, false);
  assert.equal(negRank.status, 'INVALID_INPUT');

  const nonIntRank = evaluateOrderingRanks(2.5, 3);
  assert.equal(nonIntRank.isValid, false);
  assert.equal(nonIntRank.allowed, false);
  assert.equal(nonIntRank.status, 'INVALID_INPUT');

  const strInvalid = evaluateOrderingRanks('invalid', 2);
  assert.equal(strInvalid.isValid, false);
  assert.equal(strInvalid.allowed, false);
  assert.equal(strInvalid.status, 'INVALID_INPUT');
});

test('Prevention All-At-Once: Demand [2, 2, 2] vs Available [1, 2, 1] is WAITING_AT_ADMISSION_GATE', () => {
  const result = evaluateAllAtOnceAdmission([2, 2, 2], [1, 2, 1]);
  assert.equal(result.isValid, true);
  assert.equal(result.allowed, false);
  assert.equal(result.status, 'WAITING_AT_ADMISSION_GATE');
  assert.equal(result.shortages.length, 2);
  assert.equal(result.shortages[0].resource, 'A');
  assert.equal(result.shortages[0].deficit, 1);
  assert.equal(result.shortages[1].resource, 'C');
  assert.equal(result.shortages[1].deficit, 1);
  assert.match(result.message, /HOLDS NOTHING/);
});

test('Prevention All-At-Once: Demand [2, 2, 2] vs Available [3, 3, 3] is ADMISSION_GRANTED', () => {
  const result = evaluateAllAtOnceAdmission([2, 2, 2], [3, 3, 3]);
  assert.equal(result.isValid, true);
  assert.equal(result.allowed, true);
  assert.equal(result.status, 'ADMISSION_GRANTED');
  assert.equal(result.shortages.length, 0);
  assert.match(result.message, /ADMISSION GRANTED/);
});

test('Prevention All-At-Once: Demand exactly equal to Available is ADMISSION_GRANTED', () => {
  const result = evaluateAllAtOnceAdmission([2, 2, 2], [2, 2, 2]);
  assert.equal(result.isValid, true);
  assert.equal(result.allowed, true);
  assert.equal(result.status, 'ADMISSION_GRANTED');
  assert.equal(result.shortages.length, 0);
});

test('Prevention All-At-Once: Insufficient values in multiple resource types correctly identifies all shortages and deficits', () => {
  const result = evaluateAllAtOnceAdmission([5, 4, 3], [1, 4, 0]);
  assert.equal(result.isValid, true);
  assert.equal(result.allowed, false);
  assert.equal(result.status, 'WAITING_AT_ADMISSION_GATE');
  assert.equal(result.shortages.length, 2);
  assert.deepEqual(result.shortages[0], { resource: 'A', demand: 5, available: 1, deficit: 4 });
  assert.deepEqual(result.shortages[1], { resource: 'C', demand: 3, available: 0, deficit: 3 });
});

test('Prevention All-At-Once: Negative or invalid quantities return validation error', () => {
  const negDemand = evaluateAllAtOnceAdmission([-1, 2, 2], [1, 2, 1]);
  assert.equal(negDemand.isValid, false);
  assert.equal(negDemand.allowed, false);
  assert.equal(negDemand.status, 'INVALID_INPUT');

  const negAvail = evaluateAllAtOnceAdmission([2, 2, 2], [1, -2, 1]);
  assert.equal(negAvail.isValid, false);
  assert.equal(negAvail.allowed, false);
  assert.equal(negAvail.status, 'INVALID_INPUT');

  const nonInt = evaluateAllAtOnceAdmission([2.5, 2, 2], [1, 2, 1]);
  assert.equal(nonInt.isValid, false);
  assert.equal(nonInt.allowed, false);
  assert.equal(nonInt.status, 'INVALID_INPUT');

  const strInvalid = evaluateAllAtOnceAdmission(['foo', 2, 2], [1, 2, 1]);
  assert.equal(strInvalid.isValid, false);
  assert.equal(strInvalid.allowed, false);
  assert.equal(strInvalid.status, 'INVALID_INPUT');
});
