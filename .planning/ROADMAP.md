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

### Phase 999.4: Compliance Engine — Rule Logic Rethink (Rule-by-Rule with Trip Context) (BACKLOG)

**Goal:** Rethink the compliance engine from the ground up to ensure every rule is evaluated correctly, with clear violated-rule reporting that includes: the rule name, what was found, the trip ID, trip start time, trip end time, and the exact violation reason. The engine must use a simple, auditable loop that checks each rule independently against the trip data.

**Context:** The current compliance engine logic is unclear and likely broken — violations may not be surfacing, or surfacing incorrectly, due to muddled rule evaluation order, stale data, or short-circuit logic that skips rules when data is sparse. The goal is to:
1. Replace any opaque batch/async logic with a transparent rule-loop: iterate over each rule, evaluate it against the driver's trip window, and emit a structured violation object if the rule is breached
2. Each violation must carry: `ruleId`, `ruleName`, `tripId`, `startTime`, `endTime`, `violationDescription` — so the UI can display exactly what was wrong, for which trip, and why
3. Rules must be evaluated even when trip data is sparse (treat missing history as "driver was free")
4. The engine must be re-verified against all known edge cases before re-deploying

**Known Issues to Resolve:**
1. **Opaque evaluation path** — it is currently unclear which rules are being checked and in what order
2. **Missing violation context** — violations don't consistently carry trip ID, start/end times, and human-readable reason
3. **Sparse-data handling** — rules may be skipped or incorrectly triggered when trip history is incomplete
4. **No simple audit trail** — can't easily trace why a specific rule fired for a specific trip

**Requirements:** TBD

**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)

### Phase 999.5: Frontend UI for All New API Modules (BACKLOG)

**Goal:** Build the frontend pages, components, and tests for all API clients introduced in the api-docs review — Issues, Off-Shift plans, Auto-Allocation, and the extended CRUD across Drivers, Fleets, Vehicles, Places, and Leave Requests.

**Scope:**
- Issues module: list, create, edit, assign, status update, bulk delete, export
- Off-Shift (Recurring Leave Plans): list, create, edit, delete — with cascade warning
- Auto-Allocation: shift data view, constraint management, initiate + apply flow
- Drivers: extended forms for shift preferences, max trips/week, consecutive days, bulk priority reorder, import/export
- Fleets: create/edit forms, fleet membership management (assign/remove drivers & vehicles)
- Vehicles: create/edit forms, PMI and tachograph date fields, import/export
- Places: create/edit forms, bulk delete with 2-step confirmation, map + reverse geocode, import/export
- Leave Requests: create form, approve/reject actions, full status lifecycle

**Requirements:** TBD — pending clarification questions on scope, design patterns, and which modules need brand-new pages vs updates to existing ones.

**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)

### Phase 999.6: Driver Creation Page Fails — API Investigation & Fix (BACKLOG)

**Goal:** Resolve the driver creation failure in Settings → Drivers. The form submits but the request appears to hang or fail silently. The 30s timeout now surfaces errors, but the root cause (wrong payload, missing field, or server-side validation issue) needs to be identified and fixed.

**Known Context:**
- `POST /int/v1/drivers` is a single-step operation per `api-docs/driver_api_docs.md` — only `name` (and optionally `status`) are required
- A 30s `AbortController` timeout was added to `ontrackFetch` — the drawer will now show an error instead of getting stuck
- The two-step user-creation approach was investigated and reverted — the internal API does NOT require a separate user/team-member creation step
- Next step: capture the actual error message from the API and identify the exact rejection cause

**Requirements:** TBD

**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)

### Phase 999.7: Edit Records in All List Pages With Add Button (BACKLOG)

**Goal:** Add edit (inline or drawer) functionality to every list/table page that already has an "Add" button — so users can update existing records without having to delete and re-create them. The edit action should be consistent in style with the existing add flow (e.g., reusing the same drawer/form component, pre-populated with the selected record's current values).

**Scope (list pages with Add buttons):**
- Drivers
- Vehicles
- Fleets
- Places
- Leave Requests
- Off-Shift / Recurring Leave Plans
- Issues
- Any other module-level list pages that grow an Add button in future

**Requirements:** TBD

**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)
