/**
 * Request-All-At-Once Protocol (Eliminating Hold & Wait)
 *
 * Algorithm description:
 * A process must request and be allocated all its resources before it begins execution,
 * or it can only request resources when it has none allocated.
 * If all resources are not available simultaneously, the process waits while holding 0 resources.
 */

export interface AllAtOnceCheckResult {
  allowed: boolean;
  canAcquireAll: boolean;
  message: string;
  missingResources: { resourceIndex: number; resourceName: string; needed: number; available: number }[];
}

export interface AllAtOnceAdmissionResult {
  isValid: boolean;
  allowed: boolean;
  demand: number[];
  available: number[];
  status: 'ADMISSION_GRANTED' | 'WAITING_AT_ADMISSION_GATE' | 'INVALID_INPUT';
  message: string;
  shortages: { resource: string; demand: number; available: number; deficit: number }[];
}

/**
 * Direct evaluation for Request All Resources At Once (Hold & Wait Elimination).
 * Rule: Admission Allowed = Available[A] >= Demand[A] AND Available[B] >= Demand[B] AND Available[C] >= Demand[C]
 * Validates that all quantities are non-negative integers (>= 0).
 */
export function evaluateAllAtOnceAdmission(
  demandInputs: (number | string)[],
  availableInputs: (number | string)[],
  resourceNames: string[] = ['A', 'B', 'C']
): AllAtOnceAdmissionResult {
  if (demandInputs.length !== availableInputs.length) {
    return {
      isValid: false,
      allowed: false,
      demand: [],
      available: [],
      status: 'INVALID_INPUT',
      message: 'Invalid input: Demand and Available vectors must have matching dimensions.',
      shortages: [],
    };
  }

  const demand: number[] = [];
  const available: number[] = [];

  const isNonNegInt = (n: number, s: string) =>
    s !== '' && !isNaN(n) && Number.isInteger(n) && n >= 0;

  for (let i = 0; i < demandInputs.length; i++) {
    const dStr = String(demandInputs[i]).trim();
    const aStr = String(availableInputs[i]).trim();
    const dNum = Number(dStr);
    const aNum = Number(aStr);

    if (!isNonNegInt(dNum, dStr) || !isNonNegInt(aNum, aStr)) {
      return {
        isValid: false,
        allowed: false,
        demand: [],
        available: [],
        status: 'INVALID_INPUT',
        message: 'Invalid input: Resource quantities for Peak Demand and Available Pool must be non-negative integers (≥ 0).',
        shortages: [],
      };
    }
    demand.push(dNum);
    available.push(aNum);
  }

  const shortages: { resource: string; demand: number; available: number; deficit: number }[] = [];
  for (let j = 0; j < demand.length; j++) {
    if (available[j] < demand[j]) {
      shortages.push({
        resource: resourceNames[j] || String.fromCharCode(65 + j),
        demand: demand[j],
        available: available[j],
        deficit: demand[j] - available[j],
      });
    }
  }

  const allowed = shortages.length === 0;
  return {
    isValid: true,
    allowed,
    demand,
    available,
    status: allowed ? 'ADMISSION_GRANTED' : 'WAITING_AT_ADMISSION_GATE',
    message: allowed
      ? 'ADMISSION GRANTED: All requested resources are fully available in the pool. Process acquires complete claim at once and proceeds to execution.'
      : `WAITING AT ADMISSION GATE (HOLDS NOTHING): Cannot allocate all resources simultaneously. Missing: ${shortages
          .map((s) => `${s.resource} (Need ${s.demand}, Available ${s.available}; Deficit ${s.deficit})`)
          .join(', ')}. Process holds zero resources while waiting.`,
    shortages,
  };
}

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
