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
