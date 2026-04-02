/**
 * Compliance Engine — Overlap Detection
 *
 * Finds every pair of trips assigned to the same driver where the two trips
 * overlap in time.
 *
 * Two trips overlap when:
 *   tripA.startTime < tripB.endTime  AND  tripB.startTime < tripA.endTime
 *
 * This single condition captures all five overlap shapes:
 *
 *   1. Partial (B starts mid-A):     A |-----------|
 *                                    B       |-----------|
 *
 *   2. B inside A:                   A |---------------|
 *                                    B    |-------|
 *
 *   3. A inside B:                   A    |-------|
 *                                    B |---------------|
 *
 *   4. Exact same window:            A |--------|
 *                                    B |--------|
 *
 *   5. A starts mid-B (mirror of 1): A       |-----------|
 *                                    B |-----------|
 *
 * Back-to-back trips (A ends at T, B starts at T) are NOT an overlap.
 */

import type { Trip, OverlapResult } from "./types"

/**
 * Given an array of trips for a single driver, return all overlapping pairs.
 *
 * Trips must all belong to the same driver — pass already-grouped trips.
 * The algorithm is O(n²) which is fine for typical driver workloads (< 100 trips).
 */
export function findOverlaps(trips: Trip[]): OverlapResult[] {
  // Sort by start time so we can break the inner loop early once B starts after A ends
  const sorted = [...trips].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime()
  )

  const results: OverlapResult[] = []

  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i]

    for (let j = i + 1; j < sorted.length; j++) {
      const b = sorted[j]

      // Since trips are sorted by startTime, once B starts at or after A ends
      // there can be no more overlaps with A — break the inner loop
      if (b.startTime.getTime() >= a.endTime.getTime()) break

      // We know: b.startTime < a.endTime (loop invariant from above)
      // Check the other direction: a.startTime < b.endTime
      // (always true here since a starts before b — but explicit for clarity)
      if (a.startTime.getTime() < b.endTime.getTime()) {
        // They overlap — calculate the shared window
        const overlapStart = Math.max(a.startTime.getTime(), b.startTime.getTime())
        const overlapEnd   = Math.min(a.endTime.getTime(),   b.endTime.getTime())
        const overlapMinutes = (overlapEnd - overlapStart) / 60_000

        results.push({
          tripA: a,
          tripB: b,
          overlapMinutes,
          overlapType: classifyOverlap(a, b),
        })
      }
    }
  }

  return results
}

/**
 * Classify the overlap shape for diagnostic purposes.
 *
 * "partial"     — one trip starts before the other ends, neither contains the other
 * "containment" — one trip is entirely within the other
 * "exact"       — both trips start and end at the same time
 */
function classifyOverlap(a: Trip, b: Trip): OverlapResult["overlapType"] {
  const aStart = a.startTime.getTime()
  const aEnd   = a.endTime.getTime()
  const bStart = b.startTime.getTime()
  const bEnd   = b.endTime.getTime()

  if (aStart === bStart && aEnd === bEnd) return "exact"

  // Containment: one trip's window is fully inside the other's
  if (
    (aStart <= bStart && bEnd <= aEnd) ||
    (bStart <= aStart && aEnd <= bEnd)
  ) {
    return "containment"
  }

  return "partial"
}
