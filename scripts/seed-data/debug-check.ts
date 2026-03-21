import * as fs from "fs"
const API = "https://ontrack-api.agilecyber.com/int/v1"
const E = process.env.ONTRACK_EMAIL ?? ""
const P = process.env.ONTRACK_PASSWORD ?? ""
const OUT = "c:/Projects/Maintenance/ui/scripts/seed-data/debug-output.txt"

async function main() {
  const lines: string[] = []
  const log = (s: string) => { lines.push(s) }

  const lr = await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identity: E, password: P, remember: false }) })
  const ld = await lr.json()
  const h = { Authorization: `Bearer ${ld.token}`, "Content-Type": "application/json" }

  // Get photo_uuids from existing checks
  const cr = await fetch(`${API}/walkaround-checks?limit=5`, { headers: h })
  const cd = await cr.json()
  const photoUuids = new Set<string>()
  for (const c of cd.walkaroundChecks ?? []) {
    for (const item of c.items ?? []) {
      for (const cat of item.categories ?? []) {
        if (cat.photo_uuid) photoUuids.add(cat.photo_uuid)
      }
    }
  }
  const photoArr = Array.from(photoUuids)
  log(`Photo UUIDs from checks: ${photoArr.length}`)
  log(`First: ${photoArr[0]}`)

  // Get driver from /drivers
  const dr = await fetch(`${API}/drivers?limit=1`, { headers: h })
  const dd = await dr.json()
  const driver = dd.drivers[0]
  log(`Driver: ${driver.uuid} (${driver.name})`)

  // Get vehicle from /vehicles
  const vr = await fetch(`${API}/vehicles?limit=1`, { headers: h })
  const vd = await vr.json()
  const vehicle = vd.vehicles[0]
  log(`Vehicle: ${vehicle.uuid} (${vehicle.plate_number})`)

  // Get template
  const tr = await fetch(`${API}/walkaround-templates?limit=5`, { headers: h })
  const td = await tr.json()
  let template: any = null
  for (const t of td.walkaroundTemplates) {
    const r = await fetch(`${API}/walkaround-templates/${t.uuid}`, { headers: h })
    const d = await r.json()
    if (d.walkaroundTemplate?.items?.length > 0) {
      template = d.walkaroundTemplate
      break
    }
  }
  log(`Template: ${template.uuid} (${template.name}, ${template.items.length} items)`)

  // Build responses with real photo_uuids from existing checks
  const responses = (template.items || []).flatMap((i: any) =>
    (i.categories || []).map((c: any) => ({
      category_id: c.uuid,
      response: "OK",
      photo_uuid: photoArr[Math.floor(Math.random() * photoArr.length)],
    }))
  )

  const payload = {
    template_id: template.uuid,
    vehicle_id: vehicle.uuid,
    driver_id: driver.uuid,
    checked_at: new Date().toISOString(),
    duration_in_seconds: 300,
    signature: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    responses,
  }

  log(`\nresponses count: ${responses.length}`)
  log(`\nFull payload:`)
  log(JSON.stringify(payload, null, 2))

  const result = await fetch(`${API}/walkaround-checks`, { method: "POST", headers: h, body: JSON.stringify(payload) })
  const rb = await result.text()
  log(`\n=== RESPONSE ${result.status} ===`)
  log(rb)

  fs.writeFileSync(OUT, lines.join("\n"))
  console.log("Done. See debug-output.txt")
}

main().catch(e => console.error(e))
