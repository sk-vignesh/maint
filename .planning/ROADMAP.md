# FleetYes Roadmap

## Backlog

### Phase 999.1: Rota Compliance Engine — Overlap Fix & Test Suite (BACKLOG)

**Goal:** Ensure the rota rule engine works to spec. The first and most critical spec is preventing overlapping trips from being assigned to the same driver.

**Requirements:** TBD — see [audit document](file:///C:/Users/skvig/.gemini/antigravity/brain/b130a05c-9d3a-42a4-99fb-234a73ffcb28/rota_compliance_engine_audit.md) for full findings.

**Known Bugs:**
1. **Race condition**: Fast consecutive drops bypass overlap check (stale tripIndex)
2. **No batch overlap detection**: `assimilated.ts` never checks for overlaps post-assignment
3. **Duration double-counting**: Overlapping activities on same day sum instead of merging
4. **No cross-day overlap check**: Midnight-spanning trips could overlap with next day's trip
5. **No test coverage**: Zero unit tests for the compliance engine

**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)

### Phase 999.2: Fix Insufficient Rest Gap Detection Between Trips (BACKLOG)

**Goal:** Two trips assigned to the same driver with a gap shorter than the minimum allowed rest period (9h reduced / 11h standard) must be caught and blocked by both the prospective check (at assignment time) and the batch validator (post-assignment).

**Context:** The compliance engine's `restBetweenDays()` in the batch validator correctly detects insufficient rest in unit tests (verified with overnight 18:00→05:29 + 07:31 next day = 2h 2m gap). However, in production the violation is not surfacing — likely due to:
1. **Trips page had no compliance check** (now fixed — prospective check added)
2. **Batch check async lag** (now fixed — localStorage trip_data merge added)
3. **Remaining gap**: the prospective check may not see trips from outside the current week's tripIndex, or rota entries without trip_data

**Requirements:** TBD

**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)

### Phase 999.3: Compliance Engine — Full Rule Coverage with Tests & Deploy (BACKLOG)

**Goal:** All rules shown in the compliance panel must actually be evaluated. When no trip data exists, assume the driver was free (new business / clean slate). Every rule in the ruleset must be exercised, tested with a proper test suite, and only deployed once all tests pass.

**Context:** The compliance window currently displays a set of rules (daily rest, weekly rest, daily work limit, consecutive days, weekly/fortnightly driving limits, break requirements, record-keeping). However not all of these are consistently checked when trip data is sparse or absent. The engine must:
1. Treat missing trip history as "driver was free" — not as a gap/violation
2. Check **every** displayed rule on every evaluation pass, not just the ones with data
3. The minimum rest gap between consecutive trips (9h reduced / 11h standard) must surface correctly in both the prospective check (at assignment time) and the batch validator
4. Full unit test suite covering all rules and edge cases (no data, partial data, violations, warnings, boundary conditions)
5. End-to-end verification before any deployment

**Rules to cover (from compliance panel):**
- Daily Working Hours Limit (13h / 15h reduced rest)
- Intra-Shift Breaks (enforcement when driving hours tracked separately)
- Daily Rest Period (11h standard / 9h reduced, max 3×/week)
- Weekly Rest Period (45h / 24h reduced)
- Weekly Driving Limit (56h)
- Fortnightly Driving Limit (90h)
- Consecutive Working Days (max 6)
- 29-Day Record Window

**Requirements:** TBD

**Plans:** 2/2 plans complete

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)
