/**
 * Deadlock Recovery by Process Termination
 *
 * Reclaims all resources held by the selected victim process,
 * resets its allocations and requests to 0, then re-runs detection
 * to verify recovery from deadlock.
 */

import { DetectionResult } from './types.js';
import { cloneMatrix, cloneVector } from './bankers.js';
import { detectDeadlockMultiInstance } from './detectionMultiInstance.js';
import { detectDeadlockSingleInstance } from './detectionSingleInstance.js';

export function terminateProcessAndRecover(
  processId: number,
  allocation: number[][],
  request: number[][],
  available: number[],
  isSingleInstance: boolean = false,
  processNames?: string[],
  resourceNames?: string[]
): {
  newAllocation: number[][];
  newRequest: number[][];
  newAvailable: number[];
  releasedResources: number[];
  detectionResult: DetectionResult;
} {
  const newAllocation = cloneMatrix(allocation);
  const newRequest = cloneMatrix(request);
  const newAvailable = cloneVector(available);

  const releasedResources = cloneVector(allocation[processId]);

  // Release resources back to Available pool
  for (let j = 0; j < newAvailable.length; j++) {
    newAvailable[j] += releasedResources[j];
    newAllocation[processId][j] = 0;
    newRequest[processId][j] = 0;
  }

  const detectionResult = isSingleInstance
    ? detectDeadlockSingleInstance(newAllocation, newRequest, newAvailable, processNames, resourceNames)
    : detectDeadlockMultiInstance(newAllocation, newRequest, newAvailable, processNames, resourceNames);

  return {
    newAllocation,
    newRequest,
    newAvailable,
    releasedResources,
    detectionResult,
  };
}
