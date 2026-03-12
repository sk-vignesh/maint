"use client"
import * as React from "react"
import {
  CheckCircle2, XCircle, AlertTriangle, Camera, PenLine, Clock,
  MapPin, Users, FileText, ShieldCheck, Activity, BadgeCheck,
  CalendarDays, Bell, Upload, Download, ChevronRight, Plus,
  Car, Truck, AlertCircle, RefreshCw, Lock, Zap, BookOpen,
  BarChart3, Flag, Wrench,
} from "lucide-react"

// ─── SHARED DATA ─────────────────────────────────────────────────────────────

const drivers = [
  { id:"d1", name:"James O'Connor",  licence:"C+E", points:2,  expiry:"2029-04-30", cpcHours:28, cpcDeadline:"2027-09-15", rtw:"2027-06-01", visaExp:"2027-06-01", adr:true,  adrExp:"2026-11-01", risk:"low"    },
  { id:"d2", name:"Maria Santos",    licence:"C+E", points:9,  expiry:"2026-11-15", cpcHours:14, cpcDeadline:"2026-06-01", rtw:"2026-08-20", visaExp:"2026-08-20", adr:false, adrExp:"",           risk:"high"   },
  { id:"d3", name:"Piotr Kowalski",  licence:"C",   points:0,  expiry:"2031-02-28", cpcHours:35, cpcDeadline:"2028-03-10", rtw:null,         visaExp:null,        adr:true,  adrExp:"2027-03-22", risk:"low"    },
  { id:"d4", name:"Lena Fischer",    licence:"C+E", points:6,  expiry:"2028-07-12", cpcHours:21, cpcDeadline:"2027-01-20", rtw:"2028-01-15", visaExp:"2028-01-15", adr:false, adrExp:"",           risk:"medium" },
  { id:"d5", name:"Ahmed Hassan",    licence:"C",   points:3,  expiry:"2027-09-01", cpcHours:8,  cpcDeadline:"2026-09-01", rtw:"2026-12-01", visaExp:"2026-12-01", adr:false, adrExp:"",           risk:"medium" },
  { id:"d6", name:"Sophie Turner",   licence:"C+E", points:0,  expiry:"2032-01-05", cpcHours:35, cpcDeadline:"2029-05-15", rtw:null,         visaExp:null,        adr:true,  adrExp:"2026-07-01", risk:"low"    },
]

const vehicles = [
  { reg:"NUX9VAM", make:"Volvo FH 500",    mot:"2026-11-14", tacho:"2026-08-01", loler:"2026-09-01", lolerType:"Tail Lift"  },
  { reg:"TB67KLM", make:"DAF XF 480",      mot:"2026-08-22", tacho:"2027-01-15", loler:null,         lolerType:null         },
  { reg:"PN19RFX", make:"Mercedes Actros", mot:"2026-06-30", tacho:"2026-05-20", loler:"2026-11-15", lolerType:"Hiab Crane" },
  { reg:"LK21DVA", make:"Scania R 450",    mot:"2026-10-18", tacho:"2026-12-01", loler:null,         lolerType:null         },
  { reg:"OU70TBN", make:"Iveco S-Way",     mot:"2026-07-05", tacho:"2026-06-10", loler:"2027-01-10", lolerType:"Tail Lift"  },
  { reg:"YJ19HKP", make:"MAN TGX 18.510", mot:"2026-09-12", tacho:"2026-10-30", loler:"2026-07-22", lolerType:"Tail Lift"  },
]

