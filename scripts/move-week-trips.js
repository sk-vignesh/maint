/**
 * move-week-trips.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Shifts all trips scheduled Apr 12–18 → Apr 19–25 (exactly +7 days).
 * Preserves the exact time-of-day for every trip.
 *
 * HOW TO USE
 * 1. Log in to the app in your browser.
 * 2. Open DevTools → Console.
 * 3. Paste this entire script and press Enter — dry-run runs automatically.
 * 4. Review the table.
 * 5. Type:  await run(false)   to apply.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const CONFIG = {
  BASE_URL:   "https://ontrack-api.agilecyber.com/int/v1",
  TOKEN_KEY:  "fleetyes_ontrack_token",
  FROM_DATE:  "2026-04-12",   // inclusive
  TO_DATE:    "2026-04-18",   // inclusive
  SHIFT_DAYS: 7,
  SHIFT_END_DATE: true,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getToken = () => localStorage.getItem(CONFIG.TOKEN_KEY) ?? "";

async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${CONFIG.BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`${res.status}: ${body.error ?? body.message ?? res.statusText}`);
  }
  return res.status === 204 ? null : res.json();
}

function shiftDate(iso, days) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function inDateRange(iso) {
  if (!iso) return false;
  const date = iso.slice(0, 10);
  return date >= CONFIG.FROM_DATE && date <= CONFIG.TO_DATE;
}

// ─── Fetch from /orders/list (same endpoint the calendar uses) ─────────────
// Response shape: { data: [...], meta: { last_page, total, ... } }

async function fetchTripsInRange() {
  const trips = [];
  let page = 1;
  let lastPage = 1;

  console.log(`📡 Fetching from /orders/list — ALL pages, no server-side date filter…`);

  do {
    const qs = new URLSearchParams({ limit: "500", page: String(page) });
    const data = await apiFetch(`/orders/list?${qs}`);

    // /orders/list returns { data: [...] }, NOT { orders: [...] }
    const batch = data?.data ?? [];
    lastPage = data?.meta?.last_page ?? 1;

    const matched = batch.filter(o => inDateRange(o.scheduled_at));
    trips.push(...matched);

    console.log(`   page ${page}/${lastPage} — ${batch.length} orders, ${matched.length} in range`);
    page++;
  } while (page <= lastPage);

  console.log(`\n📋 Total in range (${CONFIG.FROM_DATE} → ${CONFIG.TO_DATE}): ${trips.length} trips`);
  return trips;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run(dryRun = true) {
  const trips = await fetchTripsInRange();

  console.log(`\n${ dryRun ? "🔍 DRY RUN — nothing will be changed" : "🚀 LIVE RUN — applying updates" }`);

  if (trips.length === 0) {
    console.warn("⚠️  No trips found in the date range.");
    return;
  }

  const tableData = trips.map(o => ({
    uuid:     o.uuid,
    id:       o.public_id ?? o.uuid,
    status:   o.status,
    from:     o.scheduled_at?.slice(0, 16).replace("T", " "),
    to:       shiftDate(o.scheduled_at, CONFIG.SHIFT_DAYS).slice(0, 16).replace("T", " "),
    driver:   o.driver_assigned?.name ?? o.driver_name ?? "–",
    vehicle:  o.vehicle_assigned?.plate_number ?? o.vehicle_assigned?.name ?? "–",
    end_from: o.estimated_end_date?.slice(0, 16).replace("T", " ") ?? "–",
    end_to:   o.estimated_end_date && CONFIG.SHIFT_END_DATE
                ? shiftDate(o.estimated_end_date, CONFIG.SHIFT_DAYS).slice(0, 16).replace("T", " ")
                : "–",
  }));
  console.table(tableData);

  if (dryRun) {
    console.log("\n✅ Dry run complete. To apply:  await run(false)");
    return;
  }

  // ─── Apply + Verify ───────────────────────────────────────────────────────
  let ok = 0, verifyFail = 0, fail = 0;

  for (const order of trips) {
    const newScheduledAt    = shiftDate(order.scheduled_at, CONFIG.SHIFT_DAYS);
    const newEstimatedEnd   = order.estimated_end_date && CONFIG.SHIFT_END_DATE
                                ? shiftDate(order.estimated_end_date, CONFIG.SHIFT_DAYS)
                                : undefined;
    const payload = {
      order: {
        scheduled_at: newScheduledAt,
        ...(newEstimatedEnd ? { estimated_end_date: newEstimatedEnd } : {}),
      },
    };

    try {
      // 1. Apply the update
      await apiFetch(`/orders/${order.uuid}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      // 2. Re-fetch to verify the change actually stuck
      const check = await apiFetch(`/orders/list/${order.uuid}`);
      const saved = check?.data?.scheduled_at ?? check?.order?.scheduled_at ?? "?";
      const savedDate = saved.slice(0, 10);
      const expectedDate = newScheduledAt.slice(0, 10);

      if (savedDate === expectedDate) {
        console.log(`  ✅ ${order.public_id ?? order.uuid}  →  ${saved.slice(0, 16)}  (verified)`);
        ok++;
      } else {
        console.warn(`  ⚠️  ${order.public_id ?? order.uuid}  PUT ok but still shows ${saved.slice(0, 10)} (expected ${expectedDate})`);
        verifyFail++;
      }
    } catch (err) {
      console.error(`  ❌ ${order.public_id ?? order.uuid}  FAILED: ${err.message}`);
      fail++;
    }

    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n🏁 Done — ${ok} verified, ${verifyFail} PUT-ok-but-not-saved, ${fail} errors.`);
  if (verifyFail > 0) {
    console.warn("⚠️  Some orders appeared to update (200 OK) but the date did not change. Check if the field name or payload format is wrong.");
  }
}

// Auto dry-run on paste
console.clear();
run(true);
