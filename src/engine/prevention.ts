/**
 * OS DeadlockLab: Deadlock Prevention Engine
 *
 * Deadlock prevention eliminates at least ONE of the four Coffman conditions:
 * 1. Mutual Exclusion (cannot usually be denied for physical resources like printers/locks)
 * 2. Hold and Wait -> Eliminated by "Request All At Once" protocol
 * 3. No Preemption -> Eliminated by forced resource preemption
 * 4. Circular Wait -> Eliminated by "Fixed Resource Ordering" protocol (Havender's scheme)
 */

import { PreventionSimulationResult } from './types.js';

export interface OrderingPolicyCheckResult {
  allowed: boolean;
  message: string;
  maxHeldRank: number;
  requestedRank: number;
  requiresRelease: boolean;
  resourcesToRelease: number[];
}

/**
 * Havender's Linear Hierarchy Scheme (Eliminating Circular Wait):
 * Assign a global total ordering to all resources: R0 < R1 < R2 < ... < Rm-1.
 * A process can request resource Rk ONLY IF Rk > highest rank of any resource currently held by this process.
 * If a process wants a lower-ranking resource, it must first release all resources of equal or higher rank.
 */
export function checkOrderingPolicy(
  processId: number,
  requestedResourceIndex: number,
  allocationRow: number[],
  resourceNames: string[] = ['R1', 'R2', 'R3', 'R4']
): OrderingPolicyCheckResult {
  const reqName = resourceNames[requestedResourceIndex] || `R${requestedResourceIndex + 1}`;
  const reqRank = requestedResourceIndex + 1; // 1-based rank

  // Find all currently held resource indices
  const heldIndices: number[] = [];
  let maxHeldRank = 0;
  for (let j = 0; j < allocationRow.length; j++) {
    if (allocationRow[j] > 0) {
      heldIndices.push(j);
      if (j + 1 > maxHeldRank) {
        maxHeldRank = j + 1;
      }
    }
  }

  // If process holds no resources, any request is permitted
  if (heldIndices.length === 0) {
    return {
      allowed: true,
      message: `Policy Compliant: P${processId} holds no resources. Request for ${reqName} (Rank ${reqRank}) is allowed.`,
      maxHeldRank: 0,
      requestedRank: reqRank,
      requiresRelease: false,
      resourcesToRelease: [],
    };
  }

  // Check if requestedRank > maxHeldRank
  if (reqRank > maxHeldRank) {
    return {
      allowed: true,
      message: `Policy Compliant: Requested ${reqName} (Rank ${reqRank}) > highest held rank (${maxHeldRank}). No circular wait can form.`,
      maxHeldRank,
      requestedRank: reqRank,
      requiresRelease: false,
      resourcesToRelease: [],
    };
  } else {
    // Policy violation: process holds resources with rank >= reqRank
    const resourcesToRelease = heldIndices.filter((idx) => idx + 1 >= reqRank);
    const releaseNames = resourcesToRelease.map((idx) => resourceNames[idx] || `R${idx + 1}`);

    return {
      allowed: false,
      message: `Blocked by Ordering Policy: P${processId} already holds ${releaseNames.join(', ')} (Rank ≥ ${reqRank}). Requesting ${reqName} (Rank ${reqRank}) would violate the strict ascending order R1 < R2 < ... < Rn. Process must release ${releaseNames.join(', ')} first!`,
      maxHeldRank,
      requestedRank: reqRank,
      requiresRelease: true,
      resourcesToRelease,
    };
  }
}

export interface AllAtOnceCheckResult {
  allowed: boolean;
  canAcquireAll: boolean;
  message: string;
  missingResources: { resourceIndex: number; resourceName: string; needed: number; available: number }[];
}

/**
 * Protocol 1 for eliminating Hold & Wait: Request All Resources Before Execution.
 * A process must request and be allocated all its resources before it begins execution,
 * or it can only request resources when it has none allocated.
 */
