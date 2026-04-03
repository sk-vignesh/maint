/**
 * Compliance Test Trip Seeder
 *
 * Creates unassigned test trips on the API, one group per rule.
 * Each group has 4 scenarios:
 *   1. OKAY       — well within limit
 *   2. BORDER-OK  — just at the limit (compliant but tight)
 *   3. BORDER-FAIL — just over the limit (should trigger warning/violation)
 *   4. UNACCEPTABLE — far beyond the limit
 *
 * Trips use internal_id as the label so you can find them easily in the dock.
 * All trips are for the week of Sun 6 Apr → Sat 12 Apr 2026.
 *
 * Run: node tmp/seed-compliance-trips.mjs
 */

import { readFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── Load credentials from apps/v4/.env.local ────────────────────────────────

function loadEnv() {
  const envPath = resolve(__dirname, "../apps/v4/.env.local")
  try {
    const raw = readFileSync(envPath, "utf8")
    const env = {}
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (m) env[m[1].trim()] = m[2].trim()
    }
    return env
  } catch {
    console.error(`✗ Could not read ${envPath}`)
    process.exit(1)
  }
}

const env      = loadEnv()
const BASE_URL = "https://ontrack-api.agilecyber.com/int/v1"
const EMAIL    = env.USERNAME
const PASSWORD = env.PASSWORD

if (!EMAIL || !PASSWORD) {
  console.error("✗ USERNAME or PASSWORD missing from apps/v4/.env.local")
  process.exit(1)
}

