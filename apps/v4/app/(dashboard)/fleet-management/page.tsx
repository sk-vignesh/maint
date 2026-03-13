"use client"
import * as React from "react"
import dynamic from "next/dynamic"
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell
} from "recharts"
import {
  Layers, Truck, AlertTriangle, Gauge, Fuel,
  ChevronUp, ChevronDown, Search, MoreHorizontal,
  Calendar, Plus, Download, Check,
  ChevronLeft, ChevronRight, MapPin, Route, Shield,
  Wifi, WifiOff, BarChart3, Thermometer, Zap, Activity,
  TrendingUp, TrendingDown, Clock, Star, AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  GeotabDevice, GeotabExceptionEvent, GeotabStatusData, GeotabTrip
} from "@/lib/geotab"

// ─── DYNAMIC LEAFLET (no SSR) ─────────────────────────────────────────────────
type VehicleMapProps = { pins: VehiclePin[] }

const VehicleMap = dynamic<VehicleMapProps>(() => import("./vehicle-map"), { ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-muted/30 rounded-xl">
      <MapPin className="h-6 w-6 animate-pulse text-muted-foreground" />
    </div>
  )
})

// ─── MOCK DATA ────────────────────────────────────────────────────────────────

// UK coords centred around Birmingham / M1 corridor
const MOCK_DEVICES: GeotabDevice[] = [
  { id:"d1", name:"NUX9VAM — MAN TGX",    licensePlate:"NUX9VAM", vehicleIdentificationNumber:"WMA06XZZ4NM123456", serialNumber:"GT-7890" },
  { id:"d2", name:"TB67KLM — Volvo FH",   licensePlate:"TB67KLM", vehicleIdentificationNumber:"YV2R4G0A1KB234567", serialNumber:"GT-7891" },
  { id:"d3", name:"PN19RFX — MAN TGL",    licensePlate:"PN19RFX", vehicleIdentificationNumber:"WMA03XZZ3JM345678", serialNumber:"GT-7892" },
  { id:"d4", name:"LK21DVA — Scania R",   licensePlate:"LK21DVA", vehicleIdentificationNumber:"YS2R4X21LM456789", serialNumber:"GT-7893" },
  { id:"d5", name:"OU70TBN — DAF XF",     licensePlate:"OU70TBN", vehicleIdentificationNumber:"XLRAE47MS0E567890", serialNumber:"GT-7894" },
  { id:"d6", name:"YJ19HKP — Mercedes",   licensePlate:"YJ19HKP", vehicleIdentificationNumber:"WDB9634031L678901", serialNumber:"GT-7895" },
]

type VehiclePin = { deviceId: string; name: string; lat: number; lng: number; speed: number; heading: number; status: "moving"|"idle"|"stopped" }

const MOCK_PINS: VehiclePin[] = [
  { deviceId:"d1", name:"NUX9VAM", lat:52.486, lng:-1.890, speed:87, heading:45,  status:"moving"  },
  { deviceId:"d2", name:"TB67KLM", lat:52.502, lng:-1.842, speed:72, heading:90,  status:"moving"  },
  { deviceId:"d3", name:"PN19RFX", lat:52.651, lng:-1.571, speed:0,  heading:180, status:"idle"    },
  { deviceId:"d4", name:"LK21DVA", lat:52.407, lng:-1.512, speed:56, heading:270, status:"moving"  },
  { deviceId:"d5", name:"OU70TBN", lat:52.550, lng:-2.123, speed:0,  heading:0,   status:"stopped" },
  { deviceId:"d6", name:"YJ19HKP", lat:52.471, lng:-1.950, speed:94, heading:350, status:"moving"  },
]

const now = new Date()
const fmt = (d: Date) => d.toISOString().slice(0,16).replace("T"," ")
const hoursAgo = (n: number) => new Date(now.getTime() - n*3600000)

const MOCK_EXCEPTIONS: (GeotabExceptionEvent & { deviceName: string })[] = [
  { id:"e1", device:{id:"d6"}, deviceName:"YJ19HKP", rule:{id:"r1",name:"Speeding"},       activeFrom:fmt(hoursAgo(0.2)), activeTo:fmt(hoursAgo(0.1)),  distance:4200, duration:360,  state:"Active",   driver:undefined },
  { id:"e2", device:{id:"d1"}, deviceName:"NUX9VAM", rule:{id:"r2",name:"Harsh Braking"},  activeFrom:fmt(hoursAgo(0.5)), activeTo:fmt(hoursAgo(0.48)), distance:120,  duration:18,   state:"Inactive", driver:undefined },
  { id:"e3", device:{id:"d2"}, deviceName:"TB67KLM", rule:{id:"r3",name:"Harsh Cornering"},activeFrom:fmt(hoursAgo(1.1)), activeTo:fmt(hoursAgo(1.08)), distance:80,   duration:12,   state:"Inactive", driver:undefined },
  { id:"e4", device:{id:"d4"}, deviceName:"LK21DVA", rule:{id:"r1",name:"Speeding"},       activeFrom:fmt(hoursAgo(1.8)), activeTo:fmt(hoursAgo(1.6)),  distance:6700, duration:720,  state:"Inactive", driver:undefined },
  { id:"e5", device:{id:"d6"}, deviceName:"YJ19HKP", rule:{id:"r4",name:"Seat Belt"},      activeFrom:fmt(hoursAgo(2.3)), activeTo:fmt(hoursAgo(2.28)), distance:0,    duration:15,   state:"Inactive", driver:undefined },
  { id:"e6", device:{id:"d3"}, deviceName:"PN19RFX", rule:{id:"r5",name:"Idling > 10 min"},activeFrom:fmt(hoursAgo(0.7)), activeTo:fmt(hoursAgo(0.5)),  distance:0,    duration:1200, state:"Inactive", driver:undefined },
  { id:"e7", device:{id:"d5"}, deviceName:"OU70TBN", rule:{id:"r6",name:"Driver Fatigue"}, activeFrom:fmt(hoursAgo(3.0)), activeTo:fmt(hoursAgo(2.9)),  distance:200,  duration:600,  state:"Inactive", driver:undefined },
  { id:"e8", device:{id:"d2"}, deviceName:"TB67KLM", rule:{id:"r2",name:"Harsh Braking"},  activeFrom:fmt(hoursAgo(4.2)), activeTo:fmt(hoursAgo(4.19)), distance:90,   duration:10,   state:"Inactive", driver:undefined },
]

