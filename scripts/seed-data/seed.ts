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
    throw new Error(`API ${options.method ?? "GET"} ${path} → ${res.status}: ${body.slice(0, 200)}`)
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

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH RUNNER — processes items in parallel batches
// ═══════════════════════════════════════════════════════════════════════════════

async function runInBatches<T, R>(
  label: string,
  items: T[],
  worker: (item: T, index: number) => Promise<R>,
  concurrency: number,
  delayMs: number,
): Promise<R[]> {
  const results: R[] = []
  let completed = 0
  const total = items.length
  const startTime = Date.now()

  for (let i = 0; i < total; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const batchResults = await Promise.allSettled(
      batch.map((item, j) => worker(item, i + j))
    )

    for (const r of batchResults) {
      if (r.status === "fulfilled") {
        results.push(r.value)
        completed++
      } else {
        completed++
        console.error(`  ⚠ ${label} #${completed}: ${r.reason}`)
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    const pct = Math.round((completed / total) * 100)
    process.stdout.write(`\r  ${label}: ${completed}/${total} (${pct}%) — ${elapsed}s`)

    if (i + concurrency < total && delayMs > 0) {
      await new Promise(r => setTimeout(r, delayMs))
    }
  }

  console.log() // newline after progress
  return results
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEEDERS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedTemplates(): Promise<SeedTemplate[]> {
  console.log(`\n📋 Creating ${TEMPLATE_COUNT} walkaround templates...`)

  const templates: SeedTemplate[] = []
  for (let i = 0; i < TEMPLATE_COUNT; i++) {
    templates.push(seedConfig.generateTemplate(i))
  }

  const created = await runInBatches(
    "Templates",
    templates,
    async (tpl, _i) => {
      await api("/walkaround-templates", {
        method: "POST",
        body: JSON.stringify({
          name: tpl.name,
          is_default: tpl.is_default,
          sections: tpl.sections,
        }),
      })
      return tpl
    },
    CONCURRENCY,
    BATCH_DELAY,
  )

  console.log(`  ✅ Created ${created.length} templates`)
  return created
}

async function seedChecks(templatePool: SeedTemplate[]): Promise<void> {
  console.log(`\n🔍 Creating ${CHECK_COUNT} walkaround checks...`)

  const checks = []
  for (let i = 0; i < CHECK_COUNT; i++) {
    checks.push(seedConfig.generateCheck(i, templatePool))
  }

  const created = await runInBatches(
    "Checks",
    checks,
    async (check, _i) => {
      await api("/walkaround-checks", {
        method: "POST",
        body: JSON.stringify({
          vehicle_reg: check.vehicle.reg,
          vehicle_name: `${check.vehicle.make} ${check.vehicle.model}`,
          driver_name: check.driver_name,
          date: check.date,
          start_time: check.time,
          status: check.status,
          sections: check.sections,
        }),
      })
    },
    CONCURRENCY,
    BATCH_DELAY,
  )

  const clearCount = checks.filter(c => c.status === "clear").length
  const defectCount = checks.filter(c => c.status === "defect").length
  console.log(`  ✅ Created ${created.length} checks (${clearCount} clear, ${defectCount} defects)`)
}

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
  console.log(`  API:        ${API_BASE}`)
  console.log(`  Templates:  ${TEMPLATE_COUNT}`)
  console.log(`  Checks:     ${CHECK_COUNT}`)
  console.log(`  Concurrency: ${CONCURRENCY}`)
  console.log(`  Batch delay: ${BATCH_DELAY}ms`)
  console.log("═══════════════════════════════════════════")

  const startTime = Date.now()

  await login()

  // 1. Templates first (checks reference them)
  const templates = await seedTemplates()

  // 2. Checks (uses template pool for realistic data)
  await seedChecks(templates)

  // 3. Alert configurations
  await seedAlertConfigs()

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\n🎉 Seeding complete in ${elapsed}s`)
  console.log(`   ${TEMPLATE_COUNT} templates + ${CHECK_COUNT} checks + alert configs`)
}

main().catch(err => {
  console.error("\n💥 Seed failed:", err.message ?? err)
  process.exit(1)
})
