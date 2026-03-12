"use client"
import * as React from "react"
import { Search, Plus, CheckCircle2, Clock, XCircle, RefreshCw, Download } from "lucide-react"

const holidays = [
  { id:"HOL-001", driver:"James O'Connor",   type:"Annual Leave",   start:"2026-04-07", end:"2026-04-11", days:5, status:"approved", requested:"2026-02-14", notes:"Easter holiday" },
  { id:"HOL-002", driver:"Maria Santos",     type:"Annual Leave",   start:"2026-04-14", end:"2026-04-17", days:4, status:"pending",  requested:"2026-03-01", notes:"" },
  { id:"HOL-003", driver:"Piotr Kowalski",   type:"Annual Leave",   start:"2026-05-25", end:"2026-05-29", days:5, status:"approved", requested:"2026-01-20", notes:"Bank holiday weekend" },
  { id:"HOL-004", driver:"Lena Fischer",      type:"Sick Leave",     start:"2026-03-10", end:"2026-03-12", days:3, status:"approved", requested:"2026-03-10", notes:"Fit note supplied" },
  { id:"HOL-005", driver:"Ahmed Hassan",      type:"Unpaid Leave",   start:"2026-06-01", end:"2026-06-05", days:5, status:"pending",  requested:"2026-03-05", notes:"Family bereavement" },
  { id:"HOL-006", driver:"Sophie Turner",     type:"Annual Leave",   start:"2026-07-28", end:"2026-08-08", days:10,status:"approved", requested:"2026-02-01", notes:"Summer holiday" },
  { id:"HOL-007", driver:"James O'Connor",   type:"Annual Leave",   start:"2026-08-24", end:"2026-08-28", days:5, status:"pending",  requested:"2026-03-10", notes:"" },
  { id:"HOL-008", driver:"Lena Fischer",      type:"Annual Leave",   start:"2026-12-22", end:"2026-12-31", days:8, status:"approved", requested:"2026-02-28", notes:"Christmas period" },
  { id:"HOL-009", driver:"Piotr Kowalski",   type:"Training",       start:"2026-03-18", end:"2026-03-19", days:2, status:"approved", requested:"2026-03-01", notes:"CPC refresher course" },
  { id:"HOL-010", driver:"Maria Santos",     type:"Sick Leave",     start:"2026-03-03", end:"2026-03-07", days:5, status:"approved", requested:"2026-03-03", notes:"Medical certificate provided" },
]

const drivers = ["All","James O'Connor","Maria Santos","Piotr Kowalski","Lena Fischer","Ahmed Hassan","Sophie Turner"]
const types    = ["All","Annual Leave","Sick Leave","Unpaid Leave","Training"]

const statusIcon = { approved: CheckCircle2, pending: Clock, rejected: XCircle }
const statusStyle: Record<string,string> = {
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  pending:  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
}

export default function HolidaysPage() {
  const [search,   setSearch]  = React.useState("")
  const [driver,   setDriver]  = React.useState("All")
  const [type,     setType]    = React.useState("All")
  const [status,   setStatus]  = React.useState("all")

  const filtered = holidays.filter(h => {
    const q = search.toLowerCase()
    const matchQ = !q || h.driver.toLowerCase().includes(q) || h.type.toLowerCase().includes(q)
    return matchQ && (driver==="All"||h.driver===driver) && (type==="All"||h.type===type) && (status==="all"||h.status===status)
  })

  // entitlement summary (25 days each)
  const driverSummary = drivers.slice(1).map(d => {
    const taken = holidays.filter(h=>h.driver===d && h.type==="Annual Leave" && h.status==="approved").reduce((a,h)=>a+h.days,0)
    return { d, taken, remaining: 25-taken }
  })

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8 lg:p-10">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight md:text-3xl">Holidays & Leave</h1><p className="mt-1 text-sm text-muted-foreground">Manage driver annual leave, sick days, and training absences.</p></div>
        <div className="flex gap-2">
          <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-background px-3 text-sm text-muted-foreground hover:bg-muted"><Download className="h-3.5 w-3.5" /> Export</button>
          <button className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Plus className="h-3.5 w-3.5" /> Request Leave</button>
        </div>
      </div>

      {/* Entitlement summary */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {driverSummary.map(s=>(
          <div key={s.d} className="rounded-xl border bg-card p-3 shadow-sm">
            <p className="text-xs font-semibold truncate">{s.d.split(" ")[0]}</p>
            <p className="mt-1 text-lg font-bold">{s.taken}<span className="text-xs font-normal text-muted-foreground">/25</span></p>
            <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${s.remaining<5?"bg-red-500":s.remaining<10?"bg-amber-500":"bg-green-500"}`} style={{width:`${(s.taken/25)*100}%`}} /></div>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{s.remaining} days left</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" className="h-9 w-48 rounded-lg border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
        <select value={driver} onChange={e=>setDriver(e.target.value)} className="h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">{drivers.map(d=><option key={d}>{d}</option>)}</select>
        <select value={type}   onChange={e=>setType(e.target.value)}   className="h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">{types.map(t=><option key={t}>{t}</option>)}</select>
        {["all","approved","pending","rejected"].map(f=><button key={f} onClick={()=>setStatus(f)} className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${status===f?"bg-primary text-primary-foreground":"border bg-background hover:bg-muted"}`}>{f}</button>)}
        <button onClick={()=>{setSearch("");setDriver("All");setType("All");setStatus("all")}} className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-background text-muted-foreground hover:bg-muted"><RefreshCw className="h-3.5 w-3.5" /></button>
      </div>

      <div className="overflow-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/40">{["Ref","Driver","Type","Start","End","Days","Requested","Notes","Status","Action"].map(h=><th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map(h=>{
              const Icon = statusIcon[h.status as keyof typeof statusIcon]
              return (
                <tr key={h.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{h.id}</td>
                  <td className="px-4 py-2.5 font-medium">{h.driver}</td>
                  <td className="px-4 py-2.5"><span className="rounded-full border px-2 py-0.5 text-[10px]">{h.type}</span></td>
                  <td className="px-4 py-2.5">{h.start}</td>
                  <td className="px-4 py-2.5">{h.end}</td>
                  <td className="px-4 py-2.5 font-bold">{h.days}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{h.requested}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[180px]"><span className="truncate block">{h.notes||"—"}</span></td>
                  <td className="px-4 py-2.5"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${statusStyle[h.status]}`}><Icon className="h-3 w-3" />{h.status}</span></td>
                  <td className="px-4 py-2.5">{h.status==="pending"&&<div className="flex gap-2"><button className="text-[10px] text-green-600 hover:underline">Approve</button><button className="text-[10px] text-red-500 hover:underline">Decline</button></div>}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot><tr className="border-t bg-muted/20"><td colSpan={10} className="px-4 py-2 text-xs text-muted-foreground">{filtered.length} requests · {filtered.filter(h=>h.status==="pending").length} pending approval</td></tr></tfoot>
        </table>
      </div>
    </div>
  )
}
