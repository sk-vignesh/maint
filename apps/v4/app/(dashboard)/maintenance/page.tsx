"use client"
import { useSearchParams } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import * as React from "react"
import {
  CheckCircle2, XCircle, AlertTriangle, Car, Users, Bell, Settings,
  ClipboardList, Wrench, ShieldCheck, Activity, Download, Plus,
  ChevronRight, Camera, PenLine, Clock, MapPin, BarChart3,
  BadgeCheck, Truck, CalendarDays, FileText, ToggleLeft,
} from "lucide-react"

// ─── SHARED DATA ─────────────────────────────────────────────────────────────

const vehicles = [
  { id:"v1", reg:"NUX9VAM", make:"Volvo",   model:"FH 500",   year:2021, weight:"44t", vin:"YV2RT40A4LA123456", mot:"2026-11-14", interval:6, lastPMI:"2026-01-29", status:"amber",  driver:"James O'Connor"   },
  { id:"v2", reg:"TB67KLM", make:"DAF",     model:"XF 480",   year:2020, weight:"44t", vin:"XL1AS20DA0E453201", mot:"2026-08-22", interval:6, lastPMI:"2026-01-15", status:"red",    driver:"Maria Santos"     },
  { id:"v3", reg:"PN19RFX", make:"Mercedes",model:"Actros",   year:2019, weight:"44t", vin:"WDB9634031L456789", mot:"2026-06-30", interval:8, lastPMI:"2026-02-10", status:"green",  driver:"Piotr Kowalski"   },
  { id:"v4", reg:"LK21DVA", make:"Scania",  model:"R 450",    year:2021, weight:"44t", vin:"YS2R4X20001234567", mot:"2026-10-18", interval:6, lastPMI:"2026-02-20", status:"green",  driver:"Lena Fischer"     },
  { id:"v5", reg:"OU70TBN", make:"Iveco",   model:"S-Way",    year:2020, weight:"26t", vin:"ZCFC7T0A004567890", mot:"2026-07-05", interval:4, lastPMI:"2025-12-10", status:"red",    driver:"Ahmed Hassan"     },
  { id:"v6", reg:"YJ19HKP", make:"MAN",     model:"TGX 18.510",year:2019,weight:"44t", vin:"WMA09YZZ1KM123456", mot:"2026-09-12", interval:6, lastPMI:"2026-02-05", status:"amber",  driver:"Sophie Turner"    },
]

function nextPMIDate(lastPMI: string, interval: number) {
  const d = new Date(lastPMI)
  d.setDate(d.getDate() + interval * 7)
  return d
}
function daysUntil(date: Date) {
  return Math.round((date.getTime() - Date.now()) / 86400000)
}
function fmtDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })
}

const statusConfig = {
  green: { label:"Compliant",   bg:"bg-green-500/15",  border:"border-green-500",  text:"text-green-700 dark:text-green-400",  dot:"bg-green-500"  },
  amber: { label:"Due Soon",    bg:"bg-amber-500/15",   border:"border-amber-500",  text:"text-amber-700 dark:text-amber-400",  dot:"bg-amber-500"  },
  red:   { label:"Overdue/VOR", bg:"bg-red-500/15",    border:"border-red-500",    text:"text-red-700 dark:text-red-400",      dot:"bg-red-500"    },
}

const pmiChecklist = [
  { section:"Brakes", items:["Service brake function","Air pressure warning","Brake fluid / air leaks","Handbrake function","ABS warning light"] },
  { section:"Steering", items:["Steering play & feel","Power steering fluid","Column & joints"] },
  { section:"Tyres & Wheels", items:["Tread depth (min 1mm)","Tyre condition / sidewalls","Wheel nuts torqued","Spare tyre"] },
  { section:"Lights & Electrics", items:["Headlights main beam","Headlights dipped","Tail lights & brake lights","Indicators & hazards","Reverse light & audible warning","Dashboard warning lights"] },
  { section:"Body & Cab", items:["Windscreen (no cracks)","Wipers & washers","Mirrors & condition","Horn","Seatbelts"] },
  { section:"Engine & Fluids", items:["Engine oil level","Coolant level","AdBlue level","Fuel leaks","Battery condition"] },
  { section:"Suspension & Chassis", items:["Air bags condition","Spring leaves","Chassis for cracks","Kingpin & fifth wheel"] },
  { section:"Trailer Coupling", items:["Fifth wheel lubricated","Coupling locks correctly","Trailer electrical socket","Air lines connected"] },
]

