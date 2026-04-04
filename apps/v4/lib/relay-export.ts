/**
 * relay-export.ts
 *
 * Shared utility for generating a Relay-compatible BulkAssign.xls file.
 *
 * Strategy:
 *   1. Fetch the official template from the backend (or fall back to /templates/)
 *   2. Parse it with SheetJS — all formatting, merged cells, and dropdown
 *      validation in the template are preserved exactly
 *   3. For every data row where col A (Block ID) matches an assigned block in
 *      FleetYes, write the driver name into col G (Driver 1) — that is the
 *      ONLY cell we modify
 *   4. Download the result
 *
 * The template itself contains all the trip/block/load/lane/time data that
 * Relay needs. We never reconstruct or overwrite any of that.
 */

import * as XLSX from "xlsx"
import type { Order } from "./orders-api"
import type { Driver } from "./drivers-api"

// ─── Template source ──────────────────────────────────────────────────────────
// The template is served from the Next.js public directory so it's always
// available client-side without an auth token.  When the Relay team issues
// a new template, drop the updated file into apps/v4/public/templates/ and
// redeploy — no code changes needed.
const TEMPLATE_URL = "/templates/BulkAssign.xls"

// ─── Main export function ─────────────────────────────────────────────────────

/**
 * exportRelayXls
 *
 * @param orders  The orders whose driver assignments should be written.
 *                Typically the full list visible on the current page/week.
 * @param drivers The full driver roster (used to extend the "hidden" dropdown
 *                sheet with any drivers not yet in the template).
 */
export async function exportRelayXls(orders: Order[], drivers: Driver[]) {
  // ── 1. Build Block ID → driver name from the orders ───────────────────────
  // public_id is the field that Relay calls "Block ID".
  // We take the first assigned driver per block (blocks shouldn't split).
  const blockDriver = new Map<string, string>()
  for (const o of orders) {
    const blockId    = o.public_id ?? o.internal_id ?? o.uuid
    const driverName = o.driver_assigned?.name ?? o.driver_name ?? ""
    if (blockId && driverName && !blockDriver.has(blockId)) {
      blockDriver.set(blockId, driverName)
    }
  }

  // ── 2. Fetch the BulkAssign.xls template ──────────────────────────────────
  let templateBuf: ArrayBuffer
  try {
    const res = await fetch(TEMPLATE_URL)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    templateBuf = await res.arrayBuffer()
  } catch (err) {
    alert(
      `Could not load the Relay template.\n\n` +
      `${err instanceof Error ? err.message : String(err)}\n\n` +
      `Make sure BulkAssign.xls is present in apps/v4/public/templates/.`
    )
    return
  }

  // ── 3. Parse with SheetJS (preserves all formatting / validation) ──────────
  const wb        = XLSX.read(templateBuf, { type: "array" })
  const sheetName = wb.SheetNames[0]   // "Bulk Assignment Upcoming"
  const ws        = wb.Sheets[sheetName]

  if (!ws) {
    alert("Template is missing the expected first sheet.")
    return
  }

  // ── 4. Read the "hidden" driver dropdown list from Sheet 2 ────────────────
  const hiddenSheet      = wb.Sheets[wb.SheetNames[1]]  // "hidden"
  const knownDriverNames = new Set<string>()
  if (hiddenSheet) {
    const rows = XLSX.utils.sheet_to_json<string[]>(hiddenSheet, { header: 1 }) as string[][]
    for (const row of rows) {
      const name = row[0]
      if (name) knownDriverNames.add(String(name).trim())
    }
  }

  // ── 5. Fuzzy-match FleetYes names → dropdown values ───────────────────────
  // Priority: exact match → case-insensitive match → pass through as-is
  const normalize = (s: string) => s.trim().toLowerCase()
  const matchDriver = (name: string): string => {
    if (!name) return ""
    if (knownDriverNames.has(name)) return name
    for (const known of knownDriverNames) {
      if (normalize(known) === normalize(name)) return known
    }
    return name  // not in list — write anyway, Relay will validate
  }

  // ── 6. Iterate all data rows and write Driver 1 (col G = index 6) ─────────
  // Template data starts at row index 4 (0-based):
  //   row 0 = title banner
  //   row 1 = instructions
  //   row 2 = empty
  //   row 3 = group headers
  //   row 4 = sub-column headers   ← first real header row
  //   row 5+ = data rows
  const DATA_START_ROW = 5   // 0-indexed; row 4 is the "Driver 1" sub-header
  const range          = XLSX.utils.decode_range(ws["!ref"] ?? "A1")

  let filled = 0
  for (let r = DATA_START_ROW; r <= range.e.r; r++) {
    const blockCell = ws[XLSX.utils.encode_cell({ r, c: 0 })]
    if (!blockCell) continue
    const blockId = String(blockCell.v ?? "").trim()
    if (!blockId) continue

    const driverName = blockDriver.get(blockId)
    if (!driverName) continue  // block not in FleetYes → leave blank

    const matched  = matchDriver(driverName)
    const cellAddr = XLSX.utils.encode_cell({ r, c: 6 })  // col G = Driver 1
    ws[cellAddr]   = { t: "s", v: matched, w: matched }
    filled++
  }

  // ── 7. Optionally extend Hidden sheet with extra drivers ───────────────────
  // Add any drivers in the FleetYes roster that aren't already in the dropdown.
  // We append — never remove or reorder — to avoid breaking Relay's validation.
  if (hiddenSheet) {
    const extras = drivers
      .map(d => d.name?.trim() ?? "")
      .filter(n => n && !knownDriverNames.has(n))
    if (extras.length > 0) {
      const hiddenRange = XLSX.utils.decode_range(hiddenSheet["!ref"] ?? "A1")
      let nextRow = hiddenRange.e.r + 1
      for (const name of extras) {
        const addr = XLSX.utils.encode_cell({ r: nextRow, c: 0 })
        hiddenSheet[addr] = { t: "s", v: name, w: name }
        nextRow++
      }
      hiddenSheet["!ref"] = XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: nextRow - 1, c: 0 },
      })
    }
  }

  if (filled === 0) {
    // Warn rather than silently download an empty file
    const confirmed = window.confirm(
      "No driver assignments found matching the template's Block IDs.\n\n" +
      "This usually means the imported trips haven't been assigned yet.\n\n" +
      "Download the template anyway (with Driver 1 column blank)?"
    )
    if (!confirmed) return
  }

  // ── 8. Download ───────────────────────────────────────────────────────────
  const today   = new Date()
  const dateStr =
    `${today.getFullYear()}-` +
    `${String(today.getMonth() + 1).padStart(2, "0")}-` +
    `${String(today.getDate()).padStart(2, "0")}`

  XLSX.writeFile(wb, `BulkAssign_${dateStr}.xls`, { bookType: "xls" })
}