const DIAG_NAMES = ["Engine Speed (RPM)","Fuel Level (%)","Coolant Temp (°C)","Odometer (km)","Battery Voltage (V)","AdBlue Level (%)"]
const MOCK_STATUS: (GeotabStatusData & { deviceName: string })[] = MOCK_DEVICES.flatMap(d =>
  DIAG_NAMES.map((name, i) => ({
    id: `s_${d.id}_${i}`,
    device: { id: d.id },
    deviceName: d.name.split(" — ")[0],
    diagnostic: { id: `diag${i}`, name },
    dateTime: fmt(hoursAgo(Math.random()*0.5)),
    data: [
      1200 + Math.random()*1400,   // RPM
      20 + Math.random()*70,       // Fuel %
      75 + Math.random()*20,       // Coolant C
      85000 + Math.random()*50000, // Odometer
      12.2 + Math.random()*1.5,    // Battery V
      15 + Math.random()*80,       // AdBlue %
    ][i]!
  }))
)

const MOCK_TRIPS: (GeotabTrip & { deviceName: string })[] = MOCK_DEVICES.flatMap((d,di) =>
  Array.from({length: 4}, (_,i) => ({
    id: `t_${d.id}_${i}`,
    device: { id: d.id },
    deviceName: d.name.split(" — ")[0],
    start: fmt(hoursAgo(8 - i*2 + di*0.3)),
    stop:  fmt(hoursAgo(7 - i*2 + di*0.3)),
    distance: 30000 + Math.random()*80000,
    maxSpeed: 88 + Math.random()*32,
    averageSpeed: 55 + Math.random()*25,
    startLatitude:  52.3 + Math.random()*0.5,
    startLongitude: -2.1 + Math.random()*0.8,
    stopLatitude:   52.3 + Math.random()*0.5,
    stopLongitude:  -2.1 + Math.random()*0.8,
  }))
)

// ─── FLEET / VEHICLE DATA (from existing pages) ──────────────────────────────

type Fleet = { id:string; publicId:string; name:string; tripLength:number|null; drivers:number; activeDrivers:number; color:string }
const FLEETS: Fleet[] = [
  { id:"1", publicId:"kseAuve", name:"FleetX",  tripLength:null, drivers:6, activeDrivers:0, color:"#6366f1" },
  { id:"2", publicId:"cEBDNth", name:"Tramper", tripLength:null, drivers:6, activeDrivers:1, color:"#f59e0b" },
  { id:"3", publicId:"oyC1dgU", name:"Solo",    tripLength:24,   drivers:7, activeDrivers:0, color:"#10b981" },
]

type VehicleRow = { id:number; plate:string; make:string; model:string; year:number; fleet:string; vin:string; status:"Active"|"Inactive"|"In Maintenance" }
const VEHICLES: VehicleRow[] = [
  { id:1, plate:"NUX9VAM", make:"MAN",        model:"TGX",          year:2022, fleet:"Solo",    vin:"WMA06XZZ4NM123456", status:"Active" },
  { id:2, plate:"TB67KLM", make:"Volvo",       model:"FH 460",       year:2021, fleet:"Tramper", vin:"YV2R4G0A1KB234567", status:"Active" },
  { id:3, plate:"PN19RFX", make:"MAN",         model:"TGL",          year:2019, fleet:"Solo",    vin:"WMA03XZZ3JM345678", status:"In Maintenance" },
  { id:4, plate:"LK21DVA", make:"Scania",      model:"R 450",        year:2021, fleet:"FleetX",  vin:"YS2R4X21LM456789", status:"Active" },
  { id:5, plate:"OU70TBN", make:"DAF",         model:"XF 530",       year:2020, fleet:"Solo",    vin:"XLRAE47MS0E567890", status:"Inactive" },
  { id:6, plate:"YJ19HKP", make:"Mercedes",    model:"Actros 2545",  year:2019, fleet:"FleetX",  vin:"WDB9634031L678901", status:"Active" },
  { id:7, plate:"LD71ABC", make:"Land Rover",  model:"Defender 110", year:2022, fleet:"Tramper", vin:"SALGA2AE5NA789012", status:"Active" },
  { id:8, plate:"LN22DLV", make:"Volkswagen",  model:"Crafter",      year:2022, fleet:"Solo",    vin:"WV3ZZZ2EZN8890123", status:"Active" },
]

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const RULE_SEVERITY: Record<string,"critical"|"warning"|"info"> = {
  "Speeding": "critical",
  "Harsh Braking": "critical",
  "Driver Fatigue": "critical",
  "Harsh Cornering": "warning",
  "Seat Belt": "warning",
  "Idling > 10 min": "info",
}
const severityColors = {
  critical: "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/20 text-red-800 dark:text-red-300",
  warning:  "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300",
  info:     "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400",
}
const severityDot = { critical:"bg-red-500", warning:"bg-amber-400", info:"bg-blue-400" }

function mToKm(m: number) { return (m/1000).toFixed(1) }
function fmt2dp(n: number) { return n.toLocaleString("en-GB", {maximumFractionDigits:1}) }

// ─── SUBCOMPONENTS ────────────────────────────────────────────────────────────

function KPICard({ label, value, sub, icon: Icon, color }: {
  label:string; value:string|number; sub?:string; icon:React.ElementType; color:string
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  )
}

