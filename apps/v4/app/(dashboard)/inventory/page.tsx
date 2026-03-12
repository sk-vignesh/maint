"use client"
import * as React from "react"
import {
  Package, AlertTriangle, CheckCircle2, Clock, Plus, Download,
  Search, RefreshCw, BarChart3, Layers, ShoppingCart, Droplets,
  CircleDot, Wrench, ScanLine, ChevronRight, ArrowUp, ArrowDown,
  AlertCircle, DollarSign, Truck,
} from "lucide-react"

// ─── DATA ─────────────────────────────────────────────────────────────────────

type Part = {
  id: string; sku: string; oemRef: string; aftermarketRef: string
  name: string; category: string; location: string; qty: number
  min: number; max: number; unitCost: number; supplier: string
  leadDays: number; lastUsed: string; critical: boolean; coreCharge?: number
  onOrder?: number; expectedDelivery?: string
}

const parts: Part[] = [
  { id:"p01", sku:"FLT-OIL-001", oemRef:"20532237",    aftermarketRef:"LF3349",     name:"Engine Oil Filter – Volvo FH",          category:"Filters",      location:"A1-S2-B3", qty:14, min:6,  max:24, unitCost:12.50,  supplier:"Euro Parts Ltd",       leadDays:1,  lastUsed:"2026-03-11", critical:true                             },
  { id:"p02", sku:"FLT-FUEL-002",oemRef:"22481942",    aftermarketRef:"FF5421",     name:"Fuel Filter – DAF XF 480",              category:"Filters",      location:"A1-S2-B4", qty:3,  min:4,  max:16, unitCost:18.75,  supplier:"Euro Parts Ltd",       leadDays:1,  lastUsed:"2026-03-05", critical:true,  onOrder:8, expectedDelivery:"2026-03-14" },
  { id:"p03", sku:"BRK-PAD-001", oemRef:"81508206053", aftermarketRef:"TRW GDB1423",name:"Brake Pads – MAN TGX (Axle Set)",       category:"Brakes",       location:"B2-S1-B1", qty:2,  min:4,  max:8,  unitCost:94.00,  supplier:"Meritor Direct",       leadDays:3,  lastUsed:"2026-02-28", critical:true,  coreCharge:15                         },
  { id:"p04", sku:"BRK-CAL-001", oemRef:"K001535",     aftermarketRef:"Haldex K001",name:"Brake Caliper – Nearside Front",         category:"Brakes",       location:"B2-S2-B2", qty:1,  min:2,  max:4,  unitCost:285.00, supplier:"Meritor Direct",       leadDays:2,  lastUsed:"2026-02-15", critical:true,  coreCharge:80                         },
  { id:"p05", sku:"ENG-OIL-BULK",oemRef:"BULK-1000L",  aftermarketRef:"",           name:"Engine Oil 10W-40 (IBC Tank)",          category:"Bulk Fluids",  location:"TANK-01",  qty:680,min:200,max:1000,unitCost:1.85,  supplier:"Fuchs Lubricants",     leadDays:5,  lastUsed:"2026-03-12", critical:false                            },
  { id:"p06", sku:"FLD-ADBLUE",  oemRef:"BULK-ADBLUE", aftermarketRef:"",           name:"AdBlue (IBC Tank)",                     category:"Bulk Fluids",  location:"TANK-02",  qty:420,min:100,max:1000,unitCost:0.38,  supplier:"Prax Group",           leadDays:3,  lastUsed:"2026-03-12", critical:false                            },
  { id:"p07", sku:"TYRE-295-001",oemRef:"",            aftermarketRef:"",           name:"Tyre 295/80R22.5 – Michelin X Line",    category:"Tyres",        location:"TYRE-RACK",qty:8,  min:4,  max:16, unitCost:395.00, supplier:"ATS Euromaster",       leadDays:2,  lastUsed:"2026-03-08", critical:false                            },
  { id:"p08", sku:"SUSP-AIRBAG", oemRef:"4111900",     aftermarketRef:"ContiTech",  name:"Air Spring Bag – Rear Axle",            category:"Suspension",   location:"C3-S1-B2", qty:4,  min:2,  max:8,  unitCost:142.00, supplier:"Euro Parts Ltd",       leadDays:4,  lastUsed:"2026-01-20", critical:true                             },
  { id:"p09", sku:"ELEC-FUSE-KIT",oemRef:"",          aftermarketRef:"",           name:"Fuse Assortment Kit",                   category:"Electrical",   location:"A3-S4-B1", qty:22, min:5,  max:30, unitCost:4.20,   supplier:"Toolstation",          leadDays:1,  lastUsed:"2026-03-01", critical:false                            },
  { id:"p10", sku:"STR-PUMP-001", oemRef:"7485107832", aftermarketRef:"ZF 8001849", name:"Power Steering Pump – Scania R",        category:"Steering",     location:"C2-S2-B3", qty:0,  min:1,  max:2,  unitCost:420.00, supplier:"Scania Parts Direct",  leadDays:5,  lastUsed:"2026-02-10", critical:true,  onOrder:1, expectedDelivery:"2026-03-15" },
  { id:"p11", sku:"COOL-THERM-01",oemRef:"22237802",  aftermarketRef:"TS13904",    name:"Thermostat – Volvo D13",                 category:"Cooling",      location:"A2-S3-B2", qty:3,  min:2,  max:6,  unitCost:38.50,  supplier:"Euro Parts Ltd",       leadDays:2,  lastUsed:"2025-10-15", critical:false                            },
  { id:"p12", sku:"TOOL-TORQUE-1",oemRef:"",          aftermarketRef:"",           name:"Torque Wrench 500Nm (Norbar)",          category:"Tools",        location:"TOOL-CAB",  qty:3,  min:2,  max:4,  unitCost:280.00, supplier:"Norbar Tools",         leadDays:7,  lastUsed:"2026-03-10", critical:false                            },
]