export function checkAllAtOncePolicy(
  processId: number,
  fullClaim: number[],
  available: number[],
  currentlyHeld: number[],
  resourceNames: string[] = ['A', 'B', 'C']
): AllAtOnceCheckResult {
  const isHoldingAny = currentlyHeld.some((amt) => amt > 0);
  const missing: { resourceIndex: number; resourceName: string; needed: number; available: number }[] = [];

  let canSatisfyAll = true;
  for (let j = 0; j < fullClaim.length; j++) {
    const totalNeeded = fullClaim[j];
    const avail = available[j];
    if (totalNeeded > avail) {
      canSatisfyAll = false;
      missing.push({
        resourceIndex: j,
        resourceName: resourceNames[j] || `R${j + 1}`,
        needed: totalNeeded,
        available: avail,
      });
    }
  }

  if (isHoldingAny) {
    return {
      allowed: false,
      canAcquireAll: false,
      message: `Violates Protocol: P${processId} currently holds resources. Under "Hold & Wait Elimination", a process may only make requests when its allocation is completely empty.`,
      missingResources: missing,
    };
  }

  if (canSatisfyAll) {
    return {
      allowed: true,
      canAcquireAll: true,
      message: `Allowed: All required resources for P${processId} are available at once. Process passes the gate and can execute to completion.`,
      missingResources: [],
    };
  } else {
    const missDesc = missing.map((m) => `${m.resourceName} (Need ${m.needed}, Available ${m.available})`).join(', ');
    return {
      allowed: false,
      canAcquireAll: false,
      message: `Waiting at Admission Gate: Cannot allocate all resources simultaneously. Missing: ${missDesc}. P${processId} holds zero resources while waiting.`,
      missingResources: missing,
    };
  }
}

/**
 * Provides empirical / theoretical trade-off comparison data for OS prevention techniques.
 */
export function getPreventionMetrics(): PreventionSimulationResult[] {
  return [
    {
      policy: 'standard',
      name: 'No Prevention (Unconstrained)',
      deadlockOccurred: true,
      resourceUtilizationPct: 88,
      concurrencyLevel: 4.8,
      avgWaitTimeUnits: 2.1,
      starvationRisk: 'None',
      description: 'Processes request resources dynamically as needed. No artificial ordering or holding restrictions.',
      eliminatedCondition: 'None (Prone to circular wait & deadlock)',
      pros: ['Maximum concurrency', 'Zero premature idle reservations', 'Simple process code'],
      cons: ['Prone to deadlock', 'Requires runtime detection or avoidance', 'Unpredictable recovery cost'],
    },
    {
      policy: 'fixed_ordering',
      name: 'Fixed Resource Ordering (Havender)',
      deadlockOccurred: false,
      resourceUtilizationPct: 74,
      concurrencyLevel: 3.9,
      avgWaitTimeUnits: 3.8,
      starvationRisk: 'Low',
      description: 'Enforces strict global numbering: R1 < R2 < ... < Rm. Requests must strictly follow ascending order.',
      eliminatedCondition: 'Circular Wait (Condition #4 eliminated mathematically)',
      pros: ['Deadlock mathematically impossible', 'No runtime banker matrix calculations', 'High concurrency maintained'],
      cons: ['May force processes to prematurely release or pre-acquire resources', 'Hard to define ideal order globally'],
    },
    {
      policy: 'request_all_at_once',
      name: 'Request-All-Before-Execution',
      deadlockOccurred: false,
      resourceUtilizationPct: 49,
      concurrencyLevel: 2.2,
      avgWaitTimeUnits: 7.4,
      starvationRisk: 'High',
      description: 'Processes must acquire 100% of their peak resource claim before execution begins; hold nothing while waiting.',
      eliminatedCondition: 'Hold & Wait (Condition #2 eliminated)',
      pros: ['Deadlock impossible', 'No circular wait', 'Easy to implement in batch systems'],
      cons: ['Extremely low resource utilization (resources sit idle for entire run)', 'Severe starvation risk for heavy processes'],
    },
  ];
}