console.log(`Using credentials from .env.local (${EMAIL})`)

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function login() {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ identity: EMAIL, password: PASSWORD }),
  })
  if (!res.ok) throw new Error(`Login failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  console.log("✓ Authenticated")
  return data.token
}

// ─── Create single order ──────────────────────────────────────────────────────

async function createOrder(token, payload) {
  const res = await fetch(`${BASE_URL}/orders`, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ order: {
      ...payload,
      // Required by the API — two valid place UUIDs as waypoints
      payload: {
        waypoints: [
          { place_uuid: "603601f6-fdbe-4acd-940f-2259cf6412be" },  // SWINDON
          { place_uuid: "dc88c48c-98d2-46dd-b586-00d8b2c88a24" },  // MILTON KEYNES
        ]
      }
    }}),
  })
  const body = await res.json()
  if (!res.ok) {
    console.error(`  ✗ Failed [${payload.internal_id}]: ${JSON.stringify(body)}`)
    return null
  }
  const o = body.order ?? body
  console.log(`  ✓ #${String(o.public_id).padEnd(8)}  ${payload.internal_id}`)
  return o
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function dt(dateStr, time) {
  return `${dateStr}T${time}:00`
}

// Week: Sun 6 Apr → Sat 12 Apr 2026
const SUN = "2026-04-06"
const MON = "2026-04-07"
const TUE = "2026-04-08"
const WED = "2026-04-09"
const THU = "2026-04-10"
const FRI = "2026-04-11"
const SAT = "2026-04-12"

// ─── Trip definitions ─────────────────────────────────────────────────────────

function buildTrips() {
  const trips = []

  // ── OVERLAP ───────────────────────────────────────────────────────────────
  trips.push({ internal_id: "OVERLAP/OKAY/A",         scheduled_at: dt(MON,"06:00"), estimated_end_date: dt(MON,"14:00") })
  trips.push({ internal_id: "OVERLAP/OKAY/B",         scheduled_at: dt(MON,"17:00"), estimated_end_date: dt(MON,"22:00") })

  trips.push({ internal_id: "OVERLAP/BORDER-OK/A",    scheduled_at: dt(TUE,"06:00"), estimated_end_date: dt(TUE,"14:00") })
  trips.push({ internal_id: "OVERLAP/BORDER-OK/B",    scheduled_at: dt(TUE,"14:00"), estimated_end_date: dt(TUE,"20:00") })

  trips.push({ internal_id: "OVERLAP/BORDER-FAIL/A",  scheduled_at: dt(WED,"06:00"), estimated_end_date: dt(WED,"14:00") })
  trips.push({ internal_id: "OVERLAP/BORDER-FAIL/B",  scheduled_at: dt(WED,"13:59"), estimated_end_date: dt(WED,"20:00") })

  trips.push({ internal_id: "OVERLAP/UNACCEPTABLE/A", scheduled_at: dt(THU,"06:00"), estimated_end_date: dt(THU,"18:00") })
  trips.push({ internal_id: "OVERLAP/UNACCEPTABLE/B", scheduled_at: dt(THU,"14:00"), estimated_end_date: dt(THU,"22:00") })

  // ── REST_GAP ──────────────────────────────────────────────────────────────
  trips.push({ internal_id: "REST_GAP/OKAY/A",         scheduled_at: dt(MON,"06:00"), estimated_end_date: dt(MON,"14:00") })
  trips.push({ internal_id: "REST_GAP/OKAY/B",         scheduled_at: dt(TUE,"02:00"), estimated_end_date: dt(TUE,"10:00") })

  trips.push({ internal_id: "REST_GAP/BORDER-OK/A",    scheduled_at: dt(TUE,"06:00"), estimated_end_date: dt(TUE,"14:00") })
  trips.push({ internal_id: "REST_GAP/BORDER-OK/B",    scheduled_at: dt(WED,"01:00"), estimated_end_date: dt(WED,"09:00") })

  trips.push({ internal_id: "REST_GAP/BORDER-FAIL/A",  scheduled_at: dt(WED,"06:00"), estimated_end_date: dt(WED,"14:00") })
  trips.push({ internal_id: "REST_GAP/BORDER-FAIL/B",  scheduled_at: dt(THU,"00:00"), estimated_end_date: dt(THU,"08:00") })

  trips.push({ internal_id: "REST_GAP/UNACCEPTABLE/A", scheduled_at: dt(THU,"06:00"), estimated_end_date: dt(THU,"14:00") })
  trips.push({ internal_id: "REST_GAP/UNACCEPTABLE/B", scheduled_at: dt(THU,"20:00"), estimated_end_date: dt(FRI,"04:00") })

  // ── DAILY_HOURS ───────────────────────────────────────────────────────────
  trips.push({ internal_id: "DAILY_HOURS/OKAY/A",         scheduled_at: dt(MON,"06:00"), estimated_end_date: dt(MON,"14:00") })
  trips.push({ internal_id: "DAILY_HOURS/BORDER-OK/A",    scheduled_at: dt(TUE,"06:00"), estimated_end_date: dt(TUE,"15:00") })
  trips.push({ internal_id: "DAILY_HOURS/BORDER-FAIL/A",  scheduled_at: dt(WED,"06:00"), estimated_end_date: dt(WED,"11:00") })
  trips.push({ internal_id: "DAILY_HOURS/BORDER-FAIL/B",  scheduled_at: dt(WED,"13:00"), estimated_end_date: dt(WED,"17:30") })
  trips.push({ internal_id: "DAILY_HOURS/UNACCEPTABLE/A", scheduled_at: dt(THU,"06:00"), estimated_end_date: dt(THU,"18:00") })

  // ── WEEKLY_HOURS ──────────────────────────────────────────────────────────
  const wDays = [MON, TUE, WED, THU, FRI]

  // OKAY: 5 × 8h = 40h
  wDays.forEach((d, i) => trips.push({ internal_id: `WEEKLY_HOURS/OKAY/${i+1}`, scheduled_at: dt(d,"06:00"), estimated_end_date: dt(d,"14:00") }))

  // BORDER-OK: 5 × 10h = 50h (at threshold)
  wDays.forEach((d, i) => trips.push({ internal_id: `WEEKLY_HOURS/BORDER-OK/${i+1}`, scheduled_at: dt(d,"06:00"), estimated_end_date: dt(d,"16:00") }))

  // BORDER-FAIL: 5 × 8h + Sat 12h = 52h (just over 50h warning)
  wDays.forEach((d, i) => trips.push({ internal_id: `WEEKLY_HOURS/BORDER-FAIL/${i+1}`, scheduled_at: dt(d,"06:00"), estimated_end_date: dt(d,"14:00") }))
  trips.push({ internal_id: "WEEKLY_HOURS/BORDER-FAIL/6", scheduled_at: dt(SAT,"06:00"), estimated_end_date: dt(SAT,"18:00") })

  // UNACCEPTABLE: 5 × 12h + Sat 2h = 62h
  wDays.forEach((d, i) => trips.push({ internal_id: `WEEKLY_HOURS/UNACCEPTABLE/${i+1}`, scheduled_at: dt(d,"06:00"), estimated_end_date: dt(d,"18:00") }))
  trips.push({ internal_id: "WEEKLY_HOURS/UNACCEPTABLE/6", scheduled_at: dt(SAT,"08:00"), estimated_end_date: dt(SAT,"10:00") })

  // ── WEEKLY_REST ───────────────────────────────────────────────────────────
  // OKAY: 48h gap (Mon 14h→Wed 14h)
  trips.push({ internal_id: "WEEKLY_REST/OKAY/A",         scheduled_at: dt(MON,"06:00"), estimated_end_date: dt(MON,"14:00") })
  trips.push({ internal_id: "WEEKLY_REST/OKAY/B",         scheduled_at: dt(WED,"14:00"), estimated_end_date: dt(WED,"22:00") })

  // BORDER-OK: exactly 46h gap (Mon 14h→Wed 12h)
  trips.push({ internal_id: "WEEKLY_REST/BORDER-OK/A",    scheduled_at: dt(MON,"06:00"), estimated_end_date: dt(MON,"14:00") })
  trips.push({ internal_id: "WEEKLY_REST/BORDER-OK/B",    scheduled_at: dt(WED,"12:00"), estimated_end_date: dt(WED,"20:00") })

  // BORDER-FAIL: largest gap is 36h (Mon 14h→Wed 02h start = 36h gap)
  trips.push({ internal_id: "WEEKLY_REST/BORDER-FAIL/A",  scheduled_at: dt(MON,"06:00"), estimated_end_date: dt(MON,"14:00") })
  trips.push({ internal_id: "WEEKLY_REST/BORDER-FAIL/B",  scheduled_at: dt(TUE,"00:00"), estimated_end_date: dt(TUE,"08:00") })
  trips.push({ internal_id: "WEEKLY_REST/BORDER-FAIL/C",  scheduled_at: dt(WED,"20:00"), estimated_end_date: dt(THU,"04:00") })

  // UNACCEPTABLE: all gaps ~10h, never gets ≥24h rest
  trips.push({ internal_id: "WEEKLY_REST/UNACCEPTABLE/A", scheduled_at: dt(MON,"06:00"), estimated_end_date: dt(MON,"14:00") })
  trips.push({ internal_id: "WEEKLY_REST/UNACCEPTABLE/B", scheduled_at: dt(TUE,"00:00"), estimated_end_date: dt(TUE,"08:00") })
  trips.push({ internal_id: "WEEKLY_REST/UNACCEPTABLE/C", scheduled_at: dt(TUE,"18:00"), estimated_end_date: dt(WED,"02:00") })
  trips.push({ internal_id: "WEEKLY_REST/UNACCEPTABLE/D", scheduled_at: dt(WED,"12:00"), estimated_end_date: dt(WED,"20:00") })

  return trips
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const token = await login()
  const trips = buildTrips()

  console.log(`\nCreating ${trips.length} test trips for week Sun 6 Apr – Sat 12 Apr 2026...\n`)

  const results = []
  for (const trip of trips) {
    const r = await createOrder(token, {
      status:             "created",
      internal_id:        trip.internal_id,
      notes:              `COMPLIANCE TEST: ${trip.internal_id}`,
      scheduled_at:       trip.scheduled_at,
      estimated_end_date: trip.estimated_end_date,
    })
    if (r) results.push(r)
    await new Promise(res => setTimeout(res, 120))
  }

  console.log(`\n${"═".repeat(72)}`)
  console.log("ASSIGNMENT GUIDE — navigate to week of 6 Apr 2026 on the Rota")
  console.log("═".repeat(72))
  console.log(`
Use ONE driver per row below. Assign ALL trips in that row to the same driver.
Find trips in the Trips dock by their internal_id label.

┌──────────────────┬────────────────┬───────────────────────────────────┬─────────────────────┐
│ Rule             │ Scenario       │ Trips to assign (internal_id)     │ Expected badge      │
├──────────────────┼────────────────┼───────────────────────────────────┼─────────────────────┤
│ OVERLAP          │ OKAY           │ OVERLAP/OKAY/A+B                  │ None                │
│                  │ BORDER-OK      │ OVERLAP/BORDER-OK/A+B             │ None (touching)     │
│                  │ BORDER-FAIL    │ OVERLAP/BORDER-FAIL/A+B           │ 🔴 Red (1min)       │
│                  │ UNACCEPTABLE   │ OVERLAP/UNACCEPTABLE/A+B          │ 🔴 Red (4h)         │
├──────────────────┼────────────────┼───────────────────────────────────┼─────────────────────┤
│ REST_GAP         │ OKAY           │ REST_GAP/OKAY/A+B                 │ None (12h gap)      │
│                  │ BORDER-OK      │ REST_GAP/BORDER-OK/A+B            │ None (11h gap)      │
│                  │ BORDER-FAIL    │ REST_GAP/BORDER-FAIL/A+B          │ ⚠️ Amber (10h gap)  │
│                  │ UNACCEPTABLE   │ REST_GAP/UNACCEPTABLE/A+B         │ 🔴 Red   (6h gap)   │
├──────────────────┼────────────────┼───────────────────────────────────┼─────────────────────┤
│ DAILY_HOURS      │ OKAY           │ DAILY_HOURS/OKAY/A                │ None (8h)           │
│                  │ BORDER-OK      │ DAILY_HOURS/BORDER-OK/A           │ None (9h exact)     │
│                  │ BORDER-FAIL    │ DAILY_HOURS/BORDER-FAIL/A+B       │ ⚠️ Amber (9h30m)    │
│                  │ UNACCEPTABLE   │ DAILY_HOURS/UNACCEPTABLE/A        │ 🔴 Red   (12h)      │
├──────────────────┼────────────────┼───────────────────────────────────┼─────────────────────┤
│ WEEKLY_HOURS     │ OKAY           │ WEEKLY_HOURS/OKAY/1-5             │ None (40h)          │
│                  │ BORDER-OK      │ WEEKLY_HOURS/BORDER-OK/1-5        │ None (50h exact)    │
│                  │ BORDER-FAIL    │ WEEKLY_HOURS/BORDER-FAIL/1-6      │ ⚠️ Amber (52h)      │
│                  │ UNACCEPTABLE   │ WEEKLY_HOURS/UNACCEPTABLE/1-6     │ 🔴 Red   (62h)      │
├──────────────────┼────────────────┼───────────────────────────────────┼─────────────────────┤
│ WEEKLY_REST      │ OKAY           │ WEEKLY_REST/OKAY/A+B              │ None (48h gap)      │
│                  │ BORDER-OK      │ WEEKLY_REST/BORDER-OK/A+B         │ None (46h gap)      │
│                  │ BORDER-FAIL    │ WEEKLY_REST/BORDER-FAIL/A+B+C     │ ⚠️ Amber (36h gap)  │
│                  │ UNACCEPTABLE   │ WEEKLY_REST/UNACCEPTABLE/A+B+C+D  │ 🔴 Red   (10h max)  │
└──────────────────┴────────────────┴───────────────────────────────────┴─────────────────────┘

Total trips created: ${results.length} / ${trips.length}
`)
}

main().catch(err => {
  console.error("\n✗ Fatal:", err.message)
  process.exit(1)
})
