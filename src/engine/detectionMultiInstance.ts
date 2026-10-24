/**
 * Multiple-Instance Deadlock Detection Algorithm (Matrix Reduction)
 *
 * Algorithm description (Silberschatz OS Concepts):
 * 1. Let Work and Finish be vectors of length m and n respectively.
 *    Initialize:
 *      Work = Available
 *      For i = 0, 1, ..., n-1:
 *        if Allocation[i] != 0, then Finish[i] = false;
 *        otherwise, Finish[i] = true.
 * 2. Find an index i such that both:
 *      a) Finish[i] == false
 *      b) Request[i] <= Work
 *    If no such i exists, go to step 4.
 * 3. Work = Work + Allocation[i]
 *    Finish[i] = true
 *    Go to step 2.
 * 4. If Finish[i] == false for any 0 <= i < n, then the system is in DEADLOCK.
 *    Process Pi is deadlocked if and only if Finish[i] == false.
 */

import {
  DetectionResult,
  DetectionStep,
} from './types.js';
import { cloneVector } from './bankers.js';

export function detectDeadlockMultiInstance(
  allocation: number[][],
  request: number[][],
  available: number[],
  processNames?: string[],
  resourceNames?: string[]
): DetectionResult {
  const n = allocation.length;
  const m = available.length;
  const pNames = processNames || Array.from({ length: n }, (_, i) => `P${i}`);
  const rNames = resourceNames || Array.from({ length: m }, (_, i) => String.fromCharCode(65 + i));

  const work = cloneVector(available);
  const finish = new Array(n).fill(false);

  // Step 1: If process has 0 allocation, it holds nothing and cannot block anyone
  for (let i = 0; i < n; i++) {
    const isZeroAlloc = allocation[i].every((val) => val === 0);
    if (isZeroAlloc) {
      finish[i] = true;
    }
  }

  const steps: DetectionStep[] = [];
  const resolvedProcessIds: number[] = [];
  let stepIndex = 1;
  let progress = true;

  while (progress) {
    progress = false;

    for (let i = 0; i < n; i++) {
      if (!finish[i]) {
        // Check Request[i] <= Work
        let canComplete = true;
        for (let j = 0; j < m; j++) {
          const reqVal = request[i]?.[j] ?? 0;
          if (reqVal > work[j]) {
            canComplete = false;
            break;
          }
        }

        if (canComplete) {
          const workBefore = cloneVector(work);
          // Release process allocation into work
          for (let j = 0; j < m; j++) {
            work[j] += allocation[i][j];
          }
          finish[i] = true;
          resolvedProcessIds.push(i);
          const workAfter = cloneVector(work);

          steps.push({
            stepIndex: stepIndex++,
            processId: i,
            processName: pNames[i],
            workBefore,
            request: cloneVector(request[i]),
            allocation: cloneVector(allocation[i]),
            workAfter,
            reason: `Request [${request[i].join(',')}] ≤ Work [${workBefore.join(',')}]. ${pNames[i]} runs to completion and releases Allocation [${allocation[i].join(',')}].`,
          });

          progress = true;
          break; // Greedily restart scan
        }
      }
    }
  }

  // Step 4: Any process with Finish[i] == false is deadlocked
  const deadlockedProcessIds: number[] = [];
  for (let i = 0; i < n; i++) {
    if (!finish[i]) {
      deadlockedProcessIds.push(i);
    }
  }

  const hasDeadlock = deadlockedProcessIds.length > 0;
  const deadlockedProcessNames = deadlockedProcessIds.map((id) => pNames[id]);

  let explanation = '';
  if (hasDeadlock) {
    explanation = `DEADLOCK DETECTED! Deadlocked processes: {${deadlockedProcessNames.join(', ')}}. None of these processes can satisfy their pending requests with current available resources.`;
  } else {
    explanation = `NO DEADLOCK DETECTED. All processes can successfully satisfy their requests and release their resources in order: <${resolvedProcessIds.map((id) => pNames[id]).join(', ')}>.`;
  }

  return {
    hasDeadlock,
    status: hasDeadlock ? 'DEADLOCK_DETECTED' : 'SAFE',
    isSingleInstance: false,
    deadlockedProcessIds,
    deadlockedProcessNames,
    resolvedProcessIds,
    steps,
    finishArray: finish,
    finalWork: work,
    explanation,
  };
}