// Sortable column header
function SortHeader({ label, col, sort, setSort }: {
  label:string; col:string
  sort:{col:string;dir:"asc"|"desc"}; setSort:(s:{col:string;dir:"asc"|"desc"})=>void
}) {
  const active = sort.col === col
  return (
    <button onClick={() => setSort({ col, dir: active && sort.dir==="asc" ? "desc" : "asc" })}
      className="group inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap hover:text-foreground">
      {label}
      <span className={cn("opacity-0 group-hover:opacity-50", active && "opacity-70")}>
        {active && sort.dir==="desc" ? <ChevronDown className="h-3 w-3"/> : <ChevronUp className="h-3 w-3"/>}
      </span>
    </button>
  )
}

function Pagination({ page, total, perPage, setPage }: {page:number;total:number;perPage:number;setPage:(n:number)=>void}) {
  const pages = Math.ceil(total/perPage)
  return (
    <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
      <span>Showing {Math.min((page-1)*perPage+1, total)}–{Math.min(page*perPage, total)} of {total}</span>
      <div className="flex items-center gap-1">
        <button onClick={()=>setPage(page-1)} disabled={page===1} className="flex h-7 w-7 items-center justify-center rounded border disabled:opacity-40 hover:bg-muted"><ChevronLeft className="h-3.5 w-3.5"/></button>
        <span className="px-2">{page} / {pages}</span>
        <button onClick={()=>setPage(page+1)} disabled={page>=pages} className="flex h-7 w-7 items-center justify-center rounded border disabled:opacity-40 hover:bg-muted"><ChevronRight className="h-3.5 w-3.5"/></button>
      </div>
    </div>
  )
}

// ─── CONTROL BAR ─────────────────────────────────────────────────────────────

