/**
 * Core type definitions for DeadlockLab engine.
 * Pure OS data models for Avoidance (Banker's), Detection, Prevention and Recovery.
 */

export type SystemStatus =
  | 'SAFE'
  | 'UNSAFE'
  | 'WAITING'
  | 'DEADLOCK_DETECTED'
  | 'INVALID_INPUT'
  | 'ANALYSIS_OUT_OF_DATE';

export type RequestOutcome =
  | 'GRANTED'
  | 'WAITING'
  | 'DENIED_UNSAFE'
  | 'INVALID_INPUT'
  | 'INVALID_REQUEST';

export type CheckStatus = 'PASSED' | 'FAILED' | 'WAITING' | 'NOT_EVALUATED';

export interface RequestChecksSummary {
  format: { status: 'PASSED' | 'FAILED'; detail: string };
  need: { status: 'PASSED' | 'FAILED' | 'NOT_EVALUATED'; detail: string };
  available: { status: 'PASSED' | 'WAITING' | 'NOT_EVALUATED'; detail: string };
  safety: { status: 'PASSED' | 'FAILED' | 'NOT_EVALUATED'; detail: string };
}

export interface SystemState {
  processCount: number;
  resourceCount: number;
  resourceNames: string[]; // e.g. ['A', 'B', 'C']
  processNames: string[];  // e.g. ['P0', 'P1', 'P2', 'P3', 'P4']
  allocation: number[][];  // n x m
  max: number[][];         // n x m
  need: number[][];        // n x m, automatically computed (Max - Allocation)
  available: number[];     // length m
  totalInstances?: number[]; // optional total capacity
  accountingMode?: 'available_direct' | 'total_instances';
}

export interface SafetyStep {
  stepIndex: number;
  processId: number;
  processName: string;
  workBefore: number[];
  need: number[];
  allocation: number[];
  workAfter: number[];
  canRunReason: string;
}

export interface StuckProcessDetail {
  processId: number;
  processName: string;
  need: number[];
  workAvailable: number[];
  failingResources: {
    resourceIndex: number;
    resourceName: string;
    needAmount: number;
    workAmount: number;
    deficit: number;
  }[];
}

export interface SafetyResult {
  isSafe: boolean;
  status: 'SAFE' | 'UNSAFE';
  safeSequence: number[]; // Process indices
  safeSequenceNames: string[];
  steps: SafetyStep[];
  stuckProcesses: StuckProcessDetail[];
  finalWork: number[];
  explanation: string;
}

export interface RequestHandlingResult {
  status: SystemStatus;
  outcome: RequestOutcome;
  granted: boolean;
  message: string;
  reason: string;
  explanation: string;
  ruleCode: 'a_invalid_format' | 'b_exceeds_need' | 'c_exceeds_available' | 'd_safe_granted' | 'd_unsafe_denied';
  priorState: SystemState;
  newState: SystemState; // If granted or trial
  safetyResult?: SafetyResult;
  trialState?: SystemState;
  rollbackPerformed: boolean;
  deficit?: { resourceIndex: number; resourceName: string; requested: number; available: number }[];
  checks: RequestChecksSummary;
}

export interface DetectionStep {
  stepIndex: number;
  processId: number;
  processName: string;
  workBefore: number[];
  request: number[];
  allocation: number[];
  workAfter: number[];
  reason: string;
}

export interface DetectionResult {
  hasDeadlock: boolean;
  status: 'SAFE' | 'DEADLOCK_DETECTED';
  isSingleInstance: boolean;
  deadlockedProcessIds: number[];
  deadlockedProcessNames: string[];
  resolvedProcessIds: number[];
  steps: DetectionStep[];
  finishArray: boolean[];
  finalWork: number[];
  cycleNodes?: string[]; // for graph representation
  explanation: string;
}

export interface RAGNode {
  id: string;
  type: 'process' | 'resource';
  name: string;
  instances?: number;
  availableInstances?: number;
  isDeadlocked?: boolean;
}

export interface RAGEdge {
  id: string;
  from: string;
  to: string;
  type: 'assignment' | 'request'; // assignment: R -> P, request: P -> R
  resourceName?: string;
  count: number;
  isCycleEdge?: boolean;
}

export interface RAGGraph {
  nodes: RAGNode[];
  edges: RAGEdge[];
  cycles: string[][];
}

export interface PreventionSimulationResult {
  policy: 'standard' | 'fixed_ordering' | 'request_all_at_once';
  name: string;
  deadlockOccurred: boolean;
  resourceUtilizationPct: number;
  concurrencyLevel: number;
  avgWaitTimeUnits: number;
  starvationRisk: 'None' | 'Low' | 'Medium' | 'High';
  description: string;
  eliminatedCondition: string;
  pros: string[];
  cons: string[];
}

export interface TestCaseResult {
  id: string;
  name: string;
  condition: string;
  actualStatus: SystemStatus;
  actualDetail: string;
  expectedStatus: SystemStatus;
  expectedDetail: string;
  passed: boolean;
  analysis: string;
}
