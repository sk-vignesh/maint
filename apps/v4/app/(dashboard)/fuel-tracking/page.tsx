"use client"
import { PageHeader } from "@/components/page-header"
import * as React from "react"
import { Search, Download, RefreshCw, Fuel, TrendingDown, TrendingUp, BarChart3 } from "lucide-react"
import { useLang } from "@/components/lang-context"

const records = [
  { id:"FT001", date:"2026-03-12", reg:"NUX9VAM", driver:"James O'Connor",   litres:320, costPerLitre:1.52, odometer:187450, mpg:8.4, depot:"Rugeley"  },
  { id:"FT002", date:"2026-03-12", reg:"TB67KLM", driver:"Maria Santos",     litres:285, costPerLitre:1.52, odometer:203210, mpg:7.9, depot:"Dartford" },
  { id:"FT003", date:"2026-03-11", reg:"PN19RFX", driver:"Piotr Kowalski",   litres:410, costPerLitre:1.51, odometer:95660,  mpg:9.1, depot:"Rugeley"  },
  { id:"FT004", date:"2026-03-11", reg:"LK21DVA", driver:"Lena Fischer",      litres:298, costPerLitre:1.51, odometer:142030, mpg:8.7, depot:"Sheffield"},
  { id:"FT005", date:"2026-03-10", reg:"OU70TBN", driver:"Ahmed Hassan",      litres:187, costPerLitre:1.53, odometer:76880,  mpg:6.8, depot:"Swindon"  },
  { id:"FT006", date:"2026-03-10", reg:"YJ19HKP", driver:"Sophie Turner",     litres:345, costPerLitre:1.53, odometer:229110, mpg:8.2, depot:"Manchester"},
  { id:"FT007", date:"2026-03-09", reg:"NUX9VAM", driver:"James O'Connor",   litres:302, costPerLitre:1.50, odometer:187100, mpg:8.5, depot:"Rugeley"  },
  { id:"FT008", date:"2026-03-09", reg:"TB67KLM", driver:"Maria Santos",     litres:270, costPerLitre:1.50, odometer:202890, mpg:7.7, depot:"Dartford" },
  { id:"FT009", date:"2026-03-08", reg:"LK21DVA", driver:"Lena Fischer",      litres:315, costPerLitre:1.49, odometer:141680, mpg:8.9, depot:"Sheffield"},
  { id:"FT010", date:"2026-03-07", reg:"PN19RFX", driver:"Piotr Kowalski",   litres:388, costPerLitre:1.49, odometer:95210,  mpg:9.0, depot:"Rugeley"  },
  { id:"FT011", date:"2026-03-06", reg:"OU70TBN", driver:"Ahmed Hassan",      litres:195, costPerLitre:1.48, odometer:76640,  mpg:6.9, depot:"Swindon"  },
  { id:"FT012", date:"2026-03-05", reg:"YJ19HKP", driver:"Sophie Turner",     litres:360, costPerLitre:1.48, odometer:228720, mpg:8.3, depot:"Manchester"},
]

function KPI({ label, value, sub, icon: Icon, color }: { label:string;value:string;sub?:string;icon:React.ElementType;color:string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}><Icon className="h-5 w-5 text-white" /></div>
      <div><p className="text-2xl font-bold leading-none">{value}</p><p className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</p>{sub&&<p className="text-[10px] text-muted-foreground">{sub}</p>}</div>
    </div>
  )
}

export default function FuelTrackingPage() {
  const { t } = useLang()
  const c = t.common
  const [search, setSearch] = React.useState("")
  const totalLitres = records.reduce((a,r)=>a+r.litres,0)
  const totalCost   = records.reduce((a,r)=>a+r.litres*r.costPerLitre,0)
  const avgMpg      = (records.reduce((a,r)=>a+r.mpg,0)/records.length).toFixed(1)
  const filtered = records.filter(r => { const q=search.toLowerCase(); return !q||r.reg.toLowerCase().includes(q)||r.driver.toLowerCase().includes(q)||r.depot.toLowerCase().includes(q) })

  // per-vehicle summary for chart
  const byVehicle = [...new Set(records.map(r=>r.reg))].map(reg => {
    const rows = records.filter(r=>r.reg===reg)
    return { reg, litres: rows.reduce((a,r)=>a+r.litres,0), avgMpg: (rows.reduce((a,r)=>a+r.mpg,0)/rows.length).toFixed(1) }
  })
  const maxLitres = Math.max(...byVehicle.map(v=>v.litres))

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8 lg:p-10">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader pageKey="fuelTracking" />
        <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-background px-3 text-sm text-muted-foreground hover:bg-muted"><Download className="h-3.5 w-3.5" /> {c.export}</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI label={`${c.litres} (30d)`}       value={`${totalLitres.toLocaleString()}L`}              icon={Fuel}        color="bg-indigo-500" />
        <KPI label={`${c.totalCost} (30d)`}    value={`£${totalCost.toLocaleString("en-GB",{maximumFractionDigits:0})}`} icon={TrendingUp} color="bg-red-500" />
        <KPI label={`${c.mpg}`}                value={avgMpg}                                           icon={BarChart3}   color="bg-green-500" />
        <KPI label={c.costPerLitre}             value="£1.51"                                            icon={TrendingDown} color="bg-amber-500" />
      </div>

      {/* Per-vehicle bar chart */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="mb-4 font-semibold">{c.consumptionByVehicle}</h3>
        <div className="flex flex-col gap-3">
          {byVehicle.map(v=>(
            <div key={v.reg}>
              <div className="flex justify-between text-xs mb-1"><span className="font-mono font-bold">{v.reg}</span><span className="text-muted-foreground">{v.litres}L · {v.avgMpg} {c.mpg}</span></div>
              <div className="h-3 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-indigo-500" style={{width:`${(v.litres/maxLitres)*100}%`}} /></div>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={c.searchVehicles} className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <button onClick={()=>setSearch("")} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-background text-muted-foreground hover:bg-muted"><RefreshCw className="h-3.5 w-3.5" /></button>
      </div>

      <div className="overflow-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/40">{[c.date,c.ref,c.vehicle,c.driver,c.litres,c.costPerLitre,c.totalCost,c.odometer,c.mpg,c.depot].map(h=><th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map(r=>(
              <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-2.5">{r.date}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{r.id}</td>
                <td className="px-4 py-2.5 font-mono font-bold">{r.reg}</td>
                <td className="px-4 py-2.5">{r.driver}</td>
                <td className="px-4 py-2.5 font-bold">{r.litres}L</td>
                <td className="px-4 py-2.5">£{r.costPerLitre.toFixed(2)}</td>
                <td className="px-4 py-2.5 font-semibold text-red-600">£{(r.litres*r.costPerLitre).toFixed(2)}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{r.odometer.toLocaleString()}</td>
                <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.mpg>=9?"bg-green-100 text-green-700":r.mpg>=8?"bg-amber-100 text-amber-700":"bg-red-100 text-red-700"}`}>{r.mpg}</span></td>
                <td className="px-4 py-2.5 text-muted-foreground">{r.depot}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="border-t bg-muted/20"><td colSpan={10} className="px-4 py-2 text-xs text-muted-foreground">{filtered.length} {c.records} · {c.litres}: {filtered.reduce((a,r)=>a+r.litres,0)}L · £{filtered.reduce((a,r)=>a+r.litres*r.costPerLitre,0).toFixed(2)}</td></tr></tfoot>
        </table>
      </div>
    </div>
  )
}
