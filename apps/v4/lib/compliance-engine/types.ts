/**
 * Compliance Engine — Types
 *
 * Minimal types. We add to these only as we add rules.
 */

/** A single trip assigned to a driver */
export interface Trip {
  /** Unique identifier for this order/trip */
  orderId: string

  /** UUID of the driver this trip is assigned to */
  driverUuid: string

  /** Trip start (inclusive) */
  startTime: Date

  /** Trip end (inclusive) */
  endTime: Date
}

/** A pair of trips that overlap in time */
export interface OverlapResult {
  tripA: Trip
  tripB: Trip
  /** How many minutes the two trips overlap */
  overlapMinutes: number
  /** Human-readable description of the overlap type */
  overlapType: "partial" | "containment" | "exact"
}
