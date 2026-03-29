"use client"
import { PageHeader } from "@/components/page-header"
import * as React from "react"
import { Search, Upload, Download, CheckCircle2, Clock, AlertTriangle, RefreshCw } from "lucide-react"
import { useLang } from "@/components/lang-context"

const receipts = [
  { id:"FR-2026-088", date:"2026-03-12", reg:"NUX9VAM", driver:"James O'Connor",   station:"Shell – Rugeley",      litres:320, gross:486.40, vat:81.07, net:405.33, status:"approved" },
  { id:"FR-2026-087", date:"2026-03-12", reg:"TB67KLM", driver:"Maria Santos",     station:"BP – Dartford",        litres:285, gross:433.20, vat:72.20, net:361.00, status:"pending"  },
  { id:"FR-2026-086", date:"2026-03-11", reg:"PN19RFX", driver:"Piotr Kowalski",   station:"Esso – M1 J28",        litres:410, gross:619.10, vat:103.18,net:515.92, status:"approved" },
  { id:"FR-2026-085", date:"2026-03-11", reg:"LK21DVA", driver:"Lena Fischer",      station:"Certas – Sheffield",   litres:298, gross:449.98, vat:74.99, net:374.99, status:"approved" },
  { id:"FR-2026-084", date:"2026-03-10", reg:"OU70TBN", driver:"Ahmed Hassan",      station:"Texaco – Swindon",     litres:187, gross:286.11, vat:47.68, net:238.43, status:"rejected" },
  { id:"FR-2026-083", date:"2026-03-10", reg:"YJ19HKP", driver:"Sophie Turner",     station:"BP – Trafford Park",   litres:345, gross:527.85, vat:87.97, net:439.88, status:"approved" },
  { id:"FR-2026-082", date:"2026-03-09", reg:"NUX9VAM", driver:"James O'Connor",   station:"Shell – Rugeley",      litres:302, gross:453.00, vat:75.50, net:377.50, status:"pending"  },
  { id:"FR-2026-081", date:"2026-03-08", reg:"LK21DVA", driver:"Lena Fischer",      station:"Certas – Sheffield",   litres:315, gross:469.35, vat:78.23, net:391.13, status:"approved" },
]

const statusStyle: Record<string,string> = {
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  pending:  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
}
const statusIcon = { approved: CheckCircle2, pending: Clock, rejected: AlertTriangle }

export default function FuelReceiptsPage() {
  const { t } = useLang()
  const c = t.common
  const [search, setSearch] = React.useState("")
  const [filter, setFilter] = React.useState("all")
  const filtered = receipts.filter(r => {
    const q = search.toLowerCase()
    const matchQ = !q || r.reg.toLowerCase().includes(q) || r.driver.toLowerCase().includes(q) || r.station.toLowerCase().includes(q)
    return matchQ && (filter==="all" || r.status===filter)
  })
  const totalVAT = filtered.reduce((a,r)=>a+r.vat,0)
  const totalGross = filtered.reduce((a,r)=>a+r.gross,0)

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8 lg:p-10">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div><PageHeader pageKey="fuelReceipts" /><p className="mt-1 text-sm text-muted-foreground">{t.pages.fuelReceipts.subtitle}</p></div>
        <div className="flex gap-2">
          <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-background px-3 text-sm text-muted-foreground hover:bg-muted"><Download className="h-3.5 w-3.5" /> {c.export}</button>
          <button className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Upload className="h-3.5 w-3.5" /> {c.upload}</button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label:"Total Gross",    value:`£${totalGross.toFixed(2)}`,  color:"indigo" },
          { label:"VAT Reclaimable",value:`£${totalVAT.toFixed(2)}`,    color:"green"  },
          { label:"Pending Approval",value:receipts.filter(r=>r.status==="pending").length, color:"amber" },
          { label:"Rejected",       value:receipts.filter(r=>r.status==="rejected").length, color:"red"   },
        ].map(k=>(
          <div key={k.label} className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-2xl font-bold">{k.value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={c.searchPlaceholder} className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="flex gap-1.5">
          {(["all","approved","pending","rejected"] as const).map(f=>{
            const labels: Record<string,string>={all:c.all,approved:c.approve,pending:c.pending,rejected:c.reject}
            return <button key={f} onClick={()=>setFilter(f)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filter===f?"bg-primary text-primary-foreground":"border bg-background hover:bg-muted"}`}>{labels[f]}</button>
          })}
        </div>
        <button onClick={()=>setSearch("")} className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-background text-muted-foreground hover:bg-muted"><RefreshCw className="h-3.5 w-3.5" /></button>
      </div>

      <div className="overflow-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/40">{[c.ref,c.date,c.vehicle,c.driver,"Station",c.litres,"Gross","VAT","Net",c.status,c.action].map(h=><th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map(r=>{
              const Icon = statusIcon[r.status as keyof typeof statusIcon]
              return (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-2.5 font-mono text-xs font-bold text-indigo-600">{r.id}</td>
                  <td className="px-4 py-2.5 text-xs">{r.date}</td>
                  <td className="px-4 py-2.5 font-mono font-bold">{r.reg}</td>
                  <td className="px-4 py-2.5">{r.driver}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{r.station}</td>
                  <td className="px-4 py-2.5">{r.litres}L</td>
                  <td className="px-4 py-2.5 font-semibold">£{r.gross.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-green-600">£{r.vat.toFixed(2)}</td>
                  <td className="px-4 py-2.5">£{r.net.toFixed(2)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${statusStyle[r.status]}`}>
                      <Icon className="h-3 w-3" />{r.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {r.status==="pending" && <div className="flex gap-1"><button className="text-[10px] text-green-600 hover:underline">{c.approve}</button><button className="text-[10px] text-red-500 hover:underline">{c.reject}</button></div>}
                    {r.status!=="pending" && <button className="text-xs text-indigo-500 hover:underline">{c.view}</button>}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot><tr className="border-t bg-muted/20"><td colSpan={11} className="px-4 py-2 text-xs text-muted-foreground">{filtered.length} receipts · Total gross £{totalGross.toFixed(2)} · VAT reclaimable £{totalVAT.toFixed(2)}</td></tr></tfoot>
        </table>
      </div>
    </div>
  )
}
