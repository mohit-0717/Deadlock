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
import { checkOrderingPolicy, checkAllAtOncePolicy } from './prevention.ts';
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

test('Banker Request: Scenario C (P1 grants, P0 causes Unsafe -> Denied & Rollback)', () => {
  const base = getScenarioA();
  // Step 1: P1 requests [1, 0, 2]
  const step1 = requestResource(1, [1, 0, 2], base);
  assert.equal(step1.status, 'SAFE');
  assert.equal(step1.granted, true);
  assert.deepEqual(step1.newState.available, [2, 3, 0]);

  // Step 2: P0 requests [0, 2, 0]
  const step2 = requestResource(0, [0, 2, 0], step1.newState);
  assert.equal(step2.status, 'UNSAFE');
  assert.equal(step2.granted, false);
  assert.equal(step2.rollbackPerformed, true);
  // Ensure state rolled back to before P0's request
  assert.deepEqual(step2.newState.available, [2, 3, 0]);
  assert.deepEqual(step2.newState.allocation[0], [0, 1, 0]);
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
});

test('Test Lab Suite: All test cases TC1 through TC6 pass dynamically', () => {
  const suite = runAllTestCases();
  assert.equal(suite.length, 6);
  for (const tc of suite) {
    assert.equal(tc.passed, true, `${tc.id} should pass`);
  }
});
