#!/usr/bin/env npx tsx
/**
 * OnTrack API Seed Runner
 *
 * Creates test data via the live API endpoints.
 * Data config is imported from ./seed-config.ts (portable across environments).
 *
 * Usage:
 *   npx tsx scripts/seed-data/seed.ts
 *
 * Environment variables (or edit defaults below):
 *   ONTRACK_API_URL   — API base URL     (default: https://ontrack-api.agilecyber.com/int/v1)
 *   ONTRACK_EMAIL     — Login email      (required)
 *   ONTRACK_PASSWORD  — Login password   (required)
 *   SEED_TEMPLATES    — Number of templates to create (default: 15)
 *   SEED_CHECKS       — Number of checks to create   (default: 1000)
 *   SEED_CONCURRENCY  — Parallel requests             (default: 10)
 */

import { seedConfig, type SeedTemplate } from "./seed-config"

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG — override via env vars
// ═══════════════════════════════════════════════════════════════════════════════

const API_BASE    = process.env.ONTRACK_API_URL  ?? "https://ontrack-api.agilecyber.com/int/v1"
const EMAIL       = process.env.ONTRACK_EMAIL    ?? ""
const PASSWORD    = process.env.ONTRACK_PASSWORD ?? ""

const TEMPLATE_COUNT = parseInt(process.env.SEED_TEMPLATES   ?? String(seedConfig.templateCount), 10)
const CHECK_COUNT    = parseInt(process.env.SEED_CHECKS       ?? String(seedConfig.checkCount), 10)
const CONCURRENCY    = parseInt(process.env.SEED_CONCURRENCY  ?? String(seedConfig.concurrency), 10)
const BATCH_DELAY    = seedConfig.batchDelayMs

// ═══════════════════════════════════════════════════════════════════════════════
// HTTP HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

let token = ""

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`API ${options.method ?? "GET"} ${path} → ${res.status}: ${body.slice(0, 300)}`)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

async function login(): Promise<void> {
  if (!EMAIL || !PASSWORD) {
    console.error("❌ Set ONTRACK_EMAIL and ONTRACK_PASSWORD environment variables")
    process.exit(1)
  }

  console.log(`🔐 Logging in as ${EMAIL}...`)
  const res = await api<{ token: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ identity: EMAIL, password: PASSWORD, remember: false }),
  })
  token = res.token
  console.log(`✅ Authenticated (token: ${token.slice(0, 12)}...)`)
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH RUNNER — processes items in parallel batches
// ═══════════════════════════════════════════════════════════════════════════════