type PO = {
  id: string; date: string; supplier: string; partSku: string
  partName: string; qty: number; unitCost: number; status: string; expectedDelivery: string
}

const purchaseOrders: PO[] = [
  { id:"PO-2026-041", date:"2026-03-11", supplier:"Euro Parts Ltd",      partSku:"FLT-FUEL-002", partName:"Fuel Filter – DAF XF",        qty:8,  unitCost:18.75, status:"In Transit",  expectedDelivery:"2026-03-14" },
  { id:"PO-2026-042", date:"2026-03-10", supplier:"Scania Parts Direct", partSku:"STR-PUMP-001", partName:"Power Steering Pump – Scania", qty:1,  unitCost:420.00, status:"Processing", expectedDelivery:"2026-03-15" },
  { id:"PO-2026-038", date:"2026-03-01", supplier:"Meritor Direct",      partSku:"BRK-PAD-001", partName:"Brake Pads – MAN",             qty:4,  unitCost:94.00, status:"Delivered",   expectedDelivery:"2026-03-04" },
]

type Tyre = {
  serial: string; reg: string; position: string; brand: string
  size: string; fitted: string; tread: number; status: string
}

const tyres: Tyre[] = [
  { serial:"MX9221-A",reg:"NUX9VAM",position:"OS Front",   brand:"Michelin",tread:8.2,fitted:"2025-06-01",size:"295/80R22.5",status:"ok"       },
  { serial:"MX9221-B",reg:"NUX9VAM",position:"NS Front",   brand:"Michelin",tread:7.9,fitted:"2025-06-01",size:"295/80R22.5",status:"ok"       },
  { serial:"BR4401-A",reg:"TB67KLM",position:"OS Rear (i)",brand:"Bridgestone",tread:3.1,fitted:"2024-11-15",size:"295/80R22.5",status:"advisory"},
  { serial:"BR4401-B",reg:"TB67KLM",position:"OS Rear (o)",brand:"Bridgestone",tread:2.8,fitted:"2024-11-15",size:"295/80R22.5",status:"replace" },
  { serial:"CN7712-A",reg:"PN19RFX",position:"OS Front",   brand:"Continental",tread:9.1,fitted:"2025-09-20",size:"315/70R22.5",status:"ok"     },
  { serial:"CN7712-B",reg:"LK21DVA",position:"NS Rear (i)",brand:"Continental",tread:5.5,fitted:"2025-07-14",size:"295/80R22.5",status:"ok"     },
]

