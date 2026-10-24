/**
 * Deadlock Prevention Engine Hub
 *
 * Implements:
 * 1. checkOrderingPolicy: Havender Linear Ordering (in preventionOrdering.ts)
 * 2. checkAllAtOncePolicy: Hold & Wait Elimination Gate (in preventionAllAtOnce.ts)
 * 3. getPreventionMetrics: Quantitative engineering trade-offs comparison
 */

import { PreventionSimulationResult } from './types.js';

export { checkOrderingPolicy } from './preventionOrdering.js';
export type { OrderingPolicyCheckResult } from './preventionOrdering.js';
export { checkAllAtOncePolicy } from './preventionAllAtOnce.js';
export type { AllAtOnceCheckResult } from './preventionAllAtOnce.js';

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