const documents = [
  // ── O-LICENCE ──────────────────────────────────────────────────────────────
  { id:"doc01", cat:"O-Licence",   name:"Operator's Licence Disc (Standard National)",          expiry:"2028-04-30", signed:true,  status:"ok"      },
  { id:"doc02", cat:"O-Licence",   name:"Transport Manager CPC Certificate – G. Williams",      expiry:null,         signed:true,  status:"ok"      },
  { id:"doc03", cat:"O-Licence",   name:"O-Licence Undertakings Acknowledgement",               expiry:null,         signed:true,  status:"ok"      },
  { id:"doc04", cat:"O-Licence",   name:"Traffic Commissioner Correspondence – Mar 2026",       expiry:null,         signed:true,  status:"ok"      },
  { id:"doc05", cat:"O-Licence",   name:"Operating Centre Planning Approval",                   expiry:null,         signed:true,  status:"ok"      },

  // ── VEHICLE ─────────────────────────────────────────────────────────────────
  { id:"doc06", cat:"Vehicle",     name:"NUX9VAM – MOT / Annual Test Certificate",              expiry:"2026-11-14", signed:true,  status:"ok"      },
  { id:"doc07", cat:"Vehicle",     name:"TB67KLM – MOT / Annual Test Certificate",              expiry:"2026-08-22", signed:true,  status:"ok"      },
  { id:"doc08", cat:"Vehicle",     name:"PN19RFX – MOT / Annual Test Certificate",              expiry:"2026-06-30", signed:true,  status:"expiring"},
  { id:"doc09", cat:"Vehicle",     name:"LK21DVA – MOT / Annual Test Certificate",              expiry:"2026-10-18", signed:true,  status:"ok"      },
  { id:"doc10", cat:"Vehicle",     name:"OU70TBN – MOT / Annual Test Certificate",              expiry:"2026-07-05", signed:true,  status:"ok"      },
  { id:"doc11", cat:"Vehicle",     name:"YJ19HKP – MOT / Annual Test Certificate",              expiry:"2026-09-12", signed:true,  status:"ok"      },
  { id:"doc12", cat:"Vehicle",     name:"NUX9VAM – V5C Registration Document",                  expiry:null,         signed:true,  status:"ok"      },
  { id:"doc13", cat:"Vehicle",     name:"TB67KLM – Vehicle Excise Duty (VED) Receipt",          expiry:"2026-12-31", signed:true,  status:"ok"      },
  { id:"doc14", cat:"Vehicle",     name:"NUX9VAM – Tachograph Calibration Certificate",         expiry:"2026-08-01", signed:true,  status:"ok"      },
  { id:"doc15", cat:"Vehicle",     name:"PN19RFX – Tachograph Calibration Certificate",         expiry:"2026-05-20", signed:true,  status:"expiring"},
  { id:"doc16", cat:"Vehicle",     name:"YJ19HKP – Tachograph Calibration Certificate",         expiry:"2026-10-30", signed:true,  status:"ok"      },
  { id:"doc17", cat:"Vehicle",     name:"NUX9VAM – LOLER Tail Lift Inspection (6-monthly)",    expiry:"2026-09-01", signed:true,  status:"ok"      },
  { id:"doc18", cat:"Vehicle",     name:"PN19RFX – LOLER Hiab Crane Inspection (6-monthly)",   expiry:"2026-11-15", signed:true,  status:"ok"      },
  { id:"doc19", cat:"Vehicle",     name:"YJ19HKP – LOLER Tail Lift Inspection (6-monthly)",    expiry:"2026-07-22", signed:true,  status:"ok"      },
  { id:"doc20", cat:"Vehicle",     name:"Fleet – Speed Limiter Compliance Report",              expiry:"2027-01-01", signed:true,  status:"ok"      },

  // ── TRAILER ─────────────────────────────────────────────────────────────────
  { id:"doc21", cat:"Trailer",     name:"TR1 – Curtainsider Annual Test Certificate",           expiry:"2026-10-05", signed:true,  status:"ok"      },
  { id:"doc22", cat:"Trailer",     name:"TR2 – Fridge Trailer Annual Test Certificate",         expiry:"2026-08-18", signed:true,  status:"ok"      },
  { id:"doc23", cat:"Trailer",     name:"TR1 – Trailer V5C Registration Document",              expiry:null,         signed:true,  status:"ok"      },
  { id:"doc24", cat:"Trailer",     name:"TR2 – Refrigeration Unit Service Record",              expiry:"2026-06-01", signed:true,  status:"expiring"},

  // ── DRIVER ──────────────────────────────────────────────────────────────────
  { id:"doc25", cat:"Driver",      name:"All Drivers – Signed Driver Handbook",                 expiry:null,         signed:true,  status:"ok"      },
  { id:"doc26", cat:"Driver",      name:"Maria Santos – Right to Work (Visa Copy)",             expiry:"2026-08-20", signed:false, status:"expiring"},
  { id:"doc27", cat:"Driver",      name:"Ahmed Hassan – Right to Work Declaration",             expiry:"2026-12-01", signed:false, status:"pending" },
  { id:"doc28", cat:"Driver",      name:"All Drivers – Drug & Alcohol Policy Sign-off",         expiry:"2027-03-01", signed:false, status:"pending" },
  { id:"doc29", cat:"Driver",      name:"James O'Connor – DVLA Licence Check Record",           expiry:"2026-06-01", signed:true,  status:"ok"      },
  { id:"doc30", cat:"Driver",      name:"Maria Santos – DVLA Licence Check Record (High Risk)", expiry:"2026-04-01", signed:true,  status:"expiring"},
  { id:"doc31", cat:"Driver",      name:"Sophie Turner – ADR Certificate (All Classes)",        expiry:"2026-07-01", signed:true,  status:"expiring"},
  { id:"doc32", cat:"Driver",      name:"All Drivers – Agency/Subcontractor Induction Record",  expiry:null,         signed:true,  status:"ok"      },
  { id:"doc33", cat:"Driver",      name:"All Drivers – Manual Handling Certificate",            expiry:"2027-09-01", signed:true,  status:"ok"      },
  { id:"doc34", cat:"Driver",      name:"All Drivers – Driver Medical (D4 Form) Declarations",  expiry:"2027-06-01", signed:true,  status:"ok"      },

  // ── WORKSHOP ────────────────────────────────────────────────────────────────
  { id:"doc35", cat:"Workshop",    name:"PMI Records – All Vehicles (6-wk rolling)",            expiry:null,         signed:true,  status:"ok"      },
  { id:"doc36", cat:"Workshop",    name:"Rectification Sign-off – TB67KLM DPF Defect",          expiry:null,         signed:true,  status:"ok"      },
  { id:"doc37", cat:"Workshop",    name:"Brake Test Records – All Vehicles",                    expiry:null,         signed:true,  status:"ok"      },

  // ── INSURANCE ───────────────────────────────────────────────────────────────
  { id:"doc38", cat:"Insurance",   name:"Fleet Motor Insurance Policy Schedule",                expiry:"2026-09-30", signed:true,  status:"ok"      },
  { id:"doc39", cat:"Insurance",   name:"Goods in Transit Insurance Certificate",               expiry:"2026-09-30", signed:true,  status:"ok"      },
  { id:"doc40", cat:"Insurance",   name:"Public Liability Insurance Certificate",               expiry:"2026-09-30", signed:true,  status:"ok"      },
  { id:"doc41", cat:"Insurance",   name:"Employers' Liability Insurance Certificate",           expiry:"2026-09-30", signed:true,  status:"ok"      },
  { id:"doc42", cat:"Insurance",   name:"Trailer Insurance – TR1 & TR2",                        expiry:"2026-09-30", signed:true,  status:"ok"      },
  { id:"doc43", cat:"Insurance",   name:"FNOL Accident Report – TB67KLM Mar 2026",              expiry:null,         signed:true,  status:"ok"      },

  // ── AUDIT ───────────────────────────────────────────────────────────────────
  { id:"doc44", cat:"Audit",       name:"DVSA Encounter Report – Mar 2026",                     expiry:null,         signed:true,  status:"ok"      },
  { id:"doc45", cat:"Audit",       name:"PG9 Prohibition Notice – Jan 2026 (Cleared)",          expiry:null,         signed:true,  status:"ok"      },
  { id:"doc46", cat:"Audit",       name:"FORS Silver Certificate",                              expiry:"2027-02-28", signed:true,  status:"ok"      },
  { id:"doc47", cat:"Audit",       name:"DVSA Earned Recognition Self-Assessment Report",       expiry:"2027-01-01", signed:true,  status:"ok"      },
  { id:"doc48", cat:"Audit",       name:"Traffic Commissioner Annual Confirmation",             expiry:"2027-04-30", signed:true,  status:"ok"      },

  // ── H&S ─────────────────────────────────────────────────────────────────────
  { id:"doc49", cat:"H&S",         name:"Workshop General Risk Assessment",                     expiry:"2027-03-01", signed:true,  status:"ok"      },
  { id:"doc50", cat:"H&S",         name:"Manual Handling Risk Assessment",                      expiry:"2027-03-01", signed:true,  status:"ok"      },
  { id:"doc51", cat:"H&S",         name:"COSHH Assessment – Workshop Chemicals",                expiry:"2027-01-01", signed:true,  status:"ok"      },
  { id:"doc52", cat:"H&S",         name:"Fire Risk Assessment – Depot",                         expiry:"2027-02-01", signed:true,  status:"ok"      },
  { id:"doc53", cat:"H&S",         name:"Safe System of Work – Tail Lift Operation",            expiry:null,         signed:true,  status:"ok"      },
  { id:"doc54", cat:"H&S",         name:"Safe System of Work – Hiab/Crane Operation",          expiry:null,         signed:true,  status:"ok"      },
]