const jobCards = [
  { id:"JC-2026-031", reg:"TB67KLM", date:"2026-03-12", mechanic:"Gareth Williams", parts:[
      { sku:"FLT-OIL-001", name:"Engine Oil Filter", qty:1, serial:null    },
      { sku:"ENG-OIL-BULK", name:"Engine Oil 10W-40", qty:32, serial:null  },
      { sku:"BRK-PAD-001", name:"Brake Pads", qty:1, serial:"BP-2024-LOT-7"},
  ]},
  { id:"JC-2026-028", reg:"NUX9VAM", date:"2026-03-11", mechanic:"Sandra Okafor", parts:[
      { sku:"FLT-FUEL-002",name:"Fuel Filter", qty:1, serial:null },
  ]},
]

function qty2Status(p: Part) {
  if (p.qty === 0) return "stockout"
  if (p.qty <= p.min) return "low"
  return "ok"
}

function KPI({ label, value, sub, color, icon: Icon }: { label:string;value:string|number;sub?:string;color:string;icon:React.ElementType }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}><Icon className="h-5 w-5 text-white" /></div>
      <div><p className="text-2xl font-bold leading-none">{value}</p><p className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</p>{sub&&<p className="text-[10px] text-muted-foreground">{sub}</p>}</div>
    </div>
  )
}

// ─── TAB 1 · DASHBOARD ────────────────────────────────────────────────────────