function ControlBar({ selectedIds, setSelectedIds, fromDate, setFromDate, toDate, setToDate, autoRefresh, setAutoRefresh }: {
  selectedIds: string[]; setSelectedIds: (ids: string[]) => void
  fromDate: string; setFromDate: (s: string) => void
  toDate: string;   setToDate:   (s: string) => void
  autoRefresh: boolean; setAutoRefresh: (b: boolean) => void
}) {
  const [devOpen, setDevOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const fn = (e: MouseEvent) => { if(ref.current && !ref.current.contains(e.target as Node)) setDevOpen(false) }
    document.addEventListener("mousedown", fn)
    return () => document.removeEventListener("mousedown", fn)
  }, [])

  const allSelected = selectedIds.length === 0 || selectedIds.length === MOCK_DEVICES.length
  const toggleDevice = (id: string) => {
    if(selectedIds.includes(id)) setSelectedIds(selectedIds.filter(x=>x!==id))
    else setSelectedIds([...selectedIds, id])
  }

  return (
    <div className="sticky top-12 z-20 flex flex-wrap items-center gap-2 border-b bg-background/90 backdrop-blur px-4 py-2.5 xl:px-6">
      {/* Vehicle multi-select */}
      <div ref={ref} className="relative">
        <button onClick={()=>setDevOpen(v=>!v)}
          className="inline-flex h-8 items-center gap-2 rounded-lg border bg-background px-3 text-xs font-medium hover:bg-muted min-w-[150px]">
          <Truck className="h-3.5 w-3.5 text-muted-foreground"/>
          <span className="flex-1 text-left">
            {allSelected ? "All Vehicles" : `${selectedIds.length} selected`}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground"/>
        </button>
        {devOpen && (
          <div className="absolute left-0 top-full mt-1 w-64 rounded-xl border bg-popover shadow-lg z-50 overflow-hidden">
            <div className="border-b p-1">
              <button onClick={()=>setSelectedIds([])}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs hover:bg-muted">
                <span className={cn("flex h-4 w-4 items-center justify-center rounded border", allSelected && "bg-primary border-primary text-primary-foreground")}>
                  {allSelected && <Check className="h-2.5 w-2.5"/>}
                </span>
                Select All
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto p-1">
              {MOCK_DEVICES.map(d => {
                const sel = selectedIds.includes(d.id)
                return (
                  <button key={d.id} onClick={()=>toggleDevice(d.id)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs hover:bg-muted">
                    <span className={cn("flex h-4 w-4 items-center justify-center rounded border shrink-0", sel && "bg-primary border-primary text-primary-foreground")}>
                      {sel && <Check className="h-2.5 w-2.5"/>}
                    </span>
                    <span className="truncate">{d.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Date range */}
      <div className="flex items-center gap-1">
        <Calendar className="h-3.5 w-3.5 text-muted-foreground"/>
        <input type="datetime-local" value={fromDate} onChange={e=>setFromDate(e.target.value)}
          className="h-8 rounded-lg border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"/>
        <span className="text-xs text-muted-foreground">→</span>
        <input type="datetime-local" value={toDate} onChange={e=>setToDate(e.target.value)}
          className="h-8 rounded-lg border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"/>
      </div>

      {/* Auto-refresh toggle */}
      <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-1.5">
        <span className="text-xs text-muted-foreground">Auto-refresh 30s</span>
        <button onClick={()=>setAutoRefresh(!autoRefresh)}
          className={cn("relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors", autoRefresh ? "bg-indigo-500" : "bg-muted border")}>
          <span className={cn("inline-block h-4 w-4 translate-y-0.5 rounded-full bg-white shadow transition-transform", autoRefresh ? "translate-x-4" : "translate-x-0.5")}/>
        </button>
        {autoRefresh
          ? <Wifi className="h-3.5 w-3.5 text-green-500"/>
          : <WifiOff className="h-3.5 w-3.5 text-muted-foreground"/>}
      </div>
    </div>
  )
}

// ─── ACTIVITY FEED ────────────────────────────────────────────────────────────

function ActivityFeed({ events }: { events: typeof MOCK_EXCEPTIONS }) {
  return (
    <div className="flex flex-col rounded-xl border bg-card shadow-sm overflow-hidden h-full">
      <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-3">
        <Shield className="h-4 w-4 text-muted-foreground"/>
        <h3 className="text-sm font-semibold">Exception Events</h3>
        <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {events.filter(e=>RULE_SEVERITY[e.rule.name]==="critical").length} critical
        </span>
      </div>
      <div className="flex-1 overflow-y-auto divide-y">
        {events.map(e => {
          const sev = RULE_SEVERITY[e.rule.name] ?? "info"
          return (
            <div key={e.id} className={cn("flex items-start gap-3 px-4 py-3 border-l-4", {
              "border-l-red-500":    sev==="critical",
              "border-l-amber-400":  sev==="warning",
              "border-l-blue-400":   sev==="info",
            })}>
              <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", severityDot[sev])}/>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold">{e.deviceName} — {e.rule.name}</p>
                <p className="text-[10px] text-muted-foreground">{e.activeFrom} · {mToKm(e.distance)} km</p>
              </div>
              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold border", severityColors[sev])}>
                {sev.toUpperCase()}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── DIAGNOSTICS TABLE ────────────────────────────────────────────────────────

function DiagnosticsTable({ data }: { data: typeof MOCK_STATUS }) {
  const [search, setSearch] = React.useState("")
  const [sort, setSort] = React.useState<{col:string;dir:"asc"|"desc"}>({col:"dateTime",dir:"desc"})
  const [page, setPage] = React.useState(1)
  const PER = 12

  const filtered = data
    .filter(r => !search || r.deviceName.toLowerCase().includes(search.toLowerCase()) || r.diagnostic.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => {
      const dir = sort.dir==="asc" ? 1 : -1
      if(sort.col==="deviceName") return dir * a.deviceName.localeCompare(b.deviceName)
      if(sort.col==="diagnostic") return dir * a.diagnostic.name.localeCompare(b.diagnostic.name)
      if(sort.col==="data")       return dir * (a.data - b.data)
      return dir * a.dateTime.localeCompare(b.dateTime)
    })

  const paged = filtered.slice((page-1)*PER, page*PER)

  return (
    <div className="flex flex-col rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 border-b bg-muted/30 px-4 py-2.5">
        <Gauge className="h-4 w-4 text-muted-foreground"/>
        <h3 className="text-sm font-semibold">Engine Diagnostics</h3>
        <div className="ml-auto relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"/>
          <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Filter…"
            className="h-7 rounded-lg border bg-background pl-8 pr-3 text-xs outline-none focus:ring-2 focus:ring-ring w-36"/>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[600px]">
          <thead>
            <tr className="border-b bg-muted/20">
              <th className="px-4 py-2.5 text-left"><SortHeader label="Vehicle"    col="deviceName" sort={sort} setSort={setSort}/></th>
              <th className="px-4 py-2.5 text-left"><SortHeader label="Diagnostic" col="diagnostic" sort={sort} setSort={setSort}/></th>
              <th className="px-4 py-2.5 text-right"><SortHeader label="Value"     col="data"       sort={sort} setSort={setSort}/></th>
              <th className="px-4 py-2.5 text-left"><SortHeader label="Recorded"   col="dateTime"   sort={sort} setSort={setSort}/></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paged.map(r => (
              <tr key={r.id} className="hover:bg-muted/20">
                <td className="px-4 py-2 font-mono font-medium">{r.deviceName}</td>
                <td className="px-4 py-2 text-muted-foreground">{r.diagnostic.name}</td>
                <td className="px-4 py-2 text-right font-bold">{fmt2dp(r.data)}</td>
                <td className="px-4 py-2 text-muted-foreground">{r.dateTime}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={filtered.length} perPage={PER} setPage={setPage}/>
    </div>
  )
}

// ─── TRIPS TABLE ──────────────────────────────────────────────────────────────

function TripsTable({ data }: { data: typeof MOCK_TRIPS }) {
  const [search, setSearch] = React.useState("")
  const [sort, setSort] = React.useState<{col:string;dir:"asc"|"desc"}>({col:"start",dir:"desc"})
  const [page, setPage] = React.useState(1)
  const PER = 10

  const filtered = data
    .filter(r => !search || r.deviceName.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => {
      const dir = sort.dir==="asc" ? 1 : -1
      if(sort.col==="deviceName") return dir * a.deviceName.localeCompare(b.deviceName)
      if(sort.col==="distance")   return dir * (a.distance - b.distance)
      if(sort.col==="maxSpeed")   return dir * (a.maxSpeed - b.maxSpeed)
      return dir * a.start.localeCompare(b.start)
    })

  const paged = filtered.slice((page-1)*PER, page*PER)

  return (
    <div className="flex flex-col rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 border-b bg-muted/30 px-4 py-2.5">
        <Route className="h-4 w-4 text-muted-foreground"/>
        <h3 className="text-sm font-semibold">Trip History</h3>
        <div className="ml-auto relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"/>
          <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Filter vehicle…"
            className="h-7 rounded-lg border bg-background pl-8 pr-3 text-xs outline-none focus:ring-2 focus:ring-ring w-36"/>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[700px]">
          <thead>
            <tr className="border-b bg-muted/20">
              <th className="px-4 py-2.5 text-left"><SortHeader label="Vehicle"   col="deviceName" sort={sort} setSort={setSort}/></th>
              <th className="px-4 py-2.5 text-left"><SortHeader label="Start"     col="start"      sort={sort} setSort={setSort}/></th>
              <th className="px-4 py-2.5 text-left">End</th>
              <th className="px-4 py-2.5 text-right"><SortHeader label="Distance" col="distance"   sort={sort} setSort={setSort}/></th>
              <th className="px-4 py-2.5 text-right"><SortHeader label="Max Spd"  col="maxSpeed"   sort={sort} setSort={setSort}/></th>
              <th className="px-4 py-2.5 text-right">Avg Spd</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paged.map(t => (
              <tr key={t.id} className="hover:bg-muted/20">
                <td className="px-4 py-2 font-mono font-medium">{t.deviceName}</td>
                <td className="px-4 py-2 text-muted-foreground">{t.start}</td>
                <td className="px-4 py-2 text-muted-foreground">{t.stop}</td>
                <td className="px-4 py-2 text-right font-semibold">{mToKm(t.distance)} km</td>
                <td className="px-4 py-2 text-right">
                  <span className={cn("font-bold", t.maxSpeed > 90 && "text-red-500 dark:text-red-400")}>
                    {t.maxSpeed.toFixed(0)} km/h
                  </span>
                </td>
                <td className="px-4 py-2 text-right text-muted-foreground">{t.averageSpeed.toFixed(0)} km/h</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={filtered.length} perPage={PER} setPage={setPage}/>
    </div>
  )
}

// ─── VEHICLES TAB ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string,string> = {
  Active:           "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  Inactive:         "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  "In Maintenance": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
}
const STATUS_DOT: Record<string,string> = {
  Active:"bg-green-500", Inactive:"bg-gray-400", "In Maintenance":"bg-yellow-500"
}

function VehiclesTab() {
  const [search, setSearch] = React.useState("")
  const [fleetF, setFleetF] = React.useState("All")
  const filtered = VEHICLES.filter(v => {
    const q = search.toLowerCase()
    return (!q || v.plate.toLowerCase().includes(q) || v.make.toLowerCase().includes(q) || v.model.toLowerCase().includes(q))
      && (fleetF==="All" || v.fleet===fleetF)
  })
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search vehicles…"
            className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"/>
        </div>
        <select value={fleetF} onChange={e=>setFleetF(e.target.value)}
          className="h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
          <option value="All">All Fleets</option>
          {["Solo","Tramper","FleetX"].map(f=><option key={f} value={f}>{f}</option>)}
        </select>
        <button className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 ml-auto">
          <Plus className="h-4 w-4"/> Add Vehicle
        </button>
        <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm text-muted-foreground hover:bg-muted"><Download className="h-3.5 w-3.5"/> Export</button>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {["#","Plate","Make","Model","Year","Fleet","VIN","Status",""].map(h=>(
                  <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(v=>(
                <tr key={v.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2.5 text-xs text-muted-foreground text-right">{v.id}</td>
                  <td className="px-4 py-2.5 font-mono font-semibold">{v.plate}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{v.make}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{v.model}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{v.year}</td>
                  <td className="px-4 py-2.5"><span className="rounded bg-muted px-2 py-0.5 text-xs">{v.fleet}</span></td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{v.vin}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_STYLES[v.status])}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[v.status])}/>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <button className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted text-muted-foreground">
                      <MoreHorizontal className="h-4 w-4"/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t px-4 py-2 text-xs text-muted-foreground">
          Showing {filtered.length} of {VEHICLES.length} vehicles
        </div>
      </div>
    </div>
  )
}

// ─── FLEETS TAB ───────────────────────────────────────────────────────────────

function Stat({ label, value, accent }: { label:string; value:string; accent?:boolean }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={cn("text-sm font-semibold", accent && "text-green-600 dark:text-green-400")}>{value}</span>
      <span className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</span>
    </div>
  )
}

function FleetsTab() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{FLEETS.length} fleet groups</p>
        <button className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4"/> New Fleet
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {FLEETS.map(f=>(
          <div key={f.id} className="group relative overflow-hidden rounded-xl border bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="h-1 w-full" style={{background:f.color}}/>
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{background:`${f.color}18`}}>
                  <Truck className="h-5 w-5" style={{color:f.color}}/>
                </div>
                <button className="invisible group-hover:visible h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground">
                  <MoreHorizontal className="h-4 w-4"/>
                </button>
              </div>
              <h3 className="mt-3 text-sm font-semibold">{f.name}</h3>
              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{f.publicId}</p>
              <div className="mt-3 grid grid-cols-3 gap-1 border-t pt-3">
                <Stat label="Trip Len" value={f.tripLength !== null ? String(f.tripLength) : "—"}/>
                <Stat label="Drivers" value={String(f.drivers)}/>
                <Stat label="Active" value={String(f.activeDrivers)} accent={f.activeDrivers>0}/>
              </div>
            </div>
          </div>
        ))}
        <button className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/20 p-4 text-muted-foreground hover:bg-muted/40 hover:text-foreground min-h-[160px] transition-colors">
          <Plus className="h-6 w-6"/><span className="text-xs font-medium">New Fleet</span>
        </button>
      </div>
    </div>
  )
}

// ─── OVERVIEW TAB ─────────────────────────────────────────────────────────────

function OverviewTab({ selectedIds }: { selectedIds: string[] }) {
  const pins     = selectedIds.length ? MOCK_PINS.filter(p=>selectedIds.includes(p.deviceId)) : MOCK_PINS
  const events   = selectedIds.length ? MOCK_EXCEPTIONS.filter(e=>selectedIds.includes(e.device.id)) : MOCK_EXCEPTIONS
  const status   = selectedIds.length ? MOCK_STATUS.filter(s=>selectedIds.includes(s.device.id)) : MOCK_STATUS
  const trips    = selectedIds.length ? MOCK_TRIPS.filter(t=>selectedIds.includes(t.device.id)) : MOCK_TRIPS

  const moving        = pins.filter(p=>p.status==="moving").length
  const totalDistKm   = trips.reduce((a,t)=>a+t.distance,0)/1000
  const criticalCount = events.filter(e=>RULE_SEVERITY[e.rule.name]==="critical").length

  const [bottomTab, setBottomTab] = React.useState<"diag"|"trips">("diag")

  return (
    <div className="flex flex-col gap-4">
      {/* KPI Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard label="Active Vehicles"    value={moving}              sub={`of ${pins.length} tracked`}      icon={Truck}         color="bg-green-500"/>
        <KPICard label="Total Distance"     value={`${totalDistKm.toFixed(0)} km`} sub="today across all vehicles" icon={Route}      color="bg-indigo-500"/>
        <KPICard label="Critical Alerts"    value={criticalCount}       sub="speeding / harsh braking"         icon={AlertTriangle} color={criticalCount>0?"bg-red-500":"bg-green-500"}/>
        <KPICard label="Exception Events"   value={events.length}       sub="all severity levels"              icon={Shield}        color="bg-amber-500"/>
      </div>

      {/* Map + Feed */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 min-h-[420px] rounded-xl overflow-hidden border shadow-sm">
          <VehicleMap pins={pins}/>
        </div>
        <div className="lg:col-span-2 min-h-[420px]">
          <ActivityFeed events={events}/>
        </div>
      </div>

      {/* Bottom tables */}
      <div className="flex gap-2 border-b">
        {([["diag","Engine Diagnostics"],["trips","Trip History"]] as const).map(([key,label])=>(
          <button key={key} onClick={()=>setBottomTab(key)}
            className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
              bottomTab===key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}>{label}</button>
        ))}
      </div>
      {bottomTab==="diag"  && <DiagnosticsTable data={status}/>}
      {bottomTab==="trips" && <TripsTable data={trips}/>}
    </div>
  )
}

// ─── VEHICLE ANALYTICS ───────────────────────────────────────────────────────

// Generate mock hour-by-hour telemetry for a vehicle
function genTimeSeries(deviceId: string) {
  const seed = deviceId.charCodeAt(1)
  return Array.from({ length: 48 }, (_, i) => {
    const h = i * 0.5
    const isActive = h >= 6 && h <= 18
    const base = Math.sin(h / 3 + seed) * 0.3 + 0.7
    return {
      time: `${String(Math.floor(h)).padStart(2,"0")}:${i%2===0?"00":"30"}`,
      speed:   isActive ? Math.max(0, Math.round(base * 90 + (Math.random()-0.5)*25)) : 0,
      rpm:     isActive ? Math.max(600, Math.round(base * 1800 + (Math.random()-0.5)*400)) : 600,
      fuel:    Math.max(5, Math.round(72 - h * 1.2 + Math.random()*3)),
      coolant: isActive ? Math.round(82 + base * 10 + Math.random()*4) : 60,
      adblue:  Math.max(5, Math.round(65 - h * 0.8 + Math.random()*2)),
    }
  })
}

const SAFETY_EVENTS_BY_TYPE: Record<string,number[]> = {
  "NUX9VAM": [2, 5, 1, 0, 3],
  "TB67KLM": [1, 2, 0, 1, 0],
  "PN19RFX": [0, 1, 0, 0, 4],
  "LK21DVA": [4, 3, 2, 1, 1],
  "OU70TBN": [1, 0, 0, 0, 2],
  "YJ19HKP": [6, 4, 2, 3, 1],
}
const SAFETY_LABELS = ["Speeding","Harsh Braking","Harsh Cornering","Seat Belt","Idling"]
const SAFETY_COLORS = ["#ef4444","#f97316","#eab308","#8b5cf6","#6b7280"]

function safetyScore(plate: string): number {
  const events = SAFETY_EVENTS_BY_TYPE[plate] ?? [0,0,0,0,0]
  const weighted = events[0]*3 + events[1]*3 + events[2]*2 + events[3]*1 + events[4]*0.5
  return Math.max(0, Math.round(100 - weighted * 2.5))
}

function ScoreRing({ score }: { score: number }) {
  const r = 38; const c = 2 * Math.PI * r
  const pct = score / 100
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444"
  return (
    <svg viewBox="0 0 100 100" className="w-28 h-28">
      <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30"/>
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${pct*c} ${c}`} strokeLinecap="round"
        transform="rotate(-90 50 50)" style={{transition:"stroke-dasharray .6s ease"}}/>
      <text x="50" y="46" textAnchor="middle" className="fill-foreground" fontSize="18" fontWeight="bold">{score}</text>
      <text x="50" y="60" textAnchor="middle" fill="#888" fontSize="9">/ 100</text>
    </svg>
  )
}

function GaugeBar({ label, value, max, unit, warn, crit, icon: Icon, color }:{
  label:string; value:number; max:number; unit:string; warn:number; crit:number
  icon:React.ElementType; color:string
}) {
  const pct = Math.min(1, value / max) * 100
  const barColor = value >= crit ? "bg-red-500" : value >= warn ? "bg-amber-400" : color
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border bg-card p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-3.5 w-3.5 text-white"/>
        </div>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="ml-auto text-sm font-bold">{value.toFixed(0)}<span className="text-xs text-muted-foreground ml-0.5">{unit}</span></span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{width:`${pct}%`}}/>
      </div>
    </div>
  )
}

function VehicleAnalyticsTab({ onSelectVehicle }: { onSelectVehicle?: (plate: string) => void }) {
  const [selectedVehicle, setSelectedVehicle] = React.useState(VEHICLES[0])
  const series = React.useMemo(() => genTimeSeries(selectedVehicle.plate), [selectedVehicle.plate])

  const pin        = MOCK_PINS.find(p => p.name === selectedVehicle.plate) ?? MOCK_PINS[0]
  const exceptions = MOCK_EXCEPTIONS.filter(e => e.deviceName === selectedVehicle.plate)
  const trips      = MOCK_TRIPS.filter(t => t.deviceName === selectedVehicle.plate)
  const score      = safetyScore(selectedVehicle.plate)
  const events     = SAFETY_EVENTS_BY_TYPE[selectedVehicle.plate] ?? [0,0,0,0,0]
  const totalDist  = trips.reduce((a,t) => a+t.distance, 0) / 1000
  const lastSeries = series[series.length - 1]

  const safetyData = SAFETY_LABELS.map((l,i) => ({ name: l, value: events[i]!, fill: SAFETY_COLORS[i]! }))

  return (
    <div className="flex flex-col gap-4">
      {/* Vehicle selector */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Analysing:</span>
        <div className="flex flex-wrap gap-2">
          {VEHICLES.filter(v => v.status !== "Inactive").map(v => (
            <button key={v.id} onClick={() => setSelectedVehicle(v)}
              className={cn("inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                selectedVehicle.id === v.id
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                  : "hover:bg-muted"
              )}>
              <span className={cn("h-1.5 w-1.5 rounded-full",
                v.status === "Active" ? "bg-green-500" : "bg-amber-400"
              )}/>
              {v.plate}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2 rounded-xl border bg-card px-4 py-2">
          <div>
            <p className="text-xs text-muted-foreground">Vehicle</p>
            <p className="text-sm font-bold">{selectedVehicle.make} {selectedVehicle.model}</p>
          </div>
          <div className="w-px h-8 bg-border mx-2"/>
          <div>
            <p className="text-xs text-muted-foreground">Fleet</p>
            <p className="text-sm font-semibold">{selectedVehicle.fleet}</p>
          </div>
          <div className="w-px h-8 bg-border mx-2"/>
          <div>
            <p className="text-xs text-muted-foreground">Year</p>
            <p className="text-sm font-semibold">{selectedVehicle.year}</p>
          </div>
        </div>
      </div>

      {/* Live vitals row */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <GaugeBar label="Speed"    value={pin.speed}          max={120}   unit="km/h" warn={90}  crit={110} icon={Activity}    color="bg-indigo-500"/>
        <GaugeBar label="Engine RPM" value={lastSeries?.rpm ?? 0}  max={2500}  unit="rpm"  warn={2000} crit={2300} icon={Gauge}       color="bg-violet-500"/>
        <GaugeBar label="Fuel"     value={lastSeries?.fuel ?? 0} max={100}   unit="%"    warn={20}  crit={10}  icon={Fuel}        color="bg-green-500"/>
        <GaugeBar label="Coolant"  value={lastSeries?.coolant ?? 0} max={120} unit="°C"  warn={95}  crit={105} icon={Thermometer} color="bg-orange-500"/>
        <GaugeBar label="AdBlue"   value={lastSeries?.adblue ?? 0} max={100}  unit="%"   warn={15}  crit={8}   icon={Zap}         color="bg-cyan-500"/>
        <div className="flex flex-col gap-1.5 rounded-xl border bg-card p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500">
              <Route className="h-3.5 w-3.5 text-white"/>
            </div>
            <span className="text-xs font-medium text-muted-foreground">Today's Distance</span>
          </div>
          <p className="text-lg font-bold mt-0.5">{totalDist.toFixed(0)} <span className="text-xs text-muted-foreground">km</span></p>
          <p className="text-[10px] text-muted-foreground">{trips.length} trips completed</p>
        </div>
      </div>

      {/* Charts row 1: Speed + Fuel */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-indigo-500"/>
            <h3 className="text-sm font-semibold">Speed Profile — Today</h3>
            <span className="ml-auto text-xs text-muted-foreground">km/h</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={series}>
              <defs>
                <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08}/>
              <XAxis dataKey="time" tick={{fontSize:9}} interval={7}/>
              <YAxis tick={{fontSize:9}} domain={[0,130]}/>
              <Tooltip contentStyle={{fontSize:11}} formatter={(v:number)=>[`${v} km/h`,"Speed"]}/>
              <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="4 2" label={{value:"Speed Limit",fontSize:9,fill:"#ef4444"}}/>
              <Area type="monotone" dataKey="speed" stroke="#6366f1" fill="url(#speedGrad)" strokeWidth={2}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border bg-card shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Fuel className="h-4 w-4 text-green-500"/>
            <h3 className="text-sm font-semibold">Fuel Level — Today</h3>
            <span className="ml-auto text-[10px] rounded-full px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">⚠ Low fuel alert &lt;20%</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={series}>
              <defs>
                <linearGradient id="fuelGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08}/>
              <XAxis dataKey="time" tick={{fontSize:9}} interval={7}/>
              <YAxis tick={{fontSize:9}} domain={[0,100]}/>
              <Tooltip contentStyle={{fontSize:11}} formatter={(v:number)=>[`${v}%`,"Fuel"]}/>
              <ReferenceLine y={20} stroke="#f59e0b" strokeDasharray="4 2" label={{value:"Low",fontSize:9,fill:"#f59e0b"}}/>
              <Area type="monotone" dataKey="fuel" stroke="#22c55e" fill="url(#fuelGrad)" strokeWidth={2}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2: RPM + Safety score */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border bg-card shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Gauge className="h-4 w-4 text-violet-500"/>
            <h3 className="text-sm font-semibold">Engine RPM — Today</h3>
            <span className="ml-auto text-xs text-muted-foreground">rpm</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08}/>
              <XAxis dataKey="time" tick={{fontSize:9}} interval={7}/>
              <YAxis tick={{fontSize:9}} domain={[0,2800]}/>
              <Tooltip contentStyle={{fontSize:11}} formatter={(v:number)=>[`${v} rpm`,"RPM"]}/>
              <ReferenceLine y={2300} stroke="#ef4444" strokeDasharray="4 2" label={{value:"Over-rev",fontSize:9,fill:"#ef4444"}}/>
              <Line type="monotone" dataKey="rpm" stroke="#8b5cf6" strokeWidth={1.5} dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border bg-card shadow-sm p-4 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 self-start">
            <Shield className="h-4 w-4 text-emerald-500"/>
            <h3 className="text-sm font-semibold">Driver Safety Score</h3>
          </div>
          <ScoreRing score={score}/>
          <div className="flex gap-3 text-center">
            <div>
              <p className="text-lg font-bold text-red-500">{exceptions.filter(e=>e.rule.name==="Speeding"||e.rule.name==="Harsh Braking").length}</p>
              <p className="text-[10px] text-muted-foreground">Critical</p>
            </div>
            <div>
              <p className="text-lg font-bold text-amber-500">{exceptions.filter(e=>e.rule.name==="Harsh Cornering"||e.rule.name==="Seat Belt").length}</p>
              <p className="text-[10px] text-muted-foreground">Warnings</p>
            </div>
            <div>
              <p className="text-lg font-bold text-blue-500">{exceptions.filter(e=>e.rule.name==="Idling > 10 min").length}</p>
              <p className="text-[10px] text-muted-foreground">Info</p>
            </div>
          </div>
        </div>
      </div>

      {/* Exception breakdown */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-4 w-4 text-red-500"/>
            <h3 className="text-sm font-semibold">Exception Events by Type</h3>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={safetyData} layout="vertical" margin={{left:6}}>
              <XAxis type="number" tick={{fontSize:9}}/>
              <YAxis dataKey="name" type="category" tick={{fontSize:9}} width={100}/>
              <Tooltip contentStyle={{fontSize:11}} formatter={(v:number)=>[v,"Events"]}/>
              <Bar dataKey="value" radius={[0,4,4,0]}>
                {safetyData.map((d,i)=><Cell key={i} fill={d.fill}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Trip timeline */}
        <div className="rounded-xl border bg-card shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-indigo-500"/>
            <h3 className="text-sm font-semibold">Today's Trip Timeline</h3>
          </div>
          <div className="relative">
            <div className="absolute left-3 top-0 bottom-0 w-px bg-muted"/>
            <div className="flex flex-col gap-3 pl-8">
              {trips.map((t,i) => (
                <div key={t.id} className="relative">
                  <div className="absolute -left-5 top-1 h-3 w-3 rounded-full border-2 border-background bg-indigo-500"/>
                  <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2">
                    <div>
                      <p className="text-xs font-semibold">Trip {i+1}</p>
                      <p className="text-[10px] text-muted-foreground">{t.start} → {t.stop}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{(t.distance/1000).toFixed(1)} km</p>
                      <p className={cn("text-[10px]", t.maxSpeed > 90 ? "text-red-500" : "text-muted-foreground")}>
                        max {t.maxSpeed.toFixed(0)} km/h
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {trips.length === 0 && (
                <p className="text-sm text-muted-foreground py-4">No trips recorded today.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: diagnostic readings */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2.5">
          <BarChart3 className="h-4 w-4 text-muted-foreground"/>
          <h3 className="text-sm font-semibold">Live Diagnostic Snapshot</h3>
        </div>
        <div className="grid gap-0 divide-y">
          {MOCK_STATUS.filter(s => s.deviceName === selectedVehicle.plate).map(r => {
            const pct = r.diagnostic.name.includes("Odometer")
              ? Math.min(100, (r.data / 200000) * 100)
              : r.diagnostic.name.includes("RPM")
              ? Math.min(100, (r.data / 2500) * 100)
              : Math.min(100, r.data)
            const isHighRisk = (r.diagnostic.name.includes("Fuel") && r.data < 20) ||
              (r.diagnostic.name.includes("AdBlue") && r.data < 15) ||
              (r.diagnostic.name.includes("Coolant") && r.data > 95)
            return (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                {isHighRisk && <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500"/>}
                {!isHighRisk && <span className="h-3.5 w-3.5 shrink-0"/>}
                <span className="w-44 text-xs text-muted-foreground">{r.diagnostic.name}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", isHighRisk ? "bg-red-500" : "bg-indigo-500")}
                    style={{width:`${pct}%`}}
                  />
                </div>
                <span className={cn("w-20 text-right text-xs font-bold", isHighRisk && "text-red-500")}>
                  {r.data.toLocaleString("en-GB",{maximumFractionDigits:1})}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

const todayStart = () => {
  const d = new Date(); d.setHours(0,0,0,0)
  return d.toISOString().slice(0,16)
}
const nowStr = () => new Date().toISOString().slice(0,16)

const TABS = ["Overview","Fleets","Vehicles","Analytics"] as const
type Tab = typeof TABS[number]

export default function FleetManagementPage() {
  const [tab, setTab]               = React.useState<Tab>("Overview")
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [fromDate, setFromDate]     = React.useState(todayStart())
  const [toDate, setToDate]         = React.useState(nowStr())
  const [autoRefresh, setAutoRefresh] = React.useState(false)

  React.useEffect(() => {
    if(!autoRefresh) return
    const id = setInterval(() => setToDate(nowStr()), 30000)
    return () => clearInterval(id)
  }, [autoRefresh])

  return (
    <div className="flex flex-1 flex-col">
      <ControlBar
        selectedIds={selectedIds} setSelectedIds={setSelectedIds}
        fromDate={fromDate} setFromDate={setFromDate}
        toDate={toDate}     setToDate={setToDate}
        autoRefresh={autoRefresh} setAutoRefresh={setAutoRefresh}
      />

      <div className="flex flex-1 flex-col gap-4 p-4 pt-4 md:p-6 lg:p-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 md:text-3xl">
            <Layers className="h-7 w-7 text-indigo-500"/> Fleet Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live telematics, diagnostics and fleet administration — powered by MyGeotab API
          </p>
        </div>

        <div className="flex gap-1 border-b">
          {TABS.map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
                tab===t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              )}>{t}</button>
          ))}
        </div>

        {tab==="Overview"   && <OverviewTab selectedIds={selectedIds}/>}
        {tab==="Fleets"     && <FleetsTab/>}
        {tab==="Vehicles"   && <VehiclesTab/>}
        {tab==="Analytics"  && <VehicleAnalyticsTab/>}
      </div>
    </div>
  )
}
