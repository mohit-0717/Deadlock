/**
 * Banker's Safety Algorithm (Dijkstra's Banker's Algorithm)
 *
 * Algorithm description:
 * 1. Let Work and Finish be vectors of length m and n respectively.
 *    Initialize: Work = Available, Finish[i] = false for all i = 0 .. n-1
 * 2. Find an index i such that:
 *      a) Finish[i] == false
 *      b) Need[i] <= Work (Need[i][j] <= Work[j] for all j)
 *    If no such i exists, go to step 4.
 * 3. Work = Work + Allocation[i]
 *    Finish[i] = true
 *    Record process i in SafeSequence
 *    Go to step 2.
 * 4. If Finish[i] == true for all i, then the system is in a SAFE state.
 *    Otherwise, the system is in an UNSAFE state.
 */

import {
  SafetyResult,
  SafetyStep,
  StuckProcessDetail,
} from './types.js';
import { cloneVector, computeNeed } from './bankers.js';

export function safetyCheck(
  allocation: number[][],
  max: number[][],
  available: number[],
  customNeed?: number[][]
): SafetyResult {
  const n = allocation.length;
  const m = available.length;
  const need = customNeed || computeNeed(max, allocation);

  const work = cloneVector(available);
  const finish = new Array(n).fill(false);
  const safeSequence: number[] = [];
  const safeSequenceNames: string[] = [];
  const steps: SafetyStep[] = [];

  // Repeatedly look for an executable process using textbook round-robin search
  let madeProgress = true;
  let stepCounter = 1;
  let searchStart = 0;

  while (madeProgress && safeSequence.length < n) {
    madeProgress = false;

    for (let offset = 0; offset < n; offset++) {
      const i = (searchStart + offset) % n;
      if (!finish[i]) {
        // Check if Need[i] <= Work for all resources j
        let canRun = true;
        for (let j = 0; j < m; j++) {
          if (need[i][j] > work[j]) {
            canRun = false;
            break;
          }
        }

        if (canRun) {
          const workBefore = cloneVector(work);

          // Simulate process execution and release of held resources
          for (let j = 0; j < m; j++) {
            work[j] += allocation[i][j];
          }
          finish[i] = true;
          safeSequence.push(i);
          safeSequenceNames.push(`P${i}`);

          const workAfter = cloneVector(work);

          steps.push({
            stepIndex: stepCounter++,
            processId: i,
            processName: `P${i}`,
            workBefore,
            need: cloneVector(need[i]),
            allocation: cloneVector(allocation[i]),
            workAfter,
            canRunReason: `Need [${need[i].join(',')}] ≤ Work [${workBefore.join(',')}]. Process executes and releases Allocation [${allocation[i].join(',')}].`,
          });

          madeProgress = true;
          searchStart = (i + 1) % n;
          break;
        }
      }
    }
  }

  const isSafe = safeSequence.length === n;

  // Identify any stuck processes if unsafe
  const stuckProcesses: StuckProcessDetail[] = [];
  if (!isSafe) {
    for (let i = 0; i < n; i++) {
      if (!finish[i]) {
        const failingResources = [];
        for (let j = 0; j < m; j++) {
          if (need[i][j] > work[j]) {
            failingResources.push({
              resourceIndex: j,
              resourceName: String.fromCharCode(65 + j),
              needAmount: need[i][j],
              workAmount: work[j],
              deficit: need[i][j] - work[j],
            });
          }
        }
        stuckProcesses.push({
          processId: i,
          processName: `P${i}`,
          need: cloneVector(need[i]),
          workAvailable: cloneVector(work),
          failingResources,
        });
      }
    }
  }

  const explanation = isSafe
    ? `System is SAFE. Found safe execution sequence: <${safeSequenceNames.join(', ')}>. All ${n} processes can complete without deadlock.`
    : `System is UNSAFE. Only ${safeSequence.length} of ${n} processes could finish (${safeSequenceNames.length ? safeSequenceNames.join(', ') : 'none'}). Stuck processes: ${stuckProcesses.map((p) => p.processName).join(', ')}. No complete safe sequence exists.`;

  return {
    isSafe,
    status: isSafe ? 'SAFE' : 'UNSAFE',
    safeSequence,
    safeSequenceNames,
    steps,
    stuckProcesses,
    finalWork: work,
    explanation,
  };
}
