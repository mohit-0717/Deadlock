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