const walkaroundItems = [
  { section:"Tyres & Wheels",  items:["Offside front tyre condition/pressure","Nearside front tyre condition/pressure","Offside rear tyres (dual)","Nearside rear tyres (dual)","Wheel nuts visible security"] },
  { section:"Lights",          items:["Headlights main & dipped","Tail lights","Brake lights","Indicators (all 4)","Reverse light & audible warning","Marker lights"] },
  { section:"Brakes",          items:["Air pressure build-up","Handbrake holds on incline","Brake pedal feel (no sponginess)"] },
  { section:"Fluids & Engine", items:["Engine oil level","Coolant level","AdBlue level","No visible fuel/oil leaks","Windscreen washer fluid"] },
  { section:"Body & Cab",      items:["Windscreen (no cracks in driver's eye-line)","Wipers functioning","All mirrors present & adjusted","Horn working","No body damage that changes vehicle width"] },
]

const photoPrompts = [
  "nearside rear wheel",
  "offside tyre tread depth",
  "brake warning lamp dashboard",
  "fluid reservoir caps closed",
]

function daysUntil(date: string | null) {
  if (!date) return null
  return Math.round((new Date(date).getTime() - Date.now()) / 86400000)
}
function expiryBadge(date: string | null) {
  const d = daysUntil(date)
  if (d === null) return "bg-gray-100 text-gray-600"
  if (d <= 0)   return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
  if (d <= 30)  return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
  if (d <= 90)  return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
  return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
}
function expiryLabel(date: string | null) {
  const d = daysUntil(date)
  if (d === null) return "—"
  if (d < 0) return `${Math.abs(d)}d overdue`
  if (d === 0) return "Today"
  return `${d}d`
}

function KPI({ label, value, sub, color, icon: Icon }: { label:string; value:string|number; sub?:string; color:string; icon:React.ElementType }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  )
}

// ─── TAB 1 · WALKAROUND ──────────────────────────────────────────────────────

const recentChecks = [
  { id:"wk1", reg:"NUX9VAM", driver:"James O'Connor",  date:"2026-03-12", time:"06:14", elapsed:"8m 22s", defects:0, status:"clear"  },
  { id:"wk2", reg:"TB67KLM", driver:"Maria Santos",    date:"2026-03-12", time:"06:41", elapsed:"9m 05s", defects:1, status:"defect" },
  { id:"wk3", reg:"LK21DVA", driver:"Lena Fischer",    date:"2026-03-12", time:"07:02", elapsed:"7m 48s", defects:0, status:"clear"  },
  { id:"wk4", reg:"PN19RFX", driver:"Piotr Kowalski",  date:"2026-03-11", time:"06:23", elapsed:"10m 12s",defects:0, status:"clear"  },
  { id:"wk5", reg:"OU70TBN", driver:"Ahmed Hassan",    date:"2026-03-11", time:"06:55", elapsed:"4m 58s", defects:2, status:"defect" },
  { id:"wk6", reg:"YJ19HKP", driver:"Sophie Turner",   date:"2026-03-11", time:"07:18", elapsed:"8m 33s", defects:0, status:"clear"  },
]