async function runInBatches<T, R>(
  label: string,
  items: T[],
  worker: (item: T, index: number) => Promise<R>,
  concurrency: number,
  delayMs: number,
): Promise<{ succeeded: R[]; failed: number }> {
  const results: R[] = []
  let completed = 0
  let failed = 0
  const total = items.length
  const startTime = Date.now()

  for (let i = 0; i < total; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const batchResults = await Promise.allSettled(
      batch.map((item, j) => worker(item, i + j))
    )

    for (const r of batchResults) {
      completed++
      if (r.status === "fulfilled") {
        results.push(r.value)
      } else {
        failed++
        if (failed <= 5) { // Only print first 5 errors
          console.error(`\n  ⚠ ${label} #${completed}: ${r.reason}`)
        }
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    const pct = Math.round((completed / total) * 100)
    process.stdout.write(`\r  ${label}: ${completed}/${total} (${pct}%) — ${elapsed}s — ${failed} errors`)

    if (i + concurrency < total && delayMs > 0) {
      await new Promise(r => setTimeout(r, delayMs))
    }
  }

  console.log() // newline after progress
  return { succeeded: results, failed }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API TYPES — what we need from existing data
// ═══════════════════════════════════════════════════════════════════════════════

interface ApiCreatedTemplate {
  uuid: string
  id: string
  name: string
  items: {
    uuid: string
    item_name: string
    categories: {
      uuid: string
      name: string
    }[]
  }[]
}

interface ApiVehicleMapEntry {
  vehicle: { uuid: string; plate_number: string; name: string }
  template: { uuid: string; name: string } | null
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 1: SEED TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

async function seedTemplates(): Promise<ApiCreatedTemplate[]> {
  console.log(`\n📋 Creating ${TEMPLATE_COUNT} walkaround templates...`)

  const templates: SeedTemplate[] = []
  for (let i = 0; i < TEMPLATE_COUNT; i++) {
    templates.push(seedConfig.generateTemplate(i))
  }

  const { succeeded } = await runInBatches(
    "Templates",
    templates,
    async (tpl) => {
      const res = await api<{ walkaroundTemplate: ApiCreatedTemplate }>("/walkaround-templates", {
        method: "POST",
        body: JSON.stringify({
          name: tpl.name,
          is_default: tpl.is_default,
          items: tpl.sections.map(sec => ({
            name: sec.name,
            categories: sec.items.map(item => ({
              name: item,
              photo_required_on_fail: Math.random() > 0.7,
              anticheat_eligible: false,
            })),
          })),
        }),
      })
      return res.walkaroundTemplate
    },
    CONCURRENCY,
    BATCH_DELAY,
  )

  console.log(`  ✅ Created ${succeeded.length} templates`)
  return succeeded
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 2: FETCH EXISTING VEHICLES & DRIVERS
// ═══════════════════════════════════════════════════════════════════════════════
// STEP 2: FETCH EXISTING VEHICLES, DRIVERS & FILES
// ═══════════════════════════════════════════════════════════════════════════════

interface SimpleVehicle { uuid: string; plate_number: string; name: string }
interface SimpleDriver { uuid: string; name: string }

async function fetchVehicles(): Promise<SimpleVehicle[]> {
  console.log(`\n🚛 Fetching vehicles from /vehicles...`)
  try {
    const res = await api<{ vehicles: SimpleVehicle[] }>("/vehicles?limit=100")
    console.log(`  ✅ Found ${res.vehicles.length} vehicles`)
    return res.vehicles
  } catch (err) {
    console.log(`  ⚠ Could not fetch vehicles: ${err}`)
    return []
  }
}

async function fetchDrivers(): Promise<SimpleDriver[]> {
  console.log(`\n👤 Fetching drivers from /drivers...`)
  try {
    const res = await api<{ drivers: SimpleDriver[] }>("/drivers?limit=100")
    console.log(`  ✅ Found ${res.drivers.length} drivers`)
    return res.drivers
  } catch (err) {
    console.log(`  ⚠ Could not fetch drivers: ${err}`)
    return []
  }
}

async function fetchFileUuids(): Promise<string[]> {
  console.log(`\n📎 Fetching valid photo_uuids...`)
  
  // First try: extract from existing walkaround checks (guaranteed valid for checks)
  try {
    const checks = await api<{ walkaroundChecks: { items: { categories: { photo_uuid: string | null }[] }[] }[] }>(
      "/walkaround-checks?limit=20"
    )
    const uuids = new Set<string>()
    for (const c of checks.walkaroundChecks) {
      for (const item of c.items ?? []) {
        for (const cat of item.categories ?? []) {
          if (cat.photo_uuid) uuids.add(cat.photo_uuid)
        }
      }
    }
    if (uuids.size > 0) {
      const arr = Array.from(uuids)
      console.log(`  ✅ Found ${arr.length} photo_uuids from existing checks`)
      return arr
    }
  } catch { /* fall through */ }

  // Fallback: use files from /files
  try {
    const res = await api<{ files: { uuid: string }[] }>("/files?limit=100")
    const uuids = res.files.map(f => f.uuid)
    console.log(`  ✅ Found ${uuids.length} file UUIDs from /files (fallback)`)
    return uuids
  } catch (err) {
    console.log(`  ⚠ Could not fetch files: ${err}`)
    return []
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 3: SEED CHECKS — using real IDs
// ═══════════════════════════════════════════════════════════════════════════════

async function seedChecks(
  templates: ApiCreatedTemplate[],
  vehicles: SimpleVehicle[],
  drivers: SimpleDriver[],
  fileUuids: string[],
): Promise<void> {
  if (templates.length === 0) {
    console.log(`\n⚠ No templates available — skipping check creation`)
    return
  }
  if (vehicles.length === 0) {
    console.log(`\n⚠ No vehicles found — skipping check creation`)
    return
  }
  if (drivers.length === 0) {
    console.log(`\n⚠ No drivers found — skipping check creation`)
    return
  }
  if (fileUuids.length === 0) {
    console.log(`\n⚠ No file UUIDs available for photo_uuid — skipping check creation`)
    console.log(`  💡 Upload at least one file to the system, then re-run`)
    return
  }

  console.log(`\n🔍 Creating ${CHECK_COUNT} walkaround checks...`)
  console.log(`   Using: ${templates.length} templates, ${vehicles.length} vehicles, ${drivers.length} drivers, ${fileUuids.length} file UUIDs`)

  const indices = Array.from({ length: CHECK_COUNT }, (_, i) => i)

  const { succeeded, failed } = await runInBatches(
    "Checks",
    indices,
    async () => {
      const template = pick(templates)
      const vehicle = pick(vehicles)
      const driver = pick(drivers)

      // Build responses — every response needs a real photo_uuid
      const responses: Record<string, unknown>[] = []
      for (const item of template.items) {
        for (const cat of item.categories) {
          const roll = Math.random()
          const photoUuid = pick(fileUuids)

          if (roll > 0.95) {
            responses.push({
              category_id: cat.uuid,
              response: "Fail",
              notes: pick(seedConfig.referenceData.defectNotes),
              defect_type: "Dangerous",
              photo_uuid: photoUuid,
            })
          } else if (roll > 0.80) {
            responses.push({
              category_id: cat.uuid,
              response: "Advisory",
              notes: pick(seedConfig.referenceData.advisoryNotes),
              defect_type: "Advisory",
              photo_uuid: photoUuid,
            })
          } else {
            responses.push({
              category_id: cat.uuid,
              response: "OK",
              photo_uuid: photoUuid,
            })
          }
        }
      }

      const daysAgo = randomInt(0, 90)
      const checkedAt = new Date()
      checkedAt.setDate(checkedAt.getDate() - daysAgo)
      checkedAt.setHours(randomInt(5, 20), randomInt(0, 59), 0, 0)

      await api("/walkaround-checks", {
        method: "POST",
        body: JSON.stringify({
          template_id: template.uuid,
          vehicle_id: vehicle.uuid,
          driver_id: driver.uuid,
          checked_at: checkedAt.toISOString(),
          location: pick(["Depot A", "Depot B", "Yard C", "Birmingham Hub", "London DC", "Manchester Depot", "Leeds Yard", "Bristol Hub", null]),
          duration_in_seconds: randomInt(180, 900),
          signature: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
          responses,
        }),
      })
    },
    CONCURRENCY,
    BATCH_DELAY,
  )

  console.log(`  ✅ Created ${succeeded.length} checks (${failed} failed)`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 4: SEED ALERT CONFIGS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedAlertConfigs(): Promise<void> {
  console.log(`\n🔔 Saving alert configurations...`)

  const expiryAlerts = seedConfig.generateExpiryAlerts()
  const eventAlerts = seedConfig.generateEventAlerts()

  await api("/fleet-ops/compliance-settings/alerts/save", {
    method: "POST",
    body: JSON.stringify({
      expiry_alerts: expiryAlerts,
      event_alerts: eventAlerts,
    }),
  })

  console.log(`  ✅ Saved ${expiryAlerts.length} expiry alerts + ${eventAlerts.length} event alerts`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("═══════════════════════════════════════════")
  console.log("  OnTrack API Seed Runner")
  console.log("═══════════════════════════════════════════")
  console.log(`  API:         ${API_BASE}`)
  console.log(`  Templates:   ${TEMPLATE_COUNT}`)
  console.log(`  Checks:      ${CHECK_COUNT}`)
  console.log(`  Concurrency: ${CONCURRENCY}`)
  console.log(`  Batch delay: ${BATCH_DELAY}ms`)
  console.log("═══════════════════════════════════════════")

  const startTime = Date.now()

  await login()

  // 1. Create new templates (may fail if duplicates exist)
  const newTemplates = await seedTemplates()

  // 2. Fetch ALL existing templates from the API (includes ones just created + pre-existing)
  console.log(`\n📥 Fetching all existing templates (with category IDs)...`)
  let allTemplates: ApiCreatedTemplate[] = [...newTemplates]
  try {
    const res = await api<{ walkaroundTemplates: ApiCreatedTemplate[] }>(
      "/walkaround-templates?limit=100"
    )
    // Fetch full details for each (to get items + categories)
    const detailed: ApiCreatedTemplate[] = []
    for (const t of res.walkaroundTemplates) {
      try {
        const detail = await api<{ walkaroundTemplate: ApiCreatedTemplate }>(
          `/walkaround-templates/${t.uuid}`
        )
        if (detail.walkaroundTemplate.items?.length > 0) {
          detailed.push(detail.walkaroundTemplate)
        }
      } catch { /* skip */ }
    }
    allTemplates = detailed
    console.log(`  ✅ Found ${allTemplates.length} templates with check items`)
  } catch (err) {
    console.log(`  ⚠ Could not fetch templates: ${err}`)
  }

  // 3. Fetch existing vehicles, drivers, and file UUIDs
  const vehicles = await fetchVehicles()
  const drivers = await fetchDrivers()
  const fileUuids = await fetchFileUuids()

  // 4. Create checks using real template/vehicle/driver/file IDs
  await seedChecks(allTemplates, vehicles, drivers, fileUuids)

  // 5. Save alert configs
  await seedAlertConfigs()

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\n🎉 Seeding complete in ${elapsed}s`)
}

main().catch(err => {
  console.error("\n💥 Seed failed:", err.message ?? err)
  process.exit(1)
})
