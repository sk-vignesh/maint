"use client"
import { PageHeader } from "@/components/page-header"
import * as React from "react"
import { Search, Plus, RefreshCw, Download, MapPin } from "lucide-react"
import { useLang } from "@/components/lang-context"

const parkingRecords = [
  { id:"PK-2026-031", date:"2026-03-12", reg:"NUX9VAM", driver:"James O'Connor",  location:"Towers Business Park, Rugeley",    postcode:"WS15 1LX", duration:"10h 30m", cost:0.00,  type:"Depot",     status:"approved", notes:"Overnight trailer drop" },
  { id:"PK-2026-030", date:"2026-03-11", reg:"TB67KLM", driver:"Maria Santos",    location:"Dartford Services Lorry Park",      postcode:"DA1 5TL",  duration:"8h 00m",  cost:30.00, type:"Services",  status:"approved", notes:"Mandatory rest stop" },
  { id:"PK-2026-029", date:"2026-03-11", reg:"PN19RFX", driver:"Piotr Kowalski",  location:"Trowell Services, Nottingham",      postcode:"NG9 3PL",  duration:"9h 15m",  cost:25.00, type:"Services",  status:"approved", notes:"" },
  { id:"PK-2026-028", date:"2026-03-10", reg:"LK21DVA", driver:"Lena Fischer",     location:"Sheffield Business Park MSCP",      postcode:"S9 1GR",   duration:"4h 00m",  cost:12.00, type:"Car Park",  status:"pending",  notes:"Delivery bay unavailable" },
  { id:"PK-2026-027", date:"2026-03-10", reg:"OU70TBN", driver:"Ahmed Hassan",     location:"Swindon Designer Outlet Lorry Park",postcode:"SN2 2DY",  duration:"6h 45m",  cost:18.00, type:"Services",  status:"rejected", notes:"Unauthorised location" },
  { id:"PK-2026-026", date:"2026-03-09", reg:"YJ19HKP", driver:"Sophie Turner",    location:"Knutsford Services",               postcode:"WA16 0TL", duration:"11h 00m", cost:30.00, type:"Services",  status:"approved", notes:"Overnight rest" },
  { id:"PK-2026-025", date:"2026-03-08", reg:"NUX9VAM", driver:"James O'Connor",  location:"Towers Business Park, Rugeley",    postcode:"WS15 1LX", duration:"12h 00m", cost:0.00,  type:"Depot",     status:"approved", notes:"" },
  { id:"PK-2026-024", date:"2026-03-07", reg:"LK21DVA", driver:"Lena Fischer",     location:"Leeds RDC, LS9 0PS",               postcode:"LS9 0PS",  duration:"2h 30m",  cost:0.00,  type:"Customer",  status:"approved", notes:"Loading/unloading" },
]

const typeColor: Record<string,string> = {
  Depot:    "bg-indigo-100 text-indigo-700",
  Services: "bg-blue-100 text-blue-700",
  "Car Park":"bg-gray-100 text-foreground",
  Customer: "bg-green-100 text-green-700",
}
const statusStyle: Record<string,string> = {
  approved: "bg-green-100 text-green-700",
  pending:  "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-700",
}

export default function ParkingPage() {
  const { t } = useLang()
  const c = t.common
  const [search, setSearch] = React.useState("")
  const [filter, setFilter] = React.useState("all")
  const filtered = parkingRecords.filter(r => {
    const q=search.toLowerCase()
    return (!q||r.reg.toLowerCase().includes(q)||r.driver.toLowerCase().includes(q)||r.location.toLowerCase().includes(q)) && (filter==="all"||r.status===filter)
  })
  const totalCost = filtered.reduce((a,r)=>a+r.cost,0)

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8 lg:p-10">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div><PageHeader pageKey="parkingMonitoring" /><p className="mt-1 text-sm text-muted-foreground">{t.pages.parkingMonitoring.subtitle}</p></div>
        <div className="flex gap-2">
          <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-background px-3 text-sm text-muted-foreground hover:bg-muted"><Download className="h-3.5 w-3.5" /> {c.export}</button>
          <button className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Plus className="h-3.5 w-3.5" /> {c.addNew}</button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label:"Total Cost (shown)",   value:`£${totalCost.toFixed(2)}` },
          { label:"Free Depot Nights",    value:parkingRecords.filter(r=>r.cost===0).length },
          { label:"Pending Approval",     value:parkingRecords.filter(r=>r.status==="pending").length },
          { label:"Rejected Locations",   value:parkingRecords.filter(r=>r.status==="rejected").length },
        ].map(k=>(
          <div key={k.label} className="rounded-xl border bg-card p-4 shadow-sm"><p className="text-2xl font-bold">{k.value}</p><p className="mt-0.5 text-xs text-muted-foreground">{k.label}</p></div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={c.searchPlaceholder} className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
        {(["all","approved","pending","rejected"] as const).map(f=>{const labels:Record<string,string>={all:c.all,approved:c.approve,pending:c.pending,rejected:c.reject};return <button key={f} onClick={()=>setFilter(f)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filter===f?"bg-primary text-primary-foreground":"border bg-background hover:bg-muted"}`}>{labels[f]}</button>})}
        <button onClick={()=>{setSearch("");setFilter("all")}} className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-background text-muted-foreground hover:bg-muted"><RefreshCw className="h-3.5 w-3.5" /></button>
      </div>

      <div className="overflow-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/40">{[c.ref,c.date,c.vehicle,c.driver,c.location,c.duration,c.cost,c.type,c.status,c.action].map(h=><th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map(r=>(
              <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{r.id}</td>
                <td className="px-4 py-2.5 text-xs">{r.date}</td>
                <td className="px-4 py-2.5 font-mono font-bold">{r.reg}</td>
                <td className="px-4 py-2.5">{r.driver}</td>
                <td className="px-4 py-2.5 max-w-[200px]">
                  <div className="flex items-start gap-1"><MapPin className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" /><div><p className="truncate">{r.location}</p><p className="text-[10px] font-mono text-muted-foreground">{r.postcode}</p></div></div>
                </td>
                <td className="px-4 py-2.5">{r.duration}</td>
                <td className="px-4 py-2.5 font-bold">{r.cost===0?"Free":`£${r.cost.toFixed(2)}`}</td>
                <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${typeColor[r.type]||"bg-gray-100 text-foreground"}`}>{r.type}</span></td>
                <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${statusStyle[r.status]}`}>{r.status}</span></td>
                <td className="px-4 py-2.5">{r.status==="pending"&&<div className="flex gap-2"><button className="text-[10px] text-green-600 hover:underline">{c.approve}</button><button className="text-[10px] text-red-500 hover:underline">{c.reject}</button></div>}{r.status!=="pending"&&<button className="text-xs text-indigo-500 hover:underline">{c.view}</button>}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="border-t bg-muted/20"><td colSpan={10} className="px-4 py-2 text-xs text-muted-foreground">{filtered.length} {c.records} · {c.totalCost}: £{totalCost.toFixed(2)}</td></tr></tfoot>
        </table>
      </div>
    </div>
  )
}