function WalkaroundForm({ onBack }: { onBack: () => void }) {
  const [veh, setVeh]       = React.useState(vehicles[0].reg)
  const [states, setStates] = React.useState<Record<string,string>>({})
  const [signed, setSigned] = React.useState(false)
  const [sigName, setSigName] = React.useState("")
  const [submitted, setSubmitted] = React.useState(false)
  const [startTime]         = React.useState(Date.now())
  const [elapsed, setElapsed] = React.useState(0)
  const photoPrompt = photoPrompts[Math.floor(Math.random() * photoPrompts.length)]
  const now = new Date()

  React.useEffect(() => {
    const t = setInterval(() => setElapsed(Math.round((Date.now() - startTime) / 1000)), 1000)
    return () => clearInterval(t)
  }, [startTime])

  const total = walkaroundItems.flatMap(s => s.items).length
  const done  = Object.keys(states).length
  const fails = Object.values(states).filter(v => v === "fail").length

  function set(key: string, v: string) {
    setStates(p => ({ ...p, [key]: p[key] === v ? "" : v }))
  }

  if (submitted) return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <CheckCircle2 className="h-16 w-16 text-green-500" />
      <h2 className="text-2xl font-bold">Walkaround Submitted</h2>
      <p className="text-muted-foreground">Vehicle <strong>{veh}</strong> · {now.toLocaleDateString("en-GB")} {now.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</p>
      {fails > 0
        ? <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">⚠ {fails} defect{fails>1?"s":""} reported — Workshop alert sent · VOR flag raised</p>
        : <p className="rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm text-green-700">✓ Nil defect declaration — Vehicle cleared for use</p>
      }
      <p className="text-xs text-muted-foreground">Time taken: {Math.floor(elapsed/60)}m {elapsed%60}s · Signed by: {sigName}</p>
      <button onClick={onBack} className="mt-2 rounded-lg border px-4 py-2 text-sm hover:bg-muted">← Back to Checks List</button>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      {/* Back */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs hover:bg-muted">← Checks List</button>
        <span className="text-sm font-semibold">New Walkaround Check</span>
      </div>

      {/* Header */}
      <div className="grid gap-4 sm:grid-cols-3 rounded-xl border bg-card p-5 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Vehicle</label>
          <select value={veh} onChange={e => setVeh(e.target.value)} className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
            {vehicles.map(v => <option key={v.reg} value={v.reg}>{v.reg} – {v.make}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Driver</label>
          <select className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
            {drivers.map(d => <option key={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Timer / Location</label>
          <div className="flex h-9 items-center gap-2 rounded-lg border bg-muted/30 px-3 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{Math.floor(elapsed/60)}m {elapsed%60}s elapsed</span>
            <MapPin className="ml-auto h-3.5 w-3.5" />
          </div>
        </div>
      </div>

      {/* Anti-cheat */}
      <div className="flex items-start gap-3 rounded-xl border border-indigo-300 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950/20 p-4">
        <Camera className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">📸 Anti-Cheat Photo Required</p>
          <p className="mt-0.5 text-sm text-indigo-700 dark:text-indigo-400">Today you must photograph: <strong>{photoPrompt}</strong></p>
        </div>
        <button className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-medium text-white hover:bg-indigo-700">Take Photo</button>
      </div>

      {/* Progress */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-medium">{done} / {total} items checked</span>
          {elapsed < 120 && done > total * 0.5 && <span className="text-amber-600 font-medium">⚠ Check completed suspiciously fast – manager alert will fire</span>}
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width:`${(done/total)*100}%` }} />
        </div>
      </div>

      {/* Checklist */}
      {walkaroundItems.map(sec => (
        <div key={sec.section} className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="border-b bg-muted/40 px-4 py-2.5 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-sm">{sec.section}</span>
          </div>
          <div className="divide-y">
            {sec.items.map(item => {
              const key = `${sec.section}::${item}`
              const st  = states[key]
              return (
                <div key={item} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="text-sm">{item}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => set(key,"ok")}       className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${st==="ok"       ? "bg-green-500 text-white" : "border hover:bg-green-50 dark:hover:bg-green-950/20 text-muted-foreground"}`}>OK</button>
                    <button onClick={() => set(key,"advisory")} className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${st==="advisory"  ? "bg-amber-500 text-white" : "border hover:bg-amber-50 dark:hover:bg-amber-950/20 text-muted-foreground"}`}>Advisory</button>
                    <button onClick={() => set(key,"fail")}     className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${st==="fail"      ? "bg-red-500 text-white"   : "border hover:bg-red-50 dark:hover:bg-red-950/20 text-muted-foreground"}`}>Defect</button>
                    {st === "fail" && (
                      <div className="flex items-center gap-1">
                        <button className="flex items-center gap-1 rounded-lg border border-dashed border-red-400 px-2 py-1 text-[10px] text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"><Camera className="h-3 w-3" /> Photo</button>
                        <select className="h-7 rounded border text-[10px] bg-background px-1"><option>Advisory</option><option>Dangerous</option></select>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* E-Signature */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="mb-3 font-semibold flex items-center gap-2"><PenLine className="h-4 w-4 text-indigo-500" /> Nil-Defect Declaration & Signature</h3>
        <p className="mb-3 text-sm text-muted-foreground">I declare that I have carried out the required daily walkaround check on the vehicle identified above and it is, to the best of my knowledge, safe to drive on the road.</p>
        <div className="flex gap-2">
          <input value={sigName} onChange={e => setSigName(e.target.value)} placeholder="Type full name to sign" className="h-9 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <button onClick={() => setSigned(!!sigName)} disabled={!sigName} className={`h-9 rounded-lg px-4 text-sm font-medium transition-colors ${signed ? "bg-green-500 text-white" : "border bg-background hover:bg-muted disabled:opacity-40"}`}>
            {signed ? "✓ Signed" : "Sign"}
          </button>
        </div>
        {signed && <p className="mt-2 text-xs text-green-600">Signed by <strong>{sigName}</strong> · {now.toLocaleTimeString("en-GB")} · 52.7233°N 1.6916°W</p>}
      </div>

      <button disabled={!signed || done < total * 0.5} onClick={() => setSubmitted(true)}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
      ><ShieldCheck className="h-4 w-4" /> Submit Walkaround Check</button>
    </div>
  )
}

// historic detail data keyed by check id
const checkDetails: Record<string, {
  photo: string; location: string
  sections: { section: string; items: { name: string; result: "ok"|"advisory"|"fail"; note?:string }[] }[]
  signature: string
}> = {
  wk1: {
    photo: "nearside rear wheel", location: "52.7233°N 1.6916°W · Towers Business Park",
    sections: walkaroundItems.map(s => ({ section: s.section, items: s.items.map(i => ({ name:i, result:"ok" as "ok" })) })),
    signature: "James O'Connor",
  },
  wk2: {
    photo: "offside tyre tread depth", location: "52.7233°N 1.6916°W · Towers Business Park",
    sections: walkaroundItems.map((s,si) => ({ section: s.section, items: s.items.map((i,ii) => ({
      name: i,
      result: (si===0&&ii===2) ? "fail" as "fail" : "ok" as "ok",
      note:  (si===0&&ii===2) ? "DPF warning lamp illuminated on startup" : undefined,
    })) })),
    signature: "Maria Santos",
  },
  wk3: {
    photo: "brake warning lamp dashboard", location: "52.7233°N 1.6916°W · Towers Business Park",
    sections: walkaroundItems.map(s => ({ section: s.section, items: s.items.map(i => ({ name:i, result:"ok" as "ok" })) })),
    signature: "Lena Fischer",
  },
  wk4: {
    photo: "fluid reservoir caps closed", location: "52.7233°N 1.6916°W · Towers Business Park",
    sections: walkaroundItems.map((s,si) => ({ section: s.section, items: s.items.map((i,ii) => ({
      name: i,
      result: (si===1&&ii===0) ? "advisory" as "advisory" : "ok" as "ok",
    })) })),
    signature: "Piotr Kowalski",
  },
  wk5: {
    photo: "nearside rear wheel", location: "52.7233°N 1.6916°W · Towers Business Park",
    sections: walkaroundItems.map((s,si) => ({ section: s.section, items: s.items.map((i,ii) => ({
      name: i,
      result: (si===0&&ii===3) ? "fail" as "fail" : (si===2&&ii===0) ? "fail" as "fail" : "ok" as "ok",
      note:  (si===0&&ii===3) ? "Air leak noise from nearside rear axle group" :
             (si===2&&ii===0) ? "Brake pressure slow to build – 45s to reach working pressure" : undefined,
    })) })),
    signature: "Ahmed Hassan",
  },
  wk6: {
    photo: "offside tyre tread depth", location: "52.7233°N 1.6916°W · Towers Business Park",
    sections: walkaroundItems.map(s => ({ section: s.section, items: s.items.map(i => ({ name:i, result:"ok" as "ok" })) })),
    signature: "Sophie Turner",
  },
}

function WalkaroundDetail({ checkId, onBack }: { checkId: string; onBack: () => void }) {
  const check = recentChecks.find(c => c.id === checkId)!
  const detail = checkDetails[checkId]
  const totalItems = detail.sections.flatMap(s => s.items).length
  const okCount   = detail.sections.flatMap(s => s.items).filter(i => i.result === "ok").length
  const advCount  = detail.sections.flatMap(s => s.items).filter(i => i.result === "advisory").length
  const failCount = detail.sections.flatMap(s => s.items).filter(i => i.result === "fail").length

  const resultStyle = {
    ok:       "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    advisory: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    fail:     "bg-red-100   text-red-700   dark:bg-red-900/30   dark:text-red-400",
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top nav */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs hover:bg-muted">
          ← Checks List
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold font-mono">{check.reg} — Walkaround Check</p>
          <p className="text-xs text-muted-foreground">{check.date} · {check.time} · {check.driver}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${check.status === "clear" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
          {check.status === "clear" ? "✓ Nil Defect" : `⚠ ${check.defects} Defect${check.defects > 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Summary bar */}
      <div className="grid gap-4 sm:grid-cols-4 rounded-xl border bg-card p-4 shadow-sm">
        <div>
          <p className="text-xs text-muted-foreground">Duration</p>
          <p className="font-semibold">{check.elapsed}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Location</p>
          <p className="font-semibold text-xs truncate">{detail.location}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Anti-Cheat Photo</p>
          <p className="font-semibold text-xs capitalize">{detail.photo}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Results</p>
          <p className="text-xs">
            <span className="font-bold text-green-600">{okCount} OK</span>
            {advCount > 0 && <span className="ml-1 font-bold text-amber-600">{advCount} Advisory</span>}
            {failCount > 0 && <span className="ml-1 font-bold text-red-600">{failCount} Defect{failCount>1?"s":""}</span>}
            <span className="ml-1 text-muted-foreground">of {totalItems}</span>
          </p>
        </div>
      </div>

      {/* Defect callout */}
      {failCount > 0 && (
        <div className="rounded-xl border border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/20 p-4">
          <p className="mb-2 text-sm font-semibold text-red-800 dark:text-red-300 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Defects Reported — Workshop Notified · VOR Flag Raised
          </p>
          {detail.sections.flatMap(s => s.items).filter(i => i.result === "fail").map((item, idx) => (
            <div key={idx} className="mt-2 rounded-lg border border-red-200 dark:border-red-900 bg-white dark:bg-card p-3">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">{item.name}</p>
              {item.note && <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">{item.note}</p>}
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded border border-dashed border-red-400 px-2 py-0.5 text-[10px] text-red-600">
                  <Camera className="h-3 w-3" /> Photo captured
                </span>
                <span className="rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 text-[10px] font-bold">Dangerous</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Checklist sections */}
      {detail.sections.map(sec => (
        <div key={sec.section} className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="border-b bg-muted/40 px-4 py-2.5 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-sm">{sec.section}</span>
            <span className="ml-auto text-[10px] text-muted-foreground">
              {sec.items.filter(i=>i.result==="ok").length}/{sec.items.length} OK
            </span>
          </div>
          <div className="divide-y">
            {sec.items.map(item => (
              <div key={item.name} className="flex items-start justify-between gap-3 px-4 py-2.5">
                <div className="flex-1 min-w-0">
                  <span className="text-sm">{item.name}</span>
                  {item.note && <p className="mt-0.5 text-xs text-muted-foreground">{item.note}</p>}
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${resultStyle[item.result]}`}>
                  {item.result === "ok" ? "OK" : item.result}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Signature block */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="mb-3 font-semibold flex items-center gap-2"><PenLine className="h-4 w-4 text-indigo-500" /> Driver Declaration</h3>
        <p className="text-sm text-muted-foreground mb-3">I declare that I carried out the required daily walkaround check and the vehicle is, to the best of my knowledge, safe to drive on the road.</p>
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <div>
            <p className="text-sm font-semibold">{detail.signature}</p>
            <p className="text-xs text-muted-foreground">Signed {check.date} at {check.time} · {detail.location}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-background px-3 text-sm text-muted-foreground hover:bg-muted">
          <Download className="h-3.5 w-3.5" /> Download PDF
        </button>
        {failCount > 0 && (
          <button className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-red-500 px-3 text-sm font-medium text-white hover:bg-red-600">
            <Wrench className="h-3.5 w-3.5" /> View Workshop Defect
          </button>
        )}
      </div>
    </div>
  )
}

function WalkaroundTab() {
  const [view, setView] = React.useState<"list" | "form" | "detail">("list")
  const [selectedCheck, setSelectedCheck] = React.useState<string | null>(null)

  if (view === "form")   return <WalkaroundForm onBack={() => setView("list")} />
  if (view === "detail" && selectedCheck) return <WalkaroundDetail checkId={selectedCheck} onBack={() => setView("list")} />

  const todayChecked = recentChecks.filter(c => c.date === "2026-03-12").length
  const defectsToday = recentChecks.filter(c => c.date === "2026-03-12" && c.status === "defect").length

  return (
    <div className="flex flex-col gap-4">
      {/* Summary KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500">
            <CheckCircle2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold">{todayChecked}</p>
            <p className="text-xs text-muted-foreground">Checks completed today</p>
            <p className="text-[10px] text-muted-foreground">{vehicles.length - todayChecked} vehicles pending</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${defectsToday > 0 ? "bg-red-500" : "bg-green-500"}`}>
            <AlertTriangle className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold">{defectsToday}</p>
            <p className="text-xs text-muted-foreground">Defects reported today</p>
            <p className="text-[10px] text-muted-foreground">{defectsToday > 0 ? "Workshop notified" : "No defects"}</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500">
            <Clock className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold">8m 32s</p>
            <p className="text-xs text-muted-foreground">Avg. check time today</p>
            <p className="text-[10px] text-muted-foreground">DVSA minimum: 5 mins</p>
          </div>
        </div>
      </div>

      {/* List panel */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-sm">Recent Walkaround Checks</span>
          </div>
          <button onClick={() => setView("form")} className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-3.5 w-3.5" /> New Check
          </button>
        </div>
        <div className="divide-y">
          {recentChecks.map(c => (
            <button
              key={c.id}
              onClick={() => { setSelectedCheck(c.id); setView("detail") }}
              className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
            >
              <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${c.status === "clear" ? "bg-green-500" : "bg-red-500"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold font-mono text-sm">{c.reg}</span>
                  <span className="text-xs text-muted-foreground">{c.driver}</span>
                </div>
                <p className="text-xs text-muted-foreground">{c.date} · {c.time} · {c.elapsed}</p>
              </div>
              <div className="shrink-0">
                {c.defects > 0
                  ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400">{c.defects} defect{c.defects > 1 ? "s" : ""}</span>
                  : <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700 dark:bg-green-900/30 dark:text-green-400">Nil defect</span>
                }
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── TAB 2 · DRIVERS ─────────────────────────────────────────────────────────

function DriversTab() {
  const [sel, setSel] = React.useState(drivers[0].id)
  const driver = drivers.find(d => d.id === sel)!

  return (
    <div className="flex flex-col gap-6">
      {/* Summary KPIs */}
      <div className="grid gap-4 sm:grid-cols-4">
        <KPI label="High Risk Drivers"   value={drivers.filter(d=>d.risk==="high").length}            icon={AlertTriangle} color="bg-red-500"    sub="9+ points" />
        <KPI label="CPC Expiring <90d"   value={drivers.filter(d=>{ const x=daysUntil(d.cpcDeadline); return x!==null&&x<90}).length} icon={BookOpen} color="bg-amber-500" sub="action needed" />
        <KPI label="RTW Expiring <90d"   value={drivers.filter(d=>{ const x=daysUntil(d.rtw); return x!==null&&x<90}).length} icon={Flag} color="bg-red-500" sub="Home Office check" />
        <KPI label="Licence Checks Due"  value={2} icon={RefreshCw} color="bg-indigo-500" sub="this month" />
      </div>

      {/* Driver selector + detail */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* List */}
        <div className="flex flex-col gap-2">
          {drivers.map(d => (
            <button key={d.id} onClick={() => setSel(d.id)}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${sel===d.id ? "border-primary bg-primary/5" : "bg-card hover:bg-muted"}`}
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${d.risk==="high" ? "bg-red-500" : d.risk==="medium" ? "bg-amber-500" : "bg-green-500"}`}>
                {d.name.split(" ").map(n=>n[0]).join("")}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{d.name}</p>
                <p className="text-[10px] text-muted-foreground">{d.licence} · {d.points} pts · <span className={d.risk==="high"?"text-red-600":d.risk==="medium"?"text-amber-600":"text-green-600"}>{d.risk} risk</span></p>
              </div>
            </button>
          ))}
        </div>

        {/* Detail */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* DVLA Licence */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><Car className="h-4 w-4 text-indigo-500" /> DVLA Licence (ADD API)</h3>
              <button className="inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-xs hover:bg-muted"><RefreshCw className="h-3 w-3" /> Refresh</button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 text-sm">
              {[
                { l:"Name",       v:driver.name      },
                { l:"Category",   v:driver.licence   },
                { l:"Penalty Pts",v:`${driver.points} pts` },
                { l:"Expiry",     v:driver.expiry    },
                { l:"Check Freq", v:driver.risk==="high" ? "Monthly (9+ pts)" : "Bi-annual" },
                { l:"Last Checked", v:"2026-03-01"  },
              ].map(r => (
                <div key={r.l} className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">{r.l}</span>
                  <span className={`font-medium ${r.l==="Penalty Pts" && driver.points>=9 ? "text-red-600" : ""}`}>{r.v}</span>
                </div>
              ))}
            </div>
            {driver.risk === "high" && (
              <p className="mt-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 px-3 py-2 text-xs text-red-700 dark:text-red-400">
                ⚠ High-risk flag: 9 penalty points. Automatic monthly DVLA check scheduled. Manager notified.
              </p>
            )}
          </div>

          {/* RTW & Visa */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-4 font-semibold flex items-center gap-2"><Flag className="h-4 w-4 text-indigo-500" /> Right to Work & Visa</h3>
            {driver.rtw ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">RTW Status</span><span className="font-medium">Confirmed</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Visa Expiry</span>
                  <span className={`font-medium rounded-full px-2 text-xs ${expiryBadge(driver.visaExp)}`}>{driver.visaExp} ({expiryLabel(driver.visaExp)})</span>
                </div>
                <div className="flex justify-between"><span className="text-muted-foreground">Home Office Code</span><span className="font-mono text-xs text-muted-foreground">••••-••••-••••</span></div>
                <button className="inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-xs hover:bg-muted"><Upload className="h-3 w-3" /> Upload Passport Scan</button>
              </div>
            ) : <p className="text-sm text-muted-foreground">UK/EU citizen — RTW not required.</p>}
          </div>

          {/* CPC */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-4 font-semibold flex items-center gap-2"><BookOpen className="h-4 w-4 text-indigo-500" /> Driver CPC (35h / 5 years)</h3>
            <div className="flex items-end justify-between mb-2">
              <span className="text-2xl font-bold">{driver.cpcHours}<span className="text-sm font-normal text-muted-foreground"> / 35h</span></span>
              <span className={`text-xs rounded-full px-2 py-0.5 ${expiryBadge(driver.cpcDeadline)}`}>Deadline {driver.cpcDeadline} ({expiryLabel(driver.cpcDeadline)})</span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden mb-1">
              <div className={`h-full rounded-full transition-all ${driver.cpcHours>=35?"bg-green-500":driver.cpcHours>=20?"bg-amber-500":"bg-red-500"}`} style={{ width:`${Math.min(100,(driver.cpcHours/35)*100)}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">{35-driver.cpcHours}h remaining</p>
            <button className="mt-3 inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-xs hover:bg-muted"><Plus className="h-3 w-3" /> Log Course</button>
          </div>

          {/* Additional Training */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-4 font-semibold flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-indigo-500" /> Additional Training</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span>ADR (Dangerous Goods)</span>
                {driver.adr
                  ? <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${expiryBadge(driver.adrExp)}`}>Expires {driver.adrExp} ({expiryLabel(driver.adrExp)})</span>
                  : <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">Not held</span>}
              </div>
              {["Manual Handling","Moffett / Forklift","HIAB Operating"].map(t => (
                <div key={t} className="flex justify-between items-center">
                  <span>{t}</span><span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">Not held</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── TAB 3 · DOCUMENTS ───────────────────────────────────────────────────────

function DocumentsTab() {
  const [cat, setCat]       = React.useState("All")
  const [search, setSearch] = React.useState("")
  const cats = ["All","O-Licence","Vehicle","Trailer","Driver","Workshop","Insurance","Audit","H&S"]

  const filtered = documents.filter(d => {
    const matchCat = cat === "All" || d.cat === cat
    const matchQ   = !search || d.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchQ
  })

  const expiring30 = documents.filter(d => { const x = daysUntil(d.expiry); return x !== null && x <= 30 })
  const expiring90 = documents.filter(d => { const x = daysUntil(d.expiry); return x !== null && x > 30 && x <= 90 })
  const pending    = documents.filter(d => !d.signed)

  return (
    <div className="flex flex-col gap-6">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-4">
        <KPI label="Total Documents"     value={documents.length}  icon={FileText}      color="bg-indigo-500" sub={`across ${cats.length - 1} categories`} />
        <KPI label="Pending Signature"   value={pending.length}    icon={PenLine}       color="bg-amber-500"  sub="awaiting sign-off" />
        <KPI label="Expiring ≤30 Days"   value={expiring30.length} icon={AlertTriangle} color="bg-red-500"    sub="critical — act now" />
        <KPI label="Expiring 31–90 Days" value={expiring90.length} icon={CalendarDays}  color="bg-amber-500"  sub="book renewals" />
      </div>

      {/* Expiry alert banner */}
      {(expiring30.length > 0 || expiring90.length > 0) && (
        <div className="rounded-xl border border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/20 p-4">
          <p className="mb-2 text-sm font-semibold text-red-800 dark:text-red-300 flex items-center gap-2">
            <Lock className="h-4 w-4" /> Expiry Alerts
          </p>
          <div className="flex flex-col gap-1">
            {expiring30.map(d => (
              <p key={d.id} className="text-xs text-red-700 dark:text-red-400">
                🔴 {d.name} — expires {d.expiry} ({expiryLabel(d.expiry)})
              </p>
            ))}
            {expiring90.map(d => (
              <p key={d.id} className="text-xs text-amber-700 dark:text-amber-400">
                🟡 {d.name} — expires {d.expiry} ({expiryLabel(d.expiry)})
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Filter + search + upload */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {cats.map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${cat===c ? "bg-primary text-primary-foreground" : "border bg-background hover:bg-muted"}`}
            >{c}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents…"
            className="h-8 rounded-lg border bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-ring w-44" />
          <button className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            <Upload className="h-3.5 w-3.5" /> Upload
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/40">
            {["Document","Category","Expiry","Status","Actions"].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>)}
          </tr></thead>
          <tbody>
            {filtered.map(d => (
              <tr key={d.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 font-medium">{d.name}</td>
                <td className="px-4 py-3"><span className="rounded-full border px-2 py-0.5 text-[10px]">{d.cat}</span></td>
                <td className="px-4 py-3">
                  {d.expiry
                    ? <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${expiryBadge(d.expiry)}`}>{d.expiry} ({expiryLabel(d.expiry)})</span>
                    : <span className="text-muted-foreground text-xs">No expiry</span>}
                </td>
                <td className="px-4 py-3">
                  {d.signed
                    ? <span className="inline-flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="h-3.5 w-3.5" /> Signed</span>
                    : <span className="inline-flex items-center gap-1 text-xs text-amber-600"><Clock className="h-3.5 w-3.5" /> Pending</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button className="text-xs text-indigo-500 hover:underline">View</button>
                    <button className="text-xs text-muted-foreground hover:underline">Send for Signature</button>
                    <button className="text-xs text-muted-foreground hover:underline"><Download className="h-3 w-3 inline" /> PDF</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── TAB 4 · VEHICLE COMPLIANCE ──────────────────────────────────────────────

function VehicleComplianceTab() {
  return (
    <div className="flex flex-col gap-6">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-4">
        <KPI label="MOT Expiring ≤90d"   value={vehicles.filter(v=>{ const x=daysUntil(v.mot); return x!==null&&x<=90 }).length}  icon={Car}    color="bg-amber-500" />
        <KPI label="Tacho Cal ≤90d"      value={vehicles.filter(v=>{ const x=daysUntil(v.tacho); return x!==null&&x<=90 }).length} icon={Activity} color="bg-amber-500" />
        <KPI label="LOLER Due ≤90d"      value={vehicles.filter(v=>{ const x=daysUntil(v.loler); return x!==null&&x<=90 }).length} icon={Truck}  color="bg-red-500" />
        <KPI label="Fully Clear"         value={vehicles.filter(v=>{ const m=daysUntil(v.mot)??999; const t=daysUntil(v.tacho)??999; return m>90&&t>90; }).length} icon={CheckCircle2} color="bg-green-500" />
      </div>

      {/* Planner Board */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-3">
          <CalendarDays className="h-4 w-4 text-indigo-500" />
          <h3 className="font-semibold">Preventative Maintenance Planner Board</h3>
          <span className="ml-auto text-xs text-muted-foreground">Combine checks to minimise downtime →</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[700px]">
            <thead><tr className="border-b bg-muted/20">
              {["Vehicle","MOT","Tachograph Cal","LOLER / PUWER","Combined Window","Action"].map(h => <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody>
              {vehicles.map(v => {
                const dates = [v.mot, v.tacho, v.loler].filter(Boolean) as string[]
                const nearest = dates.sort()[0]
                return (
                  <tr key={v.reg} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-3 py-2.5"><p className="font-mono font-bold">{v.reg}</p><p className="text-muted-foreground">{v.make}</p></td>
                    <td className="px-3 py-2.5"><span className={`rounded-full px-2 py-0.5 font-medium ${expiryBadge(v.mot)}`}>{v.mot} ({expiryLabel(v.mot)})</span></td>
                    <td className="px-3 py-2.5"><span className={`rounded-full px-2 py-0.5 font-medium ${expiryBadge(v.tacho)}`}>{v.tacho} ({expiryLabel(v.tacho)})</span></td>
                    <td className="px-3 py-2.5">
                      {v.loler
                        ? <><span className={`rounded-full px-2 py-0.5 font-medium ${expiryBadge(v.loler)}`}>{v.loler} ({expiryLabel(v.loler)})</span><p className="mt-0.5 text-muted-foreground">{v.lolerType}</p></>
                        : <span className="text-muted-foreground">N/A</span>}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-indigo-600">{nearest ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      <button className="inline-flex h-7 items-center gap-1 rounded-lg bg-primary px-2 text-[10px] font-medium text-primary-foreground hover:bg-primary/90">Book In</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── TAB 5 · OVERVIEW ────────────────────────────────────────────────────────

const olicenceLimit = 8
const activeVehicles = vehicles.length

const infringements = [
  { driver:"Maria Santos",   date:"2026-03-10", type:"Rest Break Violation",     hours:"4h 32m (max 4h 30m)", severity:"Minor"  },
  { driver:"Ahmed Hassan",   date:"2026-03-08", type:"Daily Driving Exceeded",   hours:"10h 12m (max 10h)",   severity:"Serious"},
  { driver:"James O'Connor", date:"2026-03-05", type:"WTD – Weekly Hours",       hours:"52h (max 48h)",       severity:"Minor"  },
]

const incidents = [
  { id:"i1", date:"2026-03-11", driver:"Maria Santos",  reg:"TB67KLM", type:"Minor Collision", status:"FNOL Sent", desc:"Reversed into bollard in depot. No third party injuries." },
]

function OverviewTab() {
  const [incidentOpen, setIncidentOpen] = React.useState(false)
  const oLicenceOk = activeVehicles <= olicenceLimit
  const forsPct = Math.round(([
    oLicenceOk, true, drivers.filter(d=>d.risk!=="high").length===drivers.length, true
  ].filter(Boolean).length / 4) * 100)

  return (
    <div className="flex flex-col gap-6">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI label="O-Licence Margin"     value={`${activeVehicles}/${olicenceLimit}`} icon={ShieldCheck} color={oLicenceOk?"bg-green-500":"bg-red-500"} sub={oLicenceOk?"Within limit":"BREACH – action required"} />
        <KPI label="Tacho Infringements"  value={infringements.length}                 icon={AlertCircle} color="bg-amber-500"  sub="last 30 days" />
        <KPI label="Open Incidents"       value={incidents.length}                     icon={AlertTriangle} color="bg-red-500" sub="FNOL pending" />
        <KPI label="FORS/ER Readiness"    value={`${forsPct}%`}                        icon={BadgeCheck}   color="bg-indigo-500" sub="audit-ready score" />
      </div>

      {/* O-Licence */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-indigo-500" /> O-Licence Margin Checker</h3>
          <span className={`rounded-full px-3 py-1 text-sm font-bold ${oLicenceOk ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{oLicenceOk ? "✓ Compliant" : "✗ Breach"}</span>
        </div>
        <div className="h-3 rounded-full bg-muted overflow-hidden mb-2">
          <div className={`h-full rounded-full ${activeVehicles/olicenceLimit>0.9?"bg-amber-500":"bg-green-500"}`} style={{ width:`${Math.min(100,(activeVehicles/olicenceLimit)*100)}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">{activeVehicles} active / {olicenceLimit} authorised · {olicenceLimit-activeVehicles} spare slot{olicenceLimit-activeVehicles!==1?"s":""}</p>
      </div>

      {/* Tachograph / WTD Infringements */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-3">
          <Activity className="h-4 w-4 text-indigo-500" />
          <h3 className="font-semibold">Tachograph & WTD Infringements</h3>
          <span className="ml-auto text-xs text-muted-foreground">Integrated via TruTac / Descartes API</span>
        </div>
        <div className="divide-y">
          {infringements.map((inf, i) => (
            <div key={i} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium">{inf.type}</p>
                <p className="text-xs text-muted-foreground">{inf.driver} · {inf.date} · {inf.hours}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${inf.severity==="Serious" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{inf.severity}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Accident FNOL */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-4 py-3">
          <h3 className="font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" /> Accident & Incident Log (FNOL)</h3>
          <button onClick={() => setIncidentOpen(true)} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-red-500 px-3 text-xs font-medium text-white hover:bg-red-600"><Plus className="h-3.5 w-3.5" /> Report Accident</button>
        </div>
        <div className="divide-y">
          {incidents.map(inc => (
            <div key={inc.id} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{inc.type} · <span className="font-mono text-xs">{inc.reg}</span></p>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">{inc.status}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{inc.driver} · {inc.date}</p>
              <p className="mt-1 text-xs">{inc.desc}</p>
              <button className="mt-2 inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-xs hover:bg-muted"><Download className="h-3 w-3" /> Download FNOL Report</button>
            </div>
          ))}
        </div>
      </div>

      {/* FORS / Earned Recognition dashboard */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-indigo-500" /> FORS / DVSA Earned Recognition Report</h3>
          <button className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-indigo-500 px-3 text-xs font-medium text-white hover:bg-indigo-600"><Download className="h-3.5 w-3.5" /> Generate Report</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label:"Licence Compliance",    pct:100, target:100 },
            { label:"PMI On-Time Rate",       pct:83,  target:100 },
            { label:"Walkaround Completion",  pct:96,  target:100 },
            { label:"Zero Serious Infringements", pct:67, target:100 },
          ].map(k => (
            <div key={k.label} className="rounded-lg border bg-muted/20 p-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium">{k.label}</span>
                <span className={k.pct>=k.target?"text-green-600":"k.pct>=90?text-amber-600:text-red-600"}>{k.pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full ${k.pct>=k.target?"bg-green-500":k.pct>=80?"bg-amber-500":"bg-red-500"}`} style={{ width:`${k.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FNOL modal-ish call to action */}
      {incidentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl">
            <h3 className="mb-4 text-lg font-bold flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-500" /> Report Accident (FNOL)</h3>
            <div className="flex flex-col gap-3">
              {["Vehicle reg","Third-party reg (if applicable)","Location / postcode","Brief description"].map(f => (
                <div key={f}><label className="mb-1 block text-xs font-medium text-muted-foreground">{f}</label><input className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
              ))}
              <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-dashed border-indigo-400 px-3 text-sm text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"><Camera className="h-4 w-4" /> Attach Scene Photos</button>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setIncidentOpen(false)} className="flex-1 h-9 rounded-lg border text-sm hover:bg-muted">Cancel</button>
              <button onClick={() => setIncidentOpen(false)} className="flex-1 h-9 rounded-lg bg-red-500 text-sm font-medium text-white hover:bg-red-600">Submit FNOL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── PAGE SHELL ───────────────────────────────────────────────────────────────

const TABS = [
  { id:"walkaround", label:"Walkaround",    icon:CheckCircle2  },
  { id:"drivers",    label:"Drivers",       icon:Users         },
  { id:"documents",  label:"Documents",     icon:FileText      },
  { id:"vehicles",   label:"Veh. Checks",   icon:Truck         },
  { id:"overview",   label:"Overview",      icon:BarChart3     },
] as const

export default function CompliancePage() {
  const [tab, setTab] = React.useState<typeof TABS[number]["id"]>("walkaround")
  const alerts = 3

  return (
    <div className="flex flex-1 flex-col gap-4 p-6 md:p-8 lg:p-10">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Compliance Hub</h1>
          <p className="mt-1 text-sm text-muted-foreground">DVSA · FORS · Earned Recognition · O-Licence management</p>
        </div>
        {alerts > 0 && (
          <div className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
            <Bell className="h-4 w-4" /> {alerts} compliance alerts
          </div>
        )}
      </div>

      <div className="flex gap-1 rounded-xl border bg-muted/30 p-1 w-full">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors ${tab===t.id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <t.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === "walkaround" && <WalkaroundTab />}
      {tab === "drivers"    && <DriversTab />}
      {tab === "documents"  && <DocumentsTab />}
      {tab === "vehicles"   && <VehicleComplianceTab />}
      {tab === "overview"   && <OverviewTab />}
    </div>
  )
}