function DashboardTab() {
  const totalValue     = parts.reduce((a,p) => a + p.qty * p.unitCost, 0)
  const deadStock      = parts.filter(p => { const d = new Date(p.lastUsed); return (Date.now()-d.getTime())>365*86400000 }).length
  const stockoutVOR    = parts.filter(p => p.qty===0 && p.critical).length
  const lowStock       = parts.filter(p => p.qty>0 && p.qty<=p.min).length
  const pendingCores   = parts.filter(p => p.coreCharge && p.coreCharge>0).length

  const topCategories = [...new Set(parts.map(p=>p.category))].map(cat => {
    const catParts = parts.filter(p=>p.category===cat)
    return { cat, value: catParts.reduce((a,p)=>a+p.qty*p.unitCost,0), count: catParts.length }
  }).sort((a,b)=>b.value-a.value).slice(0,5)

  const maxVal = topCategories[0]?.value ?? 1

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI label="Total Stock Value"       value={`£${totalValue.toLocaleString("en-GB",{minimumFractionDigits:0,maximumFractionDigits:0})}`} icon={DollarSign}      color="bg-indigo-500" sub="current on-shelf valuation" />
        <KPI label="Stockout VOR Risk"       value={stockoutVOR}   icon={AlertTriangle}  color="bg-red-500"    sub="critical parts at zero" />
        <KPI label="Low Stock Parts"         value={lowStock}      icon={AlertCircle}    color="bg-amber-500"  sub="below minimum threshold" />
        <KPI label="Dead Stock (>12m)"       value={deadStock}     icon={Package}        color="bg-gray-500"   sub="unused over 12 months"  />
      </div>

      {/* Stock alerts */}
      {parts.filter(p=>p.qty<=p.min).length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20 p-4">
          <p className="mb-2 text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Reorder Alerts</p>
          {parts.filter(p=>p.qty<=p.min).map(p=>(
            <div key={p.id} className="flex items-center justify-between py-1 text-xs text-amber-700 dark:text-amber-400">
              <span>• {p.name} <span className="font-mono">({p.sku})</span> — {p.qty===0?"OUT OF STOCK":`${p.qty} left (min ${p.min})`}</span>
              {p.onOrder && <span className="rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 font-medium">{p.onOrder} on order · ETA {p.expectedDelivery}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Core charge tracker */}
      {pendingCores > 0 && (
        <div className="rounded-xl border border-indigo-300 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950/20 p-4">
          <p className="mb-2 text-sm font-semibold text-indigo-800 dark:text-indigo-300 flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Core / Surcharge Returns Pending</p>
          {parts.filter(p=>p.coreCharge).map(p=>(
            <div key={p.id} className="flex items-center justify-between py-1 text-xs text-indigo-700 dark:text-indigo-400">
              <span>• {p.name} from {p.supplier}</span>
              <span className="font-bold">£{p.coreCharge} to reclaim</span>
            </div>
          ))}
        </div>
      )}

      {/* Category breakdown */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="mb-4 font-semibold flex items-center gap-2"><BarChart3 className="h-4 w-4 text-indigo-500" /> Stock Value by Category</h3>
          <div className="flex flex-col gap-3">
            {topCategories.map(c => (
              <div key={c.cat}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium">{c.cat}</span>
                  <span className="text-muted-foreground">£{c.value.toFixed(0)} · {c.count} parts</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width:`${(c.value/maxVal)*100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Shrinkage / recent activity */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="mb-4 font-semibold flex items-center gap-2"><Layers className="h-4 w-4 text-indigo-500" /> Recent Stock Movements</h3>
          <div className="flex flex-col gap-2 text-xs">
            {[
              { type:"out", part:"Engine Oil Filter",     qty:1,  who:"Gareth Williams", date:"2026-03-12" },
              { type:"out", part:"Engine Oil 10W-40",     qty:32, who:"Gareth Williams", date:"2026-03-12" },
              { type:"in",  part:"Fuel Filter – DAF XF",  qty:8,  who:"PO-2026-041",     date:"2026-03-11" },
              { type:"out", part:"Brake Pads – MAN",      qty:1,  who:"Sandra Okafor",   date:"2026-03-11" },
              { type:"out", part:"Power Steering Pump",   qty:1,  who:"Gareth Williams", date:"2026-02-10" },
            ].map((m,i)=>(
              <div key={i} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                {m.type==="in"
                  ? <ArrowDown className="h-3.5 w-3.5 shrink-0 text-green-500" />
                  : <ArrowUp   className="h-3.5 w-3.5 shrink-0 text-red-400"  />}
                <span className="flex-1 truncate font-medium">{m.part}</span>
                <span className={`font-bold ${m.type==="in"?"text-green-600":"text-red-500"}`}>{m.type==="in"?"+":"-"}{m.qty}</span>
                <span className="text-muted-foreground">{m.who} · {m.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── TAB 2 · PARTS ───────────────────────────────────────────────────────────

function PartsTab() {
  const [search, setSearch] = React.useState("")
  const [cat, setCat]       = React.useState("All")
  const cats = ["All", ...Array.from(new Set(parts.map(p=>p.category)))]
  const filtered = parts.filter(p => {
    const q = search.toLowerCase()
    const matchQ = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.oemRef.toLowerCase().includes(q)
    return matchQ && (cat==="All" || p.category===cat)
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, SKU, OEM ref…" className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring sm:max-w-xs" />
        </div>
        <div className="flex flex-wrap gap-2">
          {cats.map(c=><button key={c} onClick={()=>setCat(c)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${cat===c?"bg-primary text-primary-foreground":"border bg-background hover:bg-muted"}`}>{c}</button>)}
        </div>
        <div className="ml-auto flex gap-2">
          <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-background px-3 text-sm text-muted-foreground hover:bg-muted"><ScanLine className="h-3.5 w-3.5" /> Scan</button>
          <button className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Plus className="h-3.5 w-3.5" /> Add Part</button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full text-xs min-w-[900px]">
          <thead><tr className="border-b bg-muted/40">
            {["SKU","Part Name","OEM / Aftermarket","Category","Location","Stock","Min/Max","Unit Cost","Supplier","Status","Actions"].map(h=>(
              <th key={h} className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filtered.map(p=>{
              const s = qty2Status(p)
              return (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2.5 font-mono font-bold">{p.sku}</td>
                  <td className="px-3 py-2.5 font-medium max-w-[180px]">
                    <p className="truncate">{p.name}</p>
                    {p.critical && <span className="text-[10px] text-red-600 font-semibold">SAFETY CRITICAL</span>}
                    {p.coreCharge && <span className="ml-1 text-[10px] text-indigo-600">Core £{p.coreCharge}</span>}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    <p>{p.oemRef || "—"}</p>
                    <p className="text-[10px]">{p.aftermarketRef || "—"}</p>
                  </td>
                  <td className="px-3 py-2.5"><span className="rounded-full border px-2 py-0.5">{p.category}</span></td>
                  <td className="px-3 py-2.5 font-mono">{p.location}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-sm font-bold ${s==="stockout"?"text-red-600":s==="low"?"text-amber-600":"text-foreground"}`}>{p.qty}{p.category==="Bulk Fluids"?"L":""}</span>
                    {p.onOrder && <p className="text-[10px] text-indigo-600">+{p.onOrder} on order · ETA {p.expectedDelivery}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{p.min}/{p.max}</td>
                  <td className="px-3 py-2.5">£{p.unitCost.toFixed(2)}{p.category==="Bulk Fluids"?"/L":""}</td>
                  <td className="px-3 py-2.5 text-muted-foreground max-w-[120px]"><p className="truncate">{p.supplier}</p><p className="text-[10px]">{p.leadDays}d lead</p></td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 font-bold text-[10px] ${s==="stockout"?"bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400":s==="low"?"bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400":"bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"}`}>
                      {s==="stockout"?"Stockout":s==="low"?"Reorder":"OK"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-2">
                      <button className="text-indigo-500 hover:underline">Edit</button>
                      <button className="text-muted-foreground hover:underline">Adjust</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot><tr className="border-t bg-muted/20">
            <td colSpan={11} className="px-3 py-2.5 text-xs text-muted-foreground">{filtered.length} of {parts.length} parts shown</td>
          </tr></tfoot>
        </table>
      </div>
    </div>
  )
}

// ─── TAB 3 · JOB CARDS ───────────────────────────────────────────────────────

function JobCardsTab() {
  const [scanMode, setScanMode]   = React.useState(false)
  const [kitModal, setKitModal]   = React.useState(false)
  const [scanned, setScanned]     = React.useState<string[]>([])
  const kits = [
    { name:"Volvo FH 12-Week PMI Kit",   items:["40L Engine Oil 10W-40","Oil Filter","Fuel Filter","Air Filter","Grease 400g"] },
    { name:"MAN TGX Axle Brake Kit",     items:["Brake Pad Set (axle)","Brake Disc (axle)","Caliper Slide Pins & Grease"] },
    { name:"DAF XF Service Kit (6-Wk)",  items:["32L Engine Oil 10W-40","Oil Filter","Fuel Filter","Cabin Air Filter"] },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2">
        <button onClick={()=>setScanMode(s=>!s)} className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors ${scanMode?"bg-indigo-500 text-white":"bg-background hover:bg-muted"}`}><ScanLine className="h-3.5 w-3.5" /> {scanMode?"Scanning…":"Scan Part"}</button>
        <button onClick={()=>setKitModal(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-background px-3 text-sm hover:bg-muted"><Layers className="h-3.5 w-3.5" /> Issue Kit</button>
        <button className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Plus className="h-3.5 w-3.5" /> New Job Card</button>
      </div>

      {scanMode && (
        <div className="rounded-xl border border-indigo-300 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950/20 p-5">
          <div className="flex items-center gap-3 mb-4">
            <ScanLine className="h-5 w-5 text-indigo-600 animate-pulse" />
            <p className="font-semibold text-indigo-800 dark:text-indigo-300">Camera Scan Active — point at part barcode / QR</p>
          </div>
          <div className="flex gap-2">
            <input placeholder="Or type part SKU manually…" className="h-9 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" onKeyDown={e=>{ if(e.key==="Enter"){ const v=(e.target as HTMLInputElement).value; if(v){setScanned(p=>[...p,v]);(e.target as HTMLInputElement).value=""} } }} />
            <button className="h-9 rounded-lg bg-indigo-500 px-3 text-sm text-white hover:bg-indigo-600">Add to Job</button>
          </div>
          {scanned.length>0 && (
            <div className="mt-3 flex flex-col gap-1">
              {scanned.map((s,i)=>{
                const match = parts.find(p=>p.sku===s||p.oemRef===s)
                const needsSerial = match?.critical
                return (
                  <div key={i} className="flex items-center justify-between rounded-lg border bg-white dark:bg-card px-3 py-2 text-xs">
                    <span className="font-mono font-bold">{s}</span>
                    {match ? <><span className="text-green-600">{match.name}</span>{needsSerial&&<span className="text-red-600 ml-2">★ Serial/batch required</span>}</> : <span className="text-red-600">Part not found</span>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Active job cards */}
      <div className="flex flex-col gap-4">
        {jobCards.map(jc=>(
          <div key={jc.id} className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{jc.id}</span>
                <span className="font-mono text-sm text-muted-foreground">{jc.reg}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{jc.mechanic}</span><span>{jc.date}</span>
              </div>
            </div>
            <div className="p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parts Issued</p>
              <div className="flex flex-col gap-1">
                {jc.parts.map((pt,i)=>(
                  <div key={i} className="flex items-center gap-3 rounded-lg border bg-muted/20 px-3 py-2 text-xs">
                    <span className="font-mono font-bold text-indigo-600">{pt.sku}</span>
                    <span className="flex-1">{pt.name}</span>
                    <span className="font-bold">×{pt.qty}</span>
                    {pt.serial
                      ? <span className="rounded-full bg-green-100 text-green-700 px-2 py-0.5 font-mono">Batch: {pt.serial}</span>
                      : parts.find(p=>p.sku===pt.sku)?.critical && <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5">No serial – log required</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Kit modal */}
      {kitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl">
            <h3 className="mb-4 text-lg font-bold flex items-center gap-2"><Layers className="h-5 w-5 text-indigo-500" /> Issue PMI Kit</h3>
            <div className="flex flex-col gap-3">
              {kits.map(k=>(
                <button key={k.name} className="flex flex-col items-start rounded-xl border p-3 text-left hover:bg-muted transition-colors" onClick={()=>setKitModal(false)}>
                  <p className="font-semibold text-sm">{k.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{k.items.join(" · ")}</p>
                </button>
              ))}
            </div>
            <button onClick={()=>setKitModal(false)} className="mt-4 w-full h-9 rounded-lg border text-sm hover:bg-muted">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── TAB 4 · PURCHASING ──────────────────────────────────────────────────────

function PurchasingTab() {
  const autoReorder = parts.filter(p=>qty2Status(p)!=="ok")
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <KPI label="Open POs"          value={purchaseOrders.filter(p=>p.status!=="Delivered").length} icon={ShoppingCart} color="bg-indigo-500" />
        <KPI label="Auto-Reorder Due"  value={autoReorder.length} icon={AlertTriangle} color="bg-amber-500" sub="below minimum level" />
        <KPI label="Core Returns £"    value={`£${parts.filter(p=>p.coreCharge).reduce((a,p)=>a+(p.coreCharge??0),0)}`} icon={RefreshCw} color="bg-green-500" sub="pending reclaim" />
      </div>

      {/* Auto-reorder suggestions */}
      {autoReorder.length > 0 && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="border-b bg-muted/40 px-4 py-2.5 flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Auto-Reorder Suggestions</h3>
            <button className="inline-flex h-7 items-center gap-1 rounded-lg bg-primary px-3 text-xs text-primary-foreground hover:bg-primary/90">Raise All POs</button>
          </div>
          <div className="divide-y">
            {autoReorder.map(p=>(
              <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.sku} · Current: {p.qty} · Min: {p.min} · Suggest order: {p.max-p.qty}</p>
                  <p className="text-xs text-muted-foreground">Supplier: {p.supplier} · Lead: {p.leadDays}d · £{(p.unitCost*(p.max-p.qty)).toFixed(2)} estimated</p>
                </div>
                <div className="flex gap-2">
                  {p.onOrder && <span className="rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-0.5 text-[10px] font-medium">{p.onOrder} on order · {p.expectedDelivery}</span>}
                  <button className="inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-xs hover:bg-muted">Raise PO</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Purchase orders */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2.5">
          <h3 className="font-semibold flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-indigo-500" /> Purchase Orders</h3>
          <button className="inline-flex h-7 items-center gap-1 rounded-lg bg-primary px-3 text-xs text-primary-foreground hover:bg-primary/90"><Plus className="h-3 w-3" /> New PO</button>
        </div>
        <table className="w-full text-xs">
          <thead><tr className="border-b bg-muted/20">
            {["PO Number","Date","Supplier","Part","Qty","Total","Status","ETA"].map(h=><th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>)}
          </tr></thead>
          <tbody>
            {purchaseOrders.map(po=>(
              <tr key={po.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2.5 font-mono font-bold text-indigo-600">{po.id}</td>
                <td className="px-3 py-2.5">{po.date}</td>
                <td className="px-3 py-2.5">{po.supplier}</td>
                <td className="px-3 py-2.5">{po.partName}</td>
                <td className="px-3 py-2.5 font-bold">{po.qty}</td>
                <td className="px-3 py-2.5">£{(po.qty*po.unitCost).toFixed(2)}</td>
                <td className="px-3 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 font-medium text-[10px] ${po.status==="Delivered"?"bg-green-100 text-green-700":po.status==="In Transit"?"bg-blue-100 text-blue-700":"bg-amber-100 text-amber-700"}`}>{po.status}</span>
                </td>
                <td className="px-3 py-2.5">{po.expectedDelivery}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── TAB 5 · TYRES & FLUIDS ──────────────────────────────────────────────────

function TyresAndFluidsTab() {
  const bulkFluids = parts.filter(p=>p.category==="Bulk Fluids")
  const [dispenseFluid, setDispenseFluid] = React.useState<string|null>(null)
  const [dispenseAmt, setDispenseAmt]     = React.useState("")

  return (
    <div className="flex flex-col gap-6">
      {/* Tyre status KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KPI label="Tyres to Replace"  value={tyres.filter(t=>t.status==="replace").length}  icon={CircleDot} color="bg-red-500"   sub="below DVSA limit" />
        <KPI label="Advisory Tyres"    value={tyres.filter(t=>t.status==="advisory").length} icon={AlertTriangle} color="bg-amber-500" sub="monitor closely" />
        <KPI label="Tyres Tracked"     value={tyres.length}                                  icon={Truck}     color="bg-indigo-500" sub="with serial numbers" />
      </div>

      {/* Tyre table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2.5">
          <h3 className="font-semibold flex items-center gap-2"><CircleDot className="h-4 w-4 text-indigo-500" /> Tyre Management</h3>
          <button className="inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-xs hover:bg-muted"><Plus className="h-3 w-3" /> Fit Tyre</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[700px]">
            <thead><tr className="border-b bg-muted/20">
              {["Serial","Vehicle","Position","Brand","Size","Fitted","Tread","Status"].map(h=><th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>)}
            </tr></thead>
            <tbody>
              {tyres.map(t=>(
                <tr key={t.serial} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2.5 font-mono font-bold">{t.serial}</td>
                  <td className="px-3 py-2.5 font-mono">{t.reg}</td>
                  <td className="px-3 py-2.5">{t.position}</td>
                  <td className="px-3 py-2.5">{t.brand}</td>
                  <td className="px-3 py-2.5">{t.size}</td>
                  <td className="px-3 py-2.5">{t.fitted}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${t.tread<2?"bg-red-500":t.tread<4?"bg-amber-500":"bg-green-500"}`} style={{width:`${Math.min(100,(t.tread/12)*100)}%`}} /></div>
                      <span className="font-bold">{t.tread}mm</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${{ok:"bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",advisory:"bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",replace:"bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}[t.status]}`}>
                      {t.status.charAt(0).toUpperCase()+t.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Fluid Dispensing */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="border-b bg-muted/40 px-4 py-2.5 flex items-center gap-2">
          <Droplets className="h-4 w-4 text-indigo-500" />
          <h3 className="font-semibold">Bulk Fluid Dispensing</h3>
          <span className="ml-auto text-xs text-muted-foreground">IBC Tank tracking — deduct by litre</span>
        </div>
        <div className="divide-y">
          {bulkFluids.map(f=>{
            const pct = (f.qty/f.max)*100
            return (
              <div key={f.id} className="px-4 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold text-sm">{f.name}</p>
                    <p className="text-xs text-muted-foreground">{f.location} · {f.supplier}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">{f.qty}L <span className="text-sm font-normal text-muted-foreground">/ {f.max}L</span></p>
                    <p className="text-[10px] text-muted-foreground">£{(f.qty*f.unitCost).toFixed(2)} value</p>
                  </div>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden mb-3">
                  <div className={`h-full rounded-full transition-all ${pct<20?"bg-red-500":pct<40?"bg-amber-500":"bg-indigo-500"}`} style={{width:`${pct}%`}} />
                </div>
                <div className="flex items-center gap-2">
                  {dispenseFluid===f.id
                    ? <>
                        <input type="number" min={1} max={f.qty} value={dispenseAmt} onChange={e=>setDispenseAmt(e.target.value)} placeholder="Litres to dispense" className="h-8 w-40 rounded-lg border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring" />
                        <button className="h-8 rounded-lg bg-indigo-500 px-3 text-xs text-white hover:bg-indigo-600" onClick={()=>{setDispenseFluid(null);setDispenseAmt("")}}>Confirm</button>
                        <button className="h-8 rounded-lg border px-3 text-xs hover:bg-muted" onClick={()=>setDispenseFluid(null)}>Cancel</button>
                      </>
                    : <>
                        <button onClick={()=>setDispenseFluid(f.id)} className="inline-flex h-8 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"><Droplets className="h-3 w-3" /> Dispense</button>
                        {pct < 20 && <span className="text-xs text-red-600 font-medium">⚠ Low – order soon</span>}
                      </>
                  }
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── PAGE SHELL ───────────────────────────────────────────────────────────────

const TABS = [
  { id:"dashboard", label:"Dashboard",  icon:BarChart3    },
  { id:"parts",     label:"Parts",      icon:Package      },
  { id:"jobcards",  label:"Job Cards",  icon:Wrench       },
  { id:"purchasing",label:"Purchasing", icon:ShoppingCart },
  { id:"tyres",     label:"Tyres & Fluids", icon:Droplets },
] as const

export default function InventoryPage() {
  const [tab, setTab] = React.useState<typeof TABS[number]["id"]>("dashboard")
  const alerts = parts.filter(p=>qty2Status(p)!=="ok").length

  return (
    <div className="flex flex-1 flex-col gap-4 p-6 md:p-8 lg:p-10">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Inventory Hub</h1>
          <p className="mt-1 text-sm text-muted-foreground">MRO workshop stock · DVSA parts traceability · Tyre & fluid management</p>
        </div>
        <div className="flex gap-2">
          {alerts>0 && <div className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400 px-3 py-2 text-sm font-semibold text-amber-700"><AlertTriangle className="h-4 w-4" /> {alerts} reorder alert{alerts>1?"s":""}</div>}
          <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-background px-3 text-sm text-muted-foreground hover:bg-muted"><Download className="h-3.5 w-3.5" /> Export</button>
        </div>
      </div>

      <div className="flex gap-1 rounded-xl border bg-muted/30 p-1 w-full">
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors ${tab===t.id?"bg-background shadow-sm text-foreground":"text-muted-foreground hover:text-foreground"}`}
          >
            <t.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {tab==="dashboard"  && <DashboardTab />}
      {tab==="parts"      && <PartsTab />}
      {tab==="jobcards"   && <JobCardsTab />}
      {tab==="purchasing" && <PurchasingTab />}
      {tab==="tyres"      && <TyresAndFluidsTab />}
    </div>
  )
}
