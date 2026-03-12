"use client"
import * as React from "react"
import { Search, Plus, RefreshCw, Download, Moon } from "lucide-react"

const offShiftRecords = [
  { id:"OS-001", driver:"James O'Connor",   date:"2026-03-12", shiftEnd:"17:30", restStart:"17:30", nextShift:"2026-03-13 06:00", restHours:12.5, reg:"NUX9VAM", status:"compliant"     },
  { id:"OS-002", driver:"Maria Santos",     date:"2026-03-11", shiftEnd:"22:15", restStart:"22:30", nextShift:"2026-03-12 07:00", restHours:8.5,  reg:"TB67KLM", status:"violation"     },
  { id:"OS-003", driver:"Piotr Kowalski",   date:"2026-03-11", shiftEnd:"18:00", restStart:"18:00", nextShift:"2026-03-12 08:00", restHours:14.0, reg:"PN19RFX", status:"compliant"     },
  { id:"OS-004", driver:"Lena Fischer",      date:"2026-03-10", shiftEnd:"20:00", restStart:"20:10", nextShift:"2026-03-11 08:00", restHours:11.8, reg:"LK21DVA", status:"compliant"     },
  { id:"OS-005", driver:"Ahmed Hassan",      date:"2026-03-10", shiftEnd:"19:45", restStart:"20:00", nextShift:"2026-03-11 05:30", restHours:9.5,  reg:"OU70TBN", status:"borderline"    },
  { id:"OS-006", driver:"Sophie Turner",     date:"2026-03-09", shiftEnd:"21:00", restStart:"21:00", nextShift:"2026-03-10 09:00", restHours:12.0, reg:"YJ19HKP", status:"compliant"     },
  { id:"OS-007", driver:"James O'Connor",   date:"2026-03-09", shiftEnd:"16:30", restStart:"16:30", nextShift:"2026-03-10 07:00", restHours:14.5, reg:"NUX9VAM", status:"compliant"     },
  { id:"OS-008", driver:"Ahmed Hassan",      date:"2026-03-08", shiftEnd:"23:00", restStart:"23:15", nextShift:"2026-03-09 07:00", restHours:7.75, reg:"OU70TBN", status:"violation"     },
  { id:"OS-009", driver:"Maria Santos",     date:"2026-03-07", shiftEnd:"19:00", restStart:"19:00", nextShift:"2026-03-08 07:30", restHours:12.5, reg:"TB67KLM", status:"compliant"     },
  { id:"OS-010", driver:"Lena Fischer",      date:"2026-03-06", shiftEnd:"17:00", restStart:"17:00", nextShift:"2026-03-07 08:00", restHours:15.0, reg:"LK21DVA", status:"compliant"     },
]

const statusStyle: Record<string,string> = {
  compliant:   "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  borderline:  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  violation:   "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
}

export default function OffShiftPage() {
  const [search, setSearch] = React.useState("")
  const filtered = offShiftRecords.filter(r => { const q=search.toLowerCase(); return !q||r.driver.toLowerCase().includes(q)||r.reg.toLowerCase().includes(q) })

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8 lg:p-10">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight md:text-3xl">Off-Shift & Rest Periods</h1><p className="mt-1 text-sm text-muted-foreground">Monitor driver rest compliance against EU WTD rules (min 11h daily rest).</p></div>
        <div className="flex gap-2">
          <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-background px-3 text-sm text-muted-foreground hover:bg-muted"><Download className="h-3.5 w-3.5" /> Export</button>
          <button className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Plus className="h-3.5 w-3.5" /> Log Shift</button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label:"Rest Violations (30d)", value:offShiftRecords.filter(r=>r.status==="violation").length,  color:"text-red-600"   },
          { label:"Borderline Cases",      value:offShiftRecords.filter(r=>r.status==="borderline").length, color:"text-amber-600" },
          { label:"Compliant Records",     value:offShiftRecords.filter(r=>r.status==="compliant").length,  color:"text-green-600" },
          { label:"Avg Rest (shown)",      value:`${(filtered.reduce((a,r)=>a+r.restHours,0)/Math.max(1,filtered.length)).toFixed(1)}h`, color:"" },
        ].map(k=>(
          <div key={k.label} className="rounded-xl border bg-card p-4 shadow-sm"><p className={`text-2xl font-bold ${k.color}`}>{k.value}</p><p className="mt-0.5 text-xs text-muted-foreground">{k.label}</p></div>
        ))}
      </div>

      {offShiftRecords.filter(r=>r.status==="violation").length>0 && (
        <div className="rounded-xl border border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/20 p-3 text-sm text-red-700 dark:text-red-400">
          ⚠ {offShiftRecords.filter(r=>r.status==="violation").length} rest period violation{offShiftRecords.filter(r=>r.status==="violation").length>1?"s":""} detected — EU regulations require a minimum of 11 hours daily rest. Transport Manager notified.
        </div>
      )}

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by driver or vehicle…" className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <button onClick={()=>setSearch("")} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-background text-muted-foreground hover:bg-muted"><RefreshCw className="h-3.5 w-3.5" /></button>
      </div>

      <div className="overflow-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/40">{["Ref","Date","Driver","Vehicle","Shift End","Rest Start","Next Shift","Rest Hours","Status"].map(h=><th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map(r=>(
              <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{r.id}</td>
                <td className="px-4 py-2.5">{r.date}</td>
                <td className="px-4 py-2.5 font-medium">{r.driver}</td>
                <td className="px-4 py-2.5 font-mono font-bold">{r.reg}</td>
                <td className="px-4 py-2.5">{r.shiftEnd}</td>
                <td className="px-4 py-2.5">{r.restStart}</td>
                <td className="px-4 py-2.5 text-xs">{r.nextShift}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Moon className={`h-3.5 w-3.5 ${r.restHours<11?"text-red-500":r.restHours<12?"text-amber-500":"text-indigo-400"}`} />
                    <span className={`font-bold ${r.restHours<11?"text-red-600":r.restHours<12?"text-amber-600":"text-foreground"}`}>{r.restHours}h</span>
                  </div>
                </td>
                <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${statusStyle[r.status]}`}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="border-t bg-muted/20"><td colSpan={9} className="px-4 py-2 text-xs text-muted-foreground">{filtered.length} records · Minimum legal rest: 11h</td></tr></tfoot>
        </table>
      </div>
    </div>
  )
}
