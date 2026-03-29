"use client"
import { PageHeader } from "@/components/page-header"
import * as React from "react"
import { Search, Download, Plus, RefreshCw } from "lucide-react"
import { useLang } from "@/components/lang-context"

const tollExpenses = [
  { id:"TE-2026-041", date:"2026-03-12", reg:"NUX9VAM", driver:"James O'Connor",  route:"M6 Toll – Junction 11–3A",         amount:11.00, type:"Motorway",  method:"OBU",  status:"reconciled" },
  { id:"TE-2026-040", date:"2026-03-11", reg:"TB67KLM", driver:"Maria Santos",    route:"Dartford Crossing (ANPR)",          amount:6.00,  type:"Bridge",   method:"ANPR", status:"reconciled" },
  { id:"TE-2026-039", date:"2026-03-11", reg:"PN19RFX", driver:"Piotr Kowalski",  route:"M6 Toll – Junction 11–3A",         amount:11.00, type:"Motorway",  method:"OBU",  status:"pending"    },
  { id:"TE-2026-038", date:"2026-03-10", reg:"LK21DVA", driver:"Lena Fischer",     route:"Humber Bridge",                    amount:3.00,  type:"Bridge",   method:"Cash", status:"pending"    },
  { id:"TE-2026-037", date:"2026-03-10", reg:"OU70TBN", driver:"Ahmed Hassan",     route:"A19 Tyne Tunnel",                  amount:4.60,  type:"Tunnel",   method:"ANPR", status:"reconciled" },
  { id:"TE-2026-036", date:"2026-03-09", reg:"YJ19HKP", driver:"Sophie Turner",    route:"M6 Toll – Junction 7–3A",          amount:11.00, type:"Motorway",  method:"OBU",  status:"reconciled" },
  { id:"TE-2026-035", date:"2026-03-08", reg:"NUX9VAM", driver:"James O'Connor",  route:"Dartford Crossing (ANPR)",          amount:6.00,  type:"Bridge",   method:"ANPR", status:"reconciled" },
  { id:"TE-2026-034", date:"2026-03-07", reg:"LK21DVA", driver:"Lena Fischer",     route:"Mersey Gateway Bridge",            amount:4.50,  type:"Bridge",   method:"OBU",  status:"reconciled" },
  { id:"TE-2026-033", date:"2026-03-06", reg:"PN19RFX", driver:"Piotr Kowalski",  route:"M6 Toll – Junction 11–3A",         amount:11.00, type:"Motorway",  method:"OBU",  status:"pending"    },
  { id:"TE-2026-032", date:"2026-03-05", reg:"TB67KLM", driver:"Maria Santos",    route:"A14 Cambridge Northern Bypass",    amount:5.80,  type:"Motorway",  method:"ANPR", status:"reconciled" },
]

const typeColor: Record<string,string> = {
  Motorway: "bg-blue-100 text-blue-700",
  Bridge:   "bg-indigo-100 text-indigo-700",
  Tunnel:   "bg-purple-100 text-purple-700",
}

export default function TollExpensesPage() {
  const { t } = useLang()
  const c = t.common
  const [search, setSearch] = React.useState("")
  const [filter, setFilter] = React.useState("all")
  const filtered = tollExpenses.filter(r => {
    const q = search.toLowerCase()
    return (!q || r.reg.toLowerCase().includes(q)||r.driver.toLowerCase().includes(q)||r.route.toLowerCase().includes(q)) && (filter==="all"||r.status===filter)
  })
  const total = filtered.reduce((a,r)=>a+r.amount,0)

  const filterLabels: Record<string,string> = { all: c.all, reconciled: c.reconciled, pending: c.pending }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8 lg:p-10">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div><PageHeader pageKey="tollExpenses" /><p className="mt-1 text-sm text-muted-foreground">{t.pages.tollExpenses.subtitle}</p></div>
        <div className="flex gap-2">
          <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-background px-3 text-sm text-muted-foreground hover:bg-muted"><Download className="h-3.5 w-3.5" /> {c.export}</button>
          <button className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Plus className="h-3.5 w-3.5" /> {c.newCharge}</button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label:`${c.totalCost}`,      value:`£${total.toFixed(2)}`                                },
          { label:c.thisMonth,           value:`£${tollExpenses.reduce((a,r)=>a+r.amount,0).toFixed(2)}` },
          { label:c.pending,             value:tollExpenses.filter(r=>r.status==="pending").length   },
          { label:"OBU",                 value:tollExpenses.filter(r=>r.method==="OBU").length        },
        ].map(k=>(
          <div key={k.label} className="rounded-xl border bg-card p-4 shadow-sm"><p className="text-2xl font-bold">{k.value}</p><p className="mt-0.5 text-xs text-muted-foreground">{k.label}</p></div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={c.searchVehicles} className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
        {["all","reconciled","pending"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filter===f?"bg-primary text-primary-foreground":"border bg-background hover:bg-muted"}`}>{filterLabels[f] ?? f}</button>
        ))}
        <button onClick={()=>setSearch("")} className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-background text-muted-foreground hover:bg-muted"><RefreshCw className="h-3.5 w-3.5" /></button>
      </div>

      <div className="overflow-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/40">{[c.ref,c.date,c.vehicle,c.driver,c.route,c.type,c.amount,c.method,c.status,c.action].map(h=><th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map(r=>(
              <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-2.5 font-mono text-xs font-bold text-indigo-600">{r.id}</td>
                <td className="px-4 py-2.5 text-xs">{r.date}</td>
                <td className="px-4 py-2.5 font-mono font-bold">{r.reg}</td>
                <td className="px-4 py-2.5">{r.driver}</td>
                <td className="px-4 py-2.5 text-muted-foreground max-w-[200px]"><span className="truncate block">{r.route}</span></td>
                <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${typeColor[r.type]||"bg-gray-100 text-foreground"}`}>{r.type}</span></td>
                <td className="px-4 py-2.5 font-bold">£{r.amount.toFixed(2)}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.method}</td>
                <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.status==="reconciled"?"bg-green-100 text-green-700":"bg-amber-100 text-amber-700"}`}>{r.status==="reconciled"?c.reconciled:c.pending}</span></td>
                <td className="px-4 py-2.5"><button className="text-xs text-indigo-500 hover:underline">{r.status==="pending"?c.reconcile:c.view}</button></td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="border-t bg-muted/20"><td colSpan={10} className="px-4 py-2 text-xs text-muted-foreground">{filtered.length} {c.records} · £{total.toFixed(2)}</td></tr></tfoot>
        </table>
      </div>
    </div>
  )
}