const defects = [
  { id:"d1", date:"2026-03-10", reg:"TB67KLM", reporter:"Maria Santos",      role:"Driver",     type:"Walkaround", item:"Warning Light",       desc:"DPF warning illuminated",                status:"open"    },
  { id:"d2", date:"2026-03-05", reg:"NUX9VAM", reporter:"Gareth Williams",   role:"Technician", type:"PMI",        item:"Tyre – nearside rear", desc:"Tread depth 2.1mm – advisory",          status:"resolved"},
  { id:"d3", date:"2026-02-20", reg:"OU70TBN", reporter:"Ahmed Hassan",      role:"Driver",     type:"Walkaround", item:"Brake",               desc:"Air leak noise from rear axle group",    status:"open"    },
  { id:"d4", date:"2026-02-18", reg:"YJ19HKP", reporter:"Gareth Williams",   role:"Technician", type:"PMI",        item:"ABS light",           desc:"ABS warning fault – sensor replaced",    status:"resolved"},
]

// ─── SUB COMPONENTS ───────────────────────────────────────────────────────────

function KPICard({ label, value, sub, icon: Icon, color }: { label:string; value:string|number; sub?:string; icon:React.ElementType; color:string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</p>
        {sub && <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  )
}

function StatusDot({ s }: { s: keyof typeof statusConfig }) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${statusConfig[s].dot}`} />
}

// ─── TAB 1: DASHBOARD ─────────────────────────────────────────────────────────

function DashboardTab() {
  const vor   = vehicles.filter(v => v.status === "red").length
  const amber = vehicles.filter(v => v.status === "amber").length
  const green = vehicles.filter(v => v.status === "green").length
  const pmiOnTime = Math.round((green / vehicles.length) * 100)

  // 8-week rolling schedule
  const schedule: { week: string; vehicles: typeof vehicles }[] = []
  for (let w = 0; w < 8; w++) {
    const wStart = new Date(); wStart.setDate(wStart.getDate() + w * 7)
    const wEnd   = new Date(wStart); wEnd.setDate(wEnd.getDate() + 6)
    const due = vehicles.filter(v => {
      const d = nextPMIDate(v.lastPMI, v.interval)
      return d >= wStart && d <= wEnd
    })
    schedule.push({ week: `w/c ${fmtDate(wStart)}`, vehicles: due })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard label="VOR (Off Road)"              value={vor}       sub="vehicles grounded"      icon={Truck}      color="bg-red-500"    />
        <KPICard label="Due Within 7 Days"           value={amber}     sub="needs booking"          icon={AlertTriangle} color="bg-amber-500" />
        <KPICard label="Fully Compliant"             value={green}     sub="vehicles in green"      icon={CheckCircle2} color="bg-green-500" />
        <KPICard label="PMI On-Time Rate"            value={`${pmiOnTime}%`} sub="DVSA target: 100%" icon={BarChart3}  color="bg-indigo-500" />
      </div>

      {/* Earned Recognition */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <BadgeCheck className="h-5 w-5 text-indigo-500" />
          <h3 className="font-semibold">Earned Recognition KPIs</h3>
          <span className="ml-auto rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">DVSA Scheme</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label:"PMI Completed On Time", value: pmiOnTime, target:100 },
            { label:"Defects Found & Fixed",  value: 87,        target:100 },
            { label:"Roadworthiness Rate",    value: 94,        target:100 },
          ].map(k => (
            <div key={k.label} className="rounded-lg border bg-muted/20 p-3">
              <div className="flex justify-between text-xs">
                <span className="font-medium">{k.label}</span>
                <span className={k.value >= k.target ? "text-green-600" : "text-amber-600"}>{k.value}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full transition-all ${k.value >= k.target ? "bg-green-500" : k.value >= 90 ? "bg-amber-500" : "bg-red-500"}`} style={{ width:`${k.value}%` }} />
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">Target: {k.target}%</p>
            </div>
          ))}
        </div>
      </div>

      {/* Traffic Light Grid — sorted: red → amber → green */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="mb-4 font-semibold">Fleet Status Board</h3>
        <div className="flex flex-col gap-2">
          {([...vehicles].sort((a,b)=>({red:0,amber:1,green:2}[a.status as string]??3)-({red:0,amber:1,green:2}[b.status as string]??3))).map((v,idx,arr) => {
            const next = nextPMIDate(v.lastPMI, v.interval)
            const days = daysUntil(next)
            const s = statusConfig[v.status as keyof typeof statusConfig]
            const showDivider = idx > 0 && v.status === 'green' && arr[idx-1]?.status !== 'green'
            return (
              <React.Fragment key={v.id}>
                {showDivider && (
                  <div className="flex items-center gap-2 my-1">
                    <div className="flex-1 border-t border-dashed" />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Compliant</span>
                    <div className="flex-1 border-t border-dashed" />
                  </div>
                )}
                <div className={`flex items-center gap-3 rounded-lg border-l-4 ${s.border} ${s.bg} p-3 ${v.status!=='green'?(v.status==='red'?'ring-1 ring-inset ring-red-400/50':'ring-1 ring-inset ring-amber-400/50'):''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <StatusDot s={v.status as keyof typeof statusConfig} />
                    <span className="font-semibold text-sm font-mono">{v.reg}</span>
                    <span className="text-xs text-muted-foreground">{v.make} {v.model}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground truncate">Driver: {v.driver}</p>
                  <p className={`mt-0.5 text-xs font-medium ${s.text}`}>
                    Next PMI: {fmtDate(next)} ({days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`})
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${s.text} ${s.bg}`}>{s.label}</span>
                </div>
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {/* 8-week rolling schedule */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">8-Week PMI Schedule</h3>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {schedule.map((wk, i) => (
            <div key={i} className={`rounded-lg border p-3 ${wk.vehicles.length ? "border-indigo-300 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950/20" : "bg-muted/20"}`}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{wk.week}</p>
              {wk.vehicles.length === 0
                ? <p className="mt-1 text-xs text-muted-foreground">No PMIs due</p>
                : wk.vehicles.map(v => <p key={v.id} className="mt-1 text-xs font-medium font-mono">{v.reg}</p>)
              }
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── TAB 2: PMI SCHEDULE (list → detail) ──────────────────────────────────────

type ItemState = "pass" | "fail" | "advisory" | null

// Sorted list of vehicles by urgency (most overdue / soonest first)
function sortedByUrgency() {
  return [...vehicles].sort((a, b) => {
    const da = daysUntil(nextPMIDate(a.lastPMI, a.interval))
    const db = daysUntil(nextPMIDate(b.lastPMI, b.interval))
    return da - db
  })
}

function PMIDetailSheet({ vehicleId, onBack }: { vehicleId: string; onBack: () => void }) {
  const [states, setStates] = React.useState<Record<string, ItemState>>({})
  const [brakeAxle1, setBrakeAxle1] = React.useState("")
  const [brakeAxle2, setBrakeAxle2] = React.useState("")
  const [signed, setSigned]         = React.useState(false)
  const [sigText, setSigText]       = React.useState("")
  const [submitted, setSubmitted]   = React.useState(false)
  const now = new Date()
  const veh = vehicles.find(v => v.id === vehicleId)!
  const total    = pmiChecklist.flatMap(s => s.items).length
  const passed   = Object.values(states).filter(v => v === "pass").length
  const failed   = Object.values(states).filter(v => v === "fail").length
  const advisory = Object.values(states).filter(v => v === "advisory").length

  function setItem(key: string, v: ItemState) {
    setStates(p => ({ ...p, [key]: p[key] === v ? null : v }))
  }

  if (submitted) return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <CheckCircle2 className="h-16 w-16 text-green-500" />
      <h2 className="text-2xl font-bold">PMI Submitted</h2>
      <p className="text-muted-foreground">Inspection recorded for <strong>{veh.reg}</strong> at {now.toLocaleTimeString("en-GB")} · {now.toLocaleDateString("en-GB")}</p>
      <p className="text-xs text-muted-foreground">Pass {passed} · Advisory {advisory} · Fail {failed} of {total} items</p>
      <button onClick={onBack} className="mt-2 rounded-lg border px-4 py-2 text-sm hover:bg-muted">← Back to Schedule</button>
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Top cards — 2-col: Progress (left) + Technician (right) */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Left: live inspection progress */}
        <div className="rounded-xl border bg-card p-4 shadow-sm flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Inspection Progress</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <p className="text-[10px] text-muted-foreground">Items Completed</p>
              <p className="text-sm font-semibold">{passed + failed + advisory} / {total}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Results</p>
              <p className="text-xs font-semibold">
                <span className="text-green-600">{passed} Pass</span>
                {advisory > 0 && <span className="ml-1 text-amber-600">{advisory} Adv</span>}
                {failed > 0 && <span className="ml-1 text-red-600">{failed} Fail</span>}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Location</p>
              <p className="text-xs font-medium">52.7233° N · Towers Business Park</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Interval</p>
              <p className="text-xs font-medium">{veh.interval}w · {veh.make} {veh.model}</p>
            </div>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${((passed+failed+advisory)/total)*100}%` }} />
          </div>
        </div>

        {/* Right: technician + declaration */}
        <div className="rounded-xl border bg-card p-4 shadow-sm flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Technician Declaration</p>
          <input defaultValue="Gareth Williams" className="h-8 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Technician name" />
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3 shrink-0" />
            <span>{now.toLocaleDateString("en-GB")} {now.toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" })}</span>
          </div>
          <p className="text-[11px] text-muted-foreground border-t pt-2">
            I confirm that{" "}
            <span className="font-mono font-semibold text-foreground">{veh.reg}</span>{" "}
            has been inspected in accordance with the DVSA Guide to Maintaining Roadworthiness and is, to the best of my knowledge, roadworthy.
          </p>
          <div className="flex items-center gap-2">
            <input value={sigText} onChange={e => setSigText(e.target.value)} placeholder="Type full name to sign" className="h-8 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
            <button onClick={() => setSigned(!!sigText)} disabled={!sigText} className={`shrink-0 inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors ${signed ? "bg-green-500 text-white" : "border bg-background hover:bg-muted disabled:opacity-50"}`}>
              {signed ? <><CheckCircle2 className="h-3.5 w-3.5" /> Signed</> : "Sign"}
            </button>
          </div>
          {signed && <p className="text-[10px] text-green-600">Signed by <strong>{sigText}</strong> at {now.toLocaleTimeString("en-GB")}</p>}
        </div>
      </div>

      {/* Checklist — 3-column grid of compact section cards */}
      <div className="grid grid-cols-3 gap-3">
        {pmiChecklist.map(section => (
          <div key={section.section} className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="border-b bg-muted/40 px-3 py-2 flex items-center gap-1.5">
              <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold text-xs">{section.section}</span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                {section.items.filter(item => states[`${section.section}::${item}`] === "pass").length}/{section.items.length}
              </span>
            </div>
            <div className="divide-y">
              {section.items.map(item => {
                const key = `${section.section}::${item}`
                const st  = states[key]
                return (
                  <div key={item} className="flex items-center justify-between gap-1.5 px-3 py-1.5">
                    <span className="text-[11px] flex-1 min-w-0 truncate" title={item}>{item}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setItem(key,"pass")}     className={`rounded px-1.5 py-0.5 text-[9px] font-medium transition-colors ${st==="pass"     ? "bg-green-500 text-white" : "border hover:bg-green-50 dark:hover:bg-green-950/20 text-muted-foreground"}`}>P</button>
                      <button onClick={() => setItem(key,"advisory")} className={`rounded px-1.5 py-0.5 text-[9px] font-medium transition-colors ${st==="advisory" ? "bg-amber-500 text-white" : "border hover:bg-amber-50 dark:hover:bg-amber-950/20 text-muted-foreground"}`}>A</button>
                      <button onClick={() => setItem(key,"fail")}     className={`rounded px-1.5 py-0.5 text-[9px] font-medium transition-colors ${st==="fail"     ? "bg-red-500 text-white"   : "border hover:bg-red-50 dark:hover:bg-red-950/20 text-muted-foreground"}`}>F</button>
                      <button
                        title={st==="fail" ? "Attach photo (required)" : st==="advisory" ? "Attach photo (recommended)" : "Attach photo (optional)"}
                        className={`flex items-center justify-center h-5 w-5 rounded border transition-colors ${
                          st==="fail"     ? "border-red-400 text-red-500 bg-red-50 dark:bg-red-950/20 hover:bg-red-100" :
                          st==="advisory" ? "border-amber-400 text-amber-500 bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100" :
                          "border-dashed border-muted-foreground/40 text-muted-foreground/40 hover:border-muted-foreground hover:text-muted-foreground"
                        }`}
                      ><Camera className="h-2.5 w-2.5" /></button>
                      {st === "fail" && (
                        <select className="h-5 rounded border text-[9px] bg-background px-0.5"><option>Advisory</option><option>Dangerous</option></select>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Brake test */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="mb-4 font-semibold flex items-center gap-2"><Activity className="h-4 w-4 text-indigo-500" /> Brake Test Results (DVSA Required)</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { label:"Axle 1 Efficiency (%)", val:brakeAxle1, set:setBrakeAxle1 },
            { label:"Axle 2 Efficiency (%)", val:brakeAxle2, set:setBrakeAxle2 },
          ].map(f => (
            <div key={f.label}>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{f.label}</label>
              <input type="number" min={0} max={100} value={f.val} onChange={e => f.set(e.target.value)} placeholder="e.g. 52" className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
              {f.val && <p className={`mt-1 text-xs ${Number(f.val) >= 50 ? "text-green-600" : "text-red-600"}`}>{Number(f.val) >= 50 ? "✓ Meets DVSA minimum (50%)" : "✗ Below DVSA minimum – FAIL"}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3">
        <button disabled={!signed} onClick={() => setSubmitted(true)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
        >
          <ShieldCheck className="h-4 w-4" /> Submit PMI Report
        </button>
        {!signed && <p className="text-xs text-muted-foreground">Sign the declaration above to enable submission.</p>}
      </div>
    </div>
  )

}

function PMITab({
  openVehicleId,
  setOpenVehicleId,
}: {
  openVehicleId: string | null
  setOpenVehicleId: (id: string | null) => void
}) {
  const sorted = sortedByUrgency()

  if (openVehicleId) {
    return <PMIDetailSheet vehicleId={openVehicleId} onBack={() => setOpenVehicleId(null)} />
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">Select a vehicle to begin or review its PMI inspection sheet. Sorted by urgency.</p>
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="border-b bg-muted/40 px-4 py-2.5 flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm">PMI Schedule — All Vehicles</span>
          <span className="ml-auto text-xs text-muted-foreground">Click a row to open inspection sheet</span>
        </div>
        <div className="divide-y">
          {sorted.map(v => {
            const next = nextPMIDate(v.lastPMI, v.interval)
            const days = daysUntil(next)
            const s = statusConfig[v.status as keyof typeof statusConfig]
            return (
              <button
                key={v.id}
                onClick={() => setOpenVehicleId(v.id)}
                className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
              >
                <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold font-mono text-sm">{v.reg}</span>
                    <span className="text-xs text-muted-foreground">{v.make} {v.model}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">Driver: {v.driver} · Interval: {v.interval}w</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-xs font-semibold ${s.text}`}>
                    {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Due today" : `Due in ${days}d`}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{fmtDate(next)}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0 ${s.text} ${s.bg}`}>{s.label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── TAB 3: DEFECTS ──────────────────────────────────────────────────────────

function DefectsTab() {
  const [filter, setFilter] = React.useState("all")
  const [signOff, setSignOff] = React.useState<Record<string, boolean>>({})
  const filtered = defects.filter(d => filter === "all" || d.status === filter)

  return (
    <div className="flex flex-col gap-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard label="Open Defects"    value={defects.filter(d=>d.status==="open").length}     icon={AlertTriangle} color="bg-red-500"   sub="requires action" />
        <KPICard label="Resolved"        value={defects.filter(d=>d.status==="resolved").length} icon={CheckCircle2}  color="bg-green-500" sub="completed" />
        <KPICard label="Total Defects"   value={defects.length}                                  icon={FileText}      color="bg-indigo-500" sub="all time" />
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        {["all","open","resolved"].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${filter===f ? "bg-primary text-primary-foreground" : "border bg-background hover:bg-muted"}`}>{f}</button>
        ))}
      </div>

      {/* Defect thread */}
      <div className="flex flex-col gap-4">
        {filtered.map(d => (
          <div key={d.id} className={`rounded-xl border shadow-sm overflow-hidden ${d.status==="open" ? "border-red-200 dark:border-red-900/40" : "border-green-200 dark:border-green-900/40"}`}>
            <div className={`flex items-center justify-between gap-3 px-4 py-3 ${d.status==="open" ? "bg-red-50 dark:bg-red-950/20" : "bg-green-50 dark:bg-green-950/20"}`}>
              <div className="flex items-center gap-2">
                {d.status==="open" ? <AlertTriangle className="h-4 w-4 text-red-500" /> : <CheckCircle2 className="h-4 w-4 text-green-500" />}
                <span className="font-semibold text-sm">{d.item}</span>
                <span className="font-mono text-xs text-muted-foreground">{d.reg}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border px-2 py-0.5 text-[10px] font-medium">{d.type}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${d.status==="open" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>{d.status}</span>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm">{d.desc}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span><Clock className="inline h-3 w-3 mr-1" />{d.date}</span>
                <span><Users className="inline h-3 w-3 mr-1" />{d.reporter} ({d.role})</span>
              </div>

              {/* Parts & Labour */}
              {d.status === "resolved" && (
                <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
                  <p className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Rectification Record</p>
                  <p><span className="font-medium">Parts Used:</span> {d.id==="d2" ? "Advisory – no parts required" : "DPF pressure sensor, EGR valve gasket"}</p>
                  <p><span className="font-medium">Labour:</span> {d.id==="d2" ? "0h 15m" : "2h 45m"}</p>
                  <p><span className="font-medium">Signed off by:</span> Gareth Williams · {d.date}</p>
                </div>
              )}

              {/* Sign-off for open defects */}
              {d.status === "open" && !signOff[d.id] && (
                <div className="rounded-lg border border-dashed p-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Log Rectification</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input placeholder="Parts used" className="h-8 rounded-lg border bg-background px-2 text-xs outline-none" />
                    <input placeholder="Labour (e.g. 1h 30m)" className="h-8 rounded-lg border bg-background px-2 text-xs outline-none" />
                  </div>
                  <button onClick={() => setSignOff(p => ({ ...p, [d.id]: true }))} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-green-500 px-3 text-xs font-medium text-white hover:bg-green-600">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Mark Roadworthy & Sign Off
                  </button>
                </div>
              )}
              {d.status === "open" && signOff[d.id] && (
                <p className="text-xs text-green-600 font-medium">✓ Signed off as Roadworthy</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── TAB 4: SETTINGS ─────────────────────────────────────────────────────────

const roles = [
  { name:"Gareth Williams", email:"gareth@fleetyes.co.uk",  role:"Technician", access:"PMI sheets only"   },
  { name:"Sandra Okafor",   email:"sandra@fleetyes.co.uk",  role:"Technician", access:"PMI sheets only"   },
  { name:"Fleet Manager",   email:"manager@fleetyes.co.uk", role:"Admin",      access:"Full access"       },
  { name:"DVSA Inspector",  email:"dvsa@example.gov.uk",    role:"Auditor",    access:"Read-only"         },
]

function SettingsTab() {
  const [notifPMI, setNotifPMI] = React.useState(true)
  const [notifFail, setNotifFail] = React.useState(true)
  const [notifVOR, setNotifVOR] = React.useState(false)

  return (
    <div className="flex flex-col gap-6">
      {/* Vehicle Profiles */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-3">
          <h3 className="font-semibold flex items-center gap-2"><Truck className="h-4 w-4" /> Vehicle Profiles</h3>
          <button className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"><Plus className="h-3.5 w-3.5" /> Add Vehicle</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b bg-muted/20">
              {["Reg","Make / Model","Year","Weight","VIN","MOT Expiry","Interval","Action"].map(h => (
                <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {vehicles.map(v => (
                <tr key={v.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2 font-mono font-semibold">{v.reg}</td>
                  <td className="px-3 py-2">{v.make} {v.model}</td>
                  <td className="px-3 py-2">{v.year}</td>
                  <td className="px-3 py-2">{v.weight}</td>
                  <td className="px-3 py-2 font-mono text-muted-foreground">{v.vin}</td>
                  <td className="px-3 py-2">{v.mot}</td>
                  <td className="px-3 py-2">{v.interval}w</td>
                  <td className="px-3 py-2"><button className="text-indigo-500 hover:underline">Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Roles */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-3">
          <h3 className="font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> User Roles & Permissions</h3>
          <button className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs hover:bg-muted"><Plus className="h-3.5 w-3.5" /> Invite User</button>
        </div>
        <div className="divide-y">
          {roles.map(r => (
            <div key={r.email} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.email}</p>
              </div>
              <div className="text-right">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.role==="Admin" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" : r.role==="Auditor" ? "bg-gray-100 text-gray-700" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"}`}>{r.role}</span>
                <p className="text-[10px] text-muted-foreground mt-0.5">{r.access}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notification Engine */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="border-b bg-muted/40 px-4 py-3">
          <h3 className="font-semibold flex items-center gap-2"><Bell className="h-4 w-4" /> Notification Engine</h3>
        </div>
        <div className="divide-y p-4 space-y-4">
          {[
            { label:"Alert manager 7 days before PMI is due",        sub:"Email + Push",    val:notifPMI,  set:setNotifPMI  },
            { label:"Alert manager immediately on PMI fail",          sub:"SMS + Email",     val:notifFail, set:setNotifFail },
            { label:"Alert manager when vehicle is placed VOR",       sub:"Push",            val:notifVOR,  set:setNotifVOR  },
          ].map(n => (
            <div key={n.label} className="flex items-center justify-between gap-4 py-1">
              <div>
                <p className="text-sm font-medium">{n.label}</p>
                <p className="text-xs text-muted-foreground">{n.sub}</p>
              </div>
              <button onClick={() => n.set((p:boolean) => !p)} className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${n.val ? "bg-indigo-500" : "bg-muted border"}`}>
                <span className={`inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform ${n.val ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Checklist */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-3">
          <h3 className="font-semibold flex items-center gap-2"><ToggleLeft className="h-4 w-4" /> Custom Checklist Items</h3>
          <button className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs hover:bg-muted"><Plus className="h-3.5 w-3.5" /> Add Item</button>
        </div>
        <div className="divide-y">
          {["Tail lift function & safety cutout","Refrigeration unit thermostat reading","Hiab crane slew ring bolts","Load securing straps condition"].map(item => (
            <div key={item} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-sm">{item}</span>
              <div className="flex gap-2">
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">Custom</span>
                <button className="text-xs text-muted-foreground hover:text-red-500">Remove</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data Export */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <h3 className="mb-4 font-semibold flex items-center gap-2"><Download className="h-4 w-4" /> Data Export & Integrations</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label:"Full Vehicle History PDF",    sub:"All PMI reports for all vehicles" },
            { label:"Compliance Report (DVSA)",    sub:"Earned Recognition format"        },
            { label:"Defect Log CSV",              sub:"All open and resolved defects"    },
            { label:"Sync with Samsara / Webfleet",sub:"Live mileage API integration"    },
          ].map(e => (
            <button key={e.label} className="flex items-center gap-3 rounded-lg border bg-muted/20 px-4 py-3 text-left hover:bg-muted/40 transition-colors">
              <Download className="h-4 w-4 shrink-0 text-indigo-500" />
              <div>
                <p className="text-sm font-medium">{e.label}</p>
                <p className="text-xs text-muted-foreground">{e.sub}</p>
              </div>
              <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── PAGE SHELL ───────────────────────────────────────────────────────────────

const TABS = [
  { id:"dashboard", label:"Dashboard",  icon:BarChart3    },
  { id:"pmi",       label:"PMI Sheet",  icon:ClipboardList },
  { id:"defects",   label:"Defects",    icon:Wrench       },
  { id:"settings",  label:"Settings",   icon:Settings     },
] as const

function MaintenancePageInner() {
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get("tab") ?? "dashboard") as typeof TABS[number]["id"]
  const [tab, setTab] = React.useState<typeof TABS[number]["id"]>(
    TABS.some(t => t.id === initialTab) ? initialTab : "dashboard"
  )
  const vor = vehicles.filter(v => v.status === "red").length
  const [pmiVehicleId, setPmiVehicleId] = React.useState<string | null>(null)
  const pmiVeh = pmiVehicleId ? vehicles.find(v => v.id === pmiVehicleId) : null
  const pmiStatus = pmiVeh ? statusConfig[pmiVeh.status as keyof typeof statusConfig] : null

  return (
    <div className="flex flex-1 flex-col gap-4 p-6 md:p-8 lg:p-10">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <PageHeader pageKey="maintenance" />
          <p className="mt-1 text-sm text-muted-foreground">DVSA-compliant PMI management · Fleet compliance tracking</p>
        </div>
        {vor > 0 && (
          <div className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
            <XCircle className="h-4 w-4" /> {vor} Vehicle{vor>1?"s":""} Off Road
          </div>
        )}
      </div>

      {/* Tabs + contextual controls */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1 rounded-xl border bg-muted/30 p-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); if (t.id !== "pmi") setPmiVehicleId(null) }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 px-2 text-xs font-medium transition-colors ${tab===t.id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <t.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
        {tab === "pmi" && pmiVehicleId && pmiVeh && pmiStatus && (
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => setPmiVehicleId(null)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs hover:bg-muted">← Schedule</button>
            <button className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-background px-3 text-xs text-muted-foreground hover:bg-muted"><Download className="h-3.5 w-3.5" /> PDF</button>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${pmiStatus.text} ${pmiStatus.bg}`}>{pmiStatus.label}</span>
          </div>
        )}
      </div>

      {/* Content */}
      {tab === "dashboard" && <DashboardTab />}
      {tab === "pmi"       && <PMITab openVehicleId={pmiVehicleId} setOpenVehicleId={setPmiVehicleId} />}
      {tab === "defects"   && <DefectsTab />}
      {tab === "settings"  && <SettingsTab />}
    </div>
  )
}

export default function MaintenancePage() {
  return (
    <React.Suspense fallback={<div className="flex flex-1 items-center justify-center p-10 text-muted-foreground">Loading…</div>}>
      <MaintenancePageInner />
    </React.Suspense>
  )
}
