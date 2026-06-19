/**
 * Period-allocation helpers. These take a `periodSplit` (map of periodId →
 * fraction in [0,1] meant to sum to 1) and turn it into per-period compute
 * breakdowns, or sanitise it for storage / display.
 */

export type Compute = { cpuHours: number; gpuHours: number };

/**
 * Spread a total compute amount across periods according to the given split.
 * Storage is intentionally NOT period-scoped (see plan), so it doesn't appear
 * here.
 *
 * An empty `periodSplit` yields an empty result. No clamping or normalising
 * is performed — the caller is expected to have run `normaliseSplit` first
 * if it cares.
 */
export function allocateAcrossPeriods(
  totalCompute: Compute,
  periodSplit: Record<string, number>
): Record<string, Compute> {
  const out: Record<string, Compute> = {};
  for (const [periodId, fraction] of Object.entries(periodSplit)) {
    out[periodId] = {
      cpuHours: totalCompute.cpuHours * fraction,
      gpuHours: totalCompute.gpuHours * fraction
    };
  }
  return out;
}

/**
 * Sanitise a periodSplit:
 *   - `valid` is true iff the input sums to within 0.0001 of 1.0 AND every
 *     value is already in [0,1]. This is what the UI surfaces as the "split
 *     ok / split is off" indicator.
 *   - `split` is always returned: negatives clamp to 0, values >1 clamp to 1,
 *     then the result is renormalised so it sums to 1 (if the post-clamp sum
 *     is > 0; otherwise the input is returned untouched so the caller can
 *     show its own "empty split" UI).
 *
 * Both fields are always returned regardless of input shape.
 */
export function normaliseSplit(periodSplit: Record<string, number>): {
  split: Record<string, number>;
  valid: boolean;
} {
  const entries = Object.entries(periodSplit);

  // Validity check: every value in [0,1] AND sum ~= 1.
  let rawSum = 0;
  let allInRange = true;
  for (const [, v] of entries) {
    rawSum += v;
    if (v < 0 || v > 1) allInRange = false;
  }
  const valid = allInRange && Math.abs(rawSum - 1) <= 0.0001;

  // Build clamped version.
  const clamped: Record<string, number> = {};
  let clampedSum = 0;
  for (const [k, v] of entries) {
    const c = v < 0 ? 0 : v > 1 ? 1 : v;
    clamped[k] = c;
    clampedSum += c;
  }

  let split: Record<string, number>;
  if (clampedSum > 0) {
    split = {};
    for (const [k, v] of Object.entries(clamped)) {
      split[k] = v / clampedSum;
    }
  } else {
    // Nothing positive to renormalise — return the original (caller decides).
    split = { ...periodSplit };
  }

  return { split, valid };
}
