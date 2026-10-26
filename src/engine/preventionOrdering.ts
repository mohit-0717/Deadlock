/**
 * Havender's Linear Hierarchy Scheme (Eliminating Circular Wait)
 *
 * Algorithm description:
 * Assign a global total ordering to all resources: R0 < R1 < R2 < ... < Rm-1.
 * A process can request resource Rk ONLY IF rank(Rk) > highest rank of any resource
 * currently held by this process.
 * If a process wants a lower-ranking resource, it must first release all resources of equal or higher rank.
 * This mathematically precludes circular wait condition.
 */

export interface OrderingPolicyCheckResult {
  allowed: boolean;
  message: string;
  maxHeldRank: number;
  requestedRank: number;
  requiresRelease: boolean;
  resourcesToRelease: number[];
}

export interface RankOrderingResult {
  isValid: boolean;
  allowed: boolean;
  heldRank: number;
  requestedRank: number;
  status: 'ORDERING_POLICY_SATISFIED' | 'BLOCKED_BY_ORDERING_POLICY' | 'INVALID_INPUT';
  message: string;
}

/**
 * Direct rank evaluation for Havender's Fixed Resource Ordering.
 * Rule: Request Allowed by Ordering Policy = Requested Rank > Held Rank
 * Validates that both ranks are positive integers (>= 1).
 */
export function evaluateOrderingRanks(
  heldRankInput: number | string,
  requestedRankInput: number | string
): RankOrderingResult {
  const heldStr = String(heldRankInput).trim();
  const reqStr = String(requestedRankInput).trim();

  const heldNum = Number(heldStr);
  const reqNum = Number(reqStr);

  const isPositiveInt = (n: number, s: string) =>
    s !== '' && !isNaN(n) && Number.isInteger(n) && n >= 1;

  if (!isPositiveInt(heldNum, heldStr) || !isPositiveInt(reqNum, reqStr)) {
    return {
      isValid: false,
      allowed: false,
      heldRank: heldNum,
      requestedRank: reqNum,
      status: 'INVALID_INPUT',
      message: 'Invalid input: Both Currently Held Rank and Requested Rank must be positive integers (≥ 1).',
    };
  }

  const allowed = reqNum > heldNum;
  return {
    isValid: true,
    allowed,
    heldRank: heldNum,
    requestedRank: reqNum,
    status: allowed ? 'ORDERING_POLICY_SATISFIED' : 'BLOCKED_BY_ORDERING_POLICY',
    message: allowed
      ? `ORDERING POLICY SATISFIED: Requested Rank ${reqNum} > Currently Held Rank ${heldNum}. Strict ascending order (R1 < R2 < ... < Rn) is maintained; circular wait is mathematically eliminated.`
      : `BLOCKED BY ORDERING POLICY: Requested Rank ${reqNum} ≤ Currently Held Rank ${heldNum}. Requesting equal or lower ranks violates strict ascending order. To prevent circular wait, the process must release Rank ${heldNum} first.`,
  };
}

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
