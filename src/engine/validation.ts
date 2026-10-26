/**
 * OS DeadlockLab: Input and State Validation Module
 * Enforces strict verification of vectors, matrices, bounds, and consistency.
 */

import { SystemState } from './types.js';

export interface ValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  code?: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
}

/**
 * Validates a full system state setup (Allocation, Max, Available, Total).
 * Checks:
 * 1. Dimensions match processCount and resourceCount.
 * 2. Integers only, non-negative.
 * 3. Allocation[i][j] <= Max[i][j] (declared maximum cannot be exceeded by current allocation).
 * 4. Available vector non-negative integers.
 * 5. If totalInstances is provided, ensures column sums of Allocation <= totalInstances,
 *    and Available[j] + sum(Allocation[*][j]) == totalInstances[j].
 */
export function validateSetup(state: Partial<SystemState>): ValidationResult {
  const issues: ValidationIssue[] = [];

  const n = state.processCount;
  const m = state.resourceCount;

  if (typeof n !== 'number' || n < 1 || !Number.isInteger(n)) {
    issues.push({ field: 'processCount', message: 'Process count must be an integer >= 1', severity: 'error' });
    return { isValid: false, issues };
  }

  if (typeof m !== 'number' || m < 1 || !Number.isInteger(m)) {
    issues.push({ field: 'resourceCount', message: 'Resource count must be an integer >= 1', severity: 'error' });
    return { isValid: false, issues };
  }

  if (!Array.isArray(state.allocation) || state.allocation.length !== n) {
    issues.push({ field: 'allocation', message: `Allocation matrix must have exactly ${n} rows`, severity: 'error' });
  }

  if (!Array.isArray(state.max) || state.max.length !== n) {
    issues.push({ field: 'max', message: `Maximum matrix must have exactly ${n} rows`, severity: 'error' });
  }

  if (!Array.isArray(state.available) || state.available.length !== m) {
    issues.push({ field: 'available', message: `Available vector must have exactly ${m} elements`, severity: 'error' });
  }

  // If top-level dimensions fail, return early
  if (issues.length > 0) {
    return { isValid: false, issues };
  }

  const alloc = state.allocation!;
  const max = state.max!;
  const avail = state.available!;
  const resNames = state.resourceNames || Array.from({ length: m }, (_, i) => String.fromCharCode(65 + i));
  const procNames = state.processNames || Array.from({ length: n }, (_, i) => `P${i}`);

  // Validate Available elements
  for (let j = 0; j < m; j++) {
    const val = avail[j];
    if (typeof val !== 'number' || !Number.isInteger(val) || val < 0) {
      issues.push({
        field: `available[${j}]`,
        message: `Available resource '${resNames[j] || j}' must be a non-negative integer (found ${val})`,
        severity: 'error',
      });
    }
  }

  // Validate Allocation and Max elements
  for (let i = 0; i < n; i++) {
    if (!Array.isArray(alloc[i]) || alloc[i].length !== m) {
      issues.push({
        field: `allocation[${i}]`,
        message: `${procNames[i]} Allocation row must have exactly ${m} entries`,
        severity: 'error',
      });
      continue;
    }
    if (!Array.isArray(max[i]) || max[i].length !== m) {
      issues.push({
        field: `max[${i}]`,
        message: `${procNames[i]} Max row must have exactly ${m} entries`,
        severity: 'error',
      });
      continue;
    }

    for (let j = 0; j < m; j++) {
      const a = alloc[i][j];
      const mx = max[i][j];
      const rName = resNames[j] || `R${j}`;

      if (typeof a !== 'number' || !Number.isInteger(a) || a < 0) {
        issues.push({
          field: `allocation[${i}][${j}]`,
          message: `${procNames[i]} Allocation for '${rName}' must be a non-negative integer (found ${a})`,
          severity: 'error',
        });
      }
      if (typeof mx !== 'number' || !Number.isInteger(mx) || mx < 0) {
        issues.push({
          field: `max[${i}][${j}]`,
          message: `${procNames[i]} Max claim for '${rName}' must be a non-negative integer (found ${mx})`,
          severity: 'error',
        });
      }

      if (typeof a === 'number' && typeof mx === 'number' && a > mx) {
        issues.push({
          field: `allocation[${i}][${j}]`,
          message: `Constraint violation: ${procNames[i]} Allocation (${a}) exceeds declared Max (${mx}) for resource '${rName}'`,
          severity: 'error',
        });
      }
    }
  }

  // Validate total instances consistency if supplied
  if (state.totalInstances && Array.isArray(state.totalInstances)) {
    if (state.totalInstances.length !== m) {
      issues.push({
        field: 'totalInstances',
        message: `Total instances vector must have length ${m}`,
        severity: 'error',
      });
    } else {
      for (let j = 0; j < m; j++) {
        const total = state.totalInstances[j];
        const rName = resNames[j] || `R${j}`;
        let colSumAlloc = 0;
        for (let i = 0; i < n; i++) {
          if (Array.isArray(alloc[i]) && typeof alloc[i][j] === 'number') {
            colSumAlloc += alloc[i][j];
          }
        }
        if (colSumAlloc > total) {
          issues.push({
            field: `totalInstances[${j}]`,
            message: `Resource '${rName}': Total allocated (${colSumAlloc}) exceeds system total capacity (${total})`,
            severity: 'error',
            code: 'SETUP_TOTAL_LT_ALLOCATED',
          });
        } else if (state.accountingMode === 'total_instances' && typeof avail[j] === 'number' && colSumAlloc + avail[j] !== total) {
          issues.push({
            field: `totalInstances[${j}]`,
            message: `Resource '${rName}' accounting mismatch: Allocated (${colSumAlloc}) + Available (${avail[j]}) != Total (${total})`,
            severity: 'warning',
            code: 'SETUP_AVAILABLE_MISMATCH',
          });
        }
      }
    }
  }

  return {
    isValid: issues.filter((i) => i.severity === 'error').length === 0,
    issues,
  };
}

export interface RequestFormatValidationResult {
  isValid: boolean;
  error?: string;
  failingResource?: string;
  failingIndex?: number;
}

/**
 * Checks if a resource request vector is structurally valid.
 */
export function validateRequestFormat(
  processId: number,
  request: number[],
  processCount: number,
  resourceCount: number,
  resourceNames?: string[]
): RequestFormatValidationResult {
  if (typeof processId !== 'number' || !Number.isInteger(processId) || processId < 0 || processId >= processCount) {
    return {
      isValid: false,
      error: `Invalid process identifier P${processId}. Must be an integer between P0 and P${processCount - 1}.`,
    };
  }

  if (!Array.isArray(request) || request.length !== resourceCount) {
    return {
      isValid: false,
      error: `Request vector must have exactly ${resourceCount} resource values (received ${Array.isArray(request) ? request.length : typeof request}).`,
    };
  }

  for (let j = 0; j < resourceCount; j++) {
    const val = request[j];
    const rName = resourceNames?.[j] || String.fromCharCode(65 + j);
    if (typeof val !== 'number' || isNaN(val) || !Number.isInteger(val)) {
      return {
        isValid: false,
        error: `Invalid request: Resource ${rName} must be an integer (received ${val}).`,
        failingResource: rName,
        failingIndex: j,
      };
    }
    if (val < 0) {
      return {
        isValid: false,
        error: `Invalid request: Resource ${rName} cannot have a negative requested quantity (${val}).`,
        failingResource: rName,
        failingIndex: j,
      };
    }
  }

  return { isValid: true };
}
