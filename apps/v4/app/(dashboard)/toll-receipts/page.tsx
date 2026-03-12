"use client"
import * as React from "react"
import { Search, Upload, Download, FileText, CheckCircle2, Clock, RefreshCw } from "lucide-react"

const tollReceipts = [
  { id:"TR-2026-041", date:"2026-03-12", reg:"NUX9VAM", driver:"James O'Connor",  issuer:"M6 Toll",             amount:11.00, vat:1.83, image:"uploaded",  status:"approved" },
  { id:"TR-2026-040", date:"2026-03-11", reg:"TB67KLM", driver:"Maria Santos",    issuer:"Dart Charge Ltd",     amount:6.00,  vat:1.00, image:"uploaded",  status:"approved" },
  { id:"TR-2026-039", date:"2026-03-11", reg:"PN19RFX", driver:"Piotr Kowalski",  issuer:"M6 Toll",             amount:11.00, vat:1.83, image:"missing",   status:"pending"  },
  { id:"TR-2026-038", date:"2026-03-10", reg:"LK21DVA", driver:"Lena Fischer",     issuer:"Humber Bridge Board", amount:3.00,  vat:0.50, image:"uploaded",  status:"pending"  },
  { id:"TR-2026-037", date:"2026-03-10", reg:"OU70TBN", driver:"Ahmed Hassan",     issuer:"Tyne Tunnel 2013",   amount:4.60,  vat:0.77, image:"uploaded",  status:"approved" },
  { id:"TR-2026-036", date:"2026-03-09", reg:"YJ19HKP", driver:"Sophie Turner",    issuer:"M6 Toll",             amount:11.00, vat:1.83, image:"uploaded",  status:"approved" },
  { id:"TR-2026-035", date:"2026-03-08", reg:"NUX9VAM", driver:"James O'Connor",  issuer:"Dart Charge Ltd",     amount:6.00,  vat:1.00, image:"missing",   status:"pending"  },
  { id:"TR-2026-034", date:"2026-03-07", reg:"LK21DVA", driver:"Lena Fischer",     issuer:"Mersey Gateway",      amount:4.50,  vat:0.75, image:"uploaded",  status:"approved" },
]

export default function TollReceiptsPage() {
  const [search, setSearch] = React.useState("")
  const filtered = tollReceipts.filter(r => { const q=search.toLowerCase(); return !q||r.reg.toLowerCase().includes(q)||r.driver.toLowerCase().includes(q)||r.issuer.toLowerCase().includes(q) })
  const totalVAT = filtered.reduce((a,r)=>a+r.vat,0)

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8 lg:p-10">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight md:text-3xl">Toll Receipts</h1><p className="mt-1 text-sm text-muted-foreground">VAT receipt capture for toll road charges across the fleet.</p></div>
        <div className="flex gap-2">
          <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-background px-3 text-sm text-muted-foreground hover:bg-muted"><Download className="h-3.5 w-3.5" /> Export</button>
          <button className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Upload className="h-3.5 w-3.5" /> Upload Receipt</button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label:"Total Receipts",     value:tollReceipts.length },
          { label:"VAT Reclaimable",    value:`£${tollReceipts.reduce((a,r)=>a+r.vat,0).toFixed(2)}` },
          { label:"Missing Images",     value:tollReceipts.filter(r=>r.image==="missing").length },
          { label:"Pending Approval",   value:tollReceipts.filter(r=>r.status==="pending").length },
        ].map(k=>(
          <div key={k.label} className="rounded-xl border bg-card p-4 shadow-sm"><p className="text-2xl font-bold">{k.value}</p><p className="mt-0.5 text-xs text-muted-foreground">{k.label}</p></div>
        ))}
      </div>

      {tollReceipts.filter(r=>r.image==="missing").length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20 p-3 text-sm text-amber-700 dark:text-amber-400">
          ⚠ {tollReceipts.filter(r=>r.image==="missing").length} receipt(s) have no image attached — VAT cannot be reclaimed without a valid receipt.
        </div>
      )}

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by reg, driver, issuer…" className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <button onClick={()=>setSearch("")} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-background text-muted-foreground hover:bg-muted"><RefreshCw className="h-3.5 w-3.5" /></button>
      </div>

      <div className="overflow-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/40">{["Ref","Date","Vehicle","Driver","Issuer","Amount","VAT","Receipt Image","Status","Action"].map(h=><th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map(r=>(
              <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-2.5 font-mono text-xs font-bold text-indigo-600">{r.id}</td>
                <td className="px-4 py-2.5 text-xs">{r.date}</td>
                <td className="px-4 py-2.5 font-mono font-bold">{r.reg}</td>
                <td className="px-4 py-2.5">{r.driver}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{r.issuer}</td>
                <td className="px-4 py-2.5 font-bold">£{r.amount.toFixed(2)}</td>
                <td className="px-4 py-2.5 text-green-600">£{r.vat.toFixed(2)}</td>
                <td className="px-4 py-2.5">
                  {r.image==="uploaded"
                    ? <span className="inline-flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="h-3.5 w-3.5" /><FileText className="h-3.5 w-3.5" /> Uploaded</span>
                    : <button className="inline-flex items-center gap-1 rounded-lg border border-dashed border-amber-400 px-2 py-0.5 text-[10px] text-amber-600 hover:bg-amber-50"><Upload className="h-3 w-3" /> Upload</button>}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${r.status==="approved"?"bg-green-100 text-green-700":"bg-amber-100 text-amber-700"}`}>
                    {r.status==="approved"?<CheckCircle2 className="h-3 w-3" />:<Clock className="h-3 w-3" />}{r.status}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  {r.status==="pending"&&<button className="text-xs text-green-600 hover:underline">Approve</button>}
                  {r.status==="approved"&&<button className="text-xs text-indigo-500 hover:underline">View</button>}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="border-t bg-muted/20"><td colSpan={10} className="px-4 py-2 text-xs text-muted-foreground">{filtered.length} receipts · VAT shown: £{totalVAT.toFixed(2)}</td></tr></tfoot>
        </table>
      </div>
    </div>
  )
}
