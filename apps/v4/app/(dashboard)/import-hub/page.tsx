"use client"
import { PageHeader } from "@/components/page-header"
import * as React from "react"
import {
  CloudDownload, Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle2,
  XCircle, Globe, Puzzle, FileSpreadsheet, UploadCloud, Download,
  Key, Webhook, ChevronRight, Clock, Settings, Plus, X,
  ZapOff, Zap, Eye, RotateCcw, Search, Filter, ExternalLink,
} from "lucide-react"

// ─── DATA ─────────────────────────────────────────────────────────────────────

type Method = "api" | "extension" | "manual"
type ConnStatus = "connected" | "disconnected" | "syncing" | "error"

type Vendor = {
  id: string
  name: string
  category: string
  logoColor: string
  logoText: string
  status: ConnStatus
  methods: Method[]
  lastSync?: string
  tripsToday?: number
  primaryMethod: Method
  apiFields?: { label: string; placeholder: string; type?: string }[]
  csvTemplate?: string
  extensionId?: string
  autoSyncMins?: number
  notes?: string
}

const vendors: Vendor[] = [
  {
    id: "amazon",
    name: "Amazon Relay",
    category: "Load Board",
    logoColor: "bg-orange-500",
    logoText: "AR",
    status: "connected",
    methods: ["extension", "api", "manual"],
    lastSync: "2026-03-12 16:38",
    tripsToday: 14,
    primaryMethod: "extension",
    apiFields: [
      { label: "Carrier ID", placeholder: "AMZN-CARRIER-XXXXX" },
      { label: "API Key", placeholder: "amzn_relay_api_key_…", type: "password" },
      { label: "Account Region", placeholder: "eu-west-1" },
    ],
    extensionId: "amazon-relay-sync",
    autoSyncMins: 5,
    csvTemplate: "amazon_relay_template.csv",
    notes: "Chrome Extension recommended for load board auto-refresh and booking.",
  },
  {
    id: "dhl",
    name: "DHL Express",
    category: "Parcel Carrier",
    logoColor: "bg-yellow-500",
    logoText: "DHL",
    status: "connected",
    methods: ["api", "manual"],
    lastSync: "2026-03-12 16:21",
    tripsToday: 47,
    primaryMethod: "api",
    apiFields: [
      { label: "Client ID", placeholder: "dhl_client_id_…" },
      { label: "Client Secret", placeholder: "dhl_secret_…", type: "password" },
      { label: "Account Number", placeholder: "123456789" },
      { label: "Webhook URL", placeholder: "https://your.app/webhooks/dhl" },
    ],
    csvTemplate: "dhl_manifest_template.csv",
    notes: "Consignment manifest export maps directly. Webhook push available on Enterprise tier.",
  },
  {
    id: "dpd",
    name: "DPD UK",
    category: "Parcel Carrier",
    logoColor: "bg-red-600",
    logoText: "DPD",
    status: "error",
    methods: ["api", "manual"],
    lastSync: "2026-03-12 14:05",
    tripsToday: 0,
    primaryMethod: "api",
    apiFields: [
      { label: "GeoClient User", placeholder: "dpd_geo_user" },
      { label: "GeoClient Pass", placeholder: "…", type: "password" },
      { label: "Account Number", placeholder: "DPD-ACC-XXXXX" },
    ],
    csvTemplate: "dpd_route_template.csv",
    notes: "API token expired. Reconnect to resume automatic route card pull.",
  },
  {
    id: "fedex",
    name: "FedEx Freight",
    category: "Parcel Carrier",
    logoColor: "bg-purple-600",
    logoText: "FX",
    status: "disconnected",
    methods: ["api", "manual"],
    primaryMethod: "api",
    apiFields: [
      { label: "API Key", placeholder: "fdx_key_…", type: "password" },
      { label: "Secret Key", placeholder: "fdx_secret_…", type: "password" },
      { label: "Account Number", placeholder: "XXXX-XXXX-XXXX" },
      { label: "Meter Number", placeholder: "1234567" },
    ],
    csvTemplate: "fedex_freight_template.csv",
  },
  {
    id: "tesco",
    name: "Tesco Logistics",
    category: "Retail",
    logoColor: "bg-blue-600",
    logoText: "TS",
    status: "syncing",
    methods: ["manual", "api"],
    lastSync: "2026-03-12 06:00",
    tripsToday: 22,
    primaryMethod: "manual",
    apiFields: [
      { label: "EDI Partner ID", placeholder: "EDI-TES-XXXXX" },
      { label: "SFTP Host", placeholder: "edi.tesco.com" },
      { label: "SFTP Username", placeholder: "partner_user" },
      { label: "SFTP Password", placeholder: "…", type: "password" },
    ],
    csvTemplate: "tesco_route_roster_template.xlsx",
    notes: "Route rosters arrive as Excel weekly. Use the Data Mapper to align column headers before import.",
  },
  {
    id: "asda",
    name: "ASDA Transport",
    category: "Retail",
    logoColor: "bg-green-600",
    logoText: "AS",
    status: "disconnected",
    methods: ["manual"],
    primaryMethod: "manual",
    csvTemplate: "asda_delivery_schedule_template.xlsx",
    notes: "ASDA uses proprietary Excel schedules. Upload weekly roster via manual import.",
  },
  {
    id: "hermes",
    name: "Evri (Hermes)",
    category: "Parcel Carrier",
    logoColor: "bg-pink-500",
    logoText: "EV",
    status: "connected",
    methods: ["api", "extension", "manual"],
    lastSync: "2026-03-12 16:30",
    tripsToday: 31,
    primaryMethod: "api",
    apiFields: [
      { label: "Client ID", placeholder: "evri_client_…" },
      { label: "Client Secret", placeholder: "evri_secret_…", type: "password" },
    ],
    csvTemplate: "evri_manifest_template.csv",
  },
  {
    id: "royal-mail",
    name: "Royal Mail OBA",
    category: "Postal",
    logoColor: "bg-red-500",
    logoText: "RM",
    status: "connected",
    methods: ["api", "manual"],
    lastSync: "2026-03-12 15:58",
    tripsToday: 8,
    primaryMethod: "api",
    apiFields: [
      { label: "OBA Username", placeholder: "oba_user@carrier.co.uk" },
      { label: "OBA Password", placeholder: "…", type: "password" },
      { label: "Account Number", placeholder: "RMOBA-XXXXX" },
    ],
    csvTemplate: "royalmail_oba_template.csv",
  },
  {
    id: "xpo",
    name: "XPO Logistics",
    category: "Freight",
    logoColor: "bg-sky-600",
    logoText: "XPO",
    status: "disconnected",
    methods: ["api", "manual"],
    primaryMethod: "api",
    apiFields: [
      { label: "API Username", placeholder: "xpo_api_user" },
      { label: "API Token", placeholder: "xpo_token_…", type: "password" },
    ],
    csvTemplate: "xpo_shipment_template.csv",
  },
  {
    id: "palletways",
    name: "Palletways",
    category: "Pallet Network",
    logoColor: "bg-amber-600",
    logoText: "PW",
    status: "connected",
    methods: ["api", "manual"],
    lastSync: "2026-03-12 16:00",
    tripsToday: 6,
    primaryMethod: "api",
    apiFields: [
      { label: "Depot Code", placeholder: "PW-DEP-0142" },
      { label: "API Key", placeholder: "pw_api_…", type: "password" },
    ],
    csvTemplate: "palletways_collection_template.csv",
  },
  {
    id: "nfw",
    name: "NFT Transport",
    category: "Temperature",
    logoColor: "bg-cyan-600",
    logoText: "NFT",
    status: "disconnected",
    methods: ["manual"],
    primaryMethod: "manual",
    csvTemplate: "nft_cold_chain_template.xlsx",
    notes: "Temperature-controlled. Manual Excel upload of delivery schedules.",
  },
  {
    id: "custom",
    name: "Custom / Generic",
    category: "Generic",
    logoColor: "bg-gray-500",
    logoText: "CSV",
    status: "disconnected",
    methods: ["manual"],
    primaryMethod: "manual",
    csvTemplate: "generic_trips_template.csv",
    notes: "Upload any CSV or Excel file and use the Data Mapper to align columns.",
  },
]

// Activity log
type LogEntry = {
  id: string; ts: string; vendor: string; method: Method
  trips: number; status: "success"|"warning"|"failed"
  detail?: string; rows?: { row: number; field: string; issue: string; value: string }[]
}

const activityLog: LogEntry[] = [
  { id:"l01", ts:"16:38:04", vendor:"Amazon Relay",   method:"extension", trips:3,  status:"success"                                                                    },
  { id:"l02", ts:"16:30:11", vendor:"Evri (Hermes)",  method:"api",       trips:12, status:"success"                                                                    },
  { id:"l03", ts:"16:21:54", vendor:"DHL Express",    method:"api",       trips:24, status:"success"                                                                    },
  { id:"l04", ts:"16:00:00", vendor:"Palletways",     method:"api",       trips:6,  status:"success"                                                                    },
  { id:"l05", ts:"15:58:12", vendor:"Royal Mail OBA", method:"api",       trips:8,  status:"success"                                                                    },
  { id:"l06", ts:"14:05:33", vendor:"DPD UK",         method:"api",       trips:0,  status:"failed",  detail:"Authentication error: token expired (HTTP 401). Reconnect DPD API credentials." },
  { id:"l07", ts:"12:30:00", vendor:"Amazon Relay",   method:"extension", trips:5,  status:"success"                                                                    },
  { id:"l08", ts:"10:15:20", vendor:"Tesco Logistics",method:"manual",    trips:0,  status:"warning", detail:"3 rows missing postcode",
    rows:[
      { row:12, field:"Postcode", issue:"Missing postcode", value:"" },
      { row:17, field:"Postcode", issue:"Invalid format",   value:"TF1" },
      { row:34, field:"Store #",  issue:"Unknown store ID", value:"9999" },
    ]
  },
  { id:"l09", ts:"08:44:01", vendor:"Evri (Hermes)",  method:"api",       trips:19, status:"success"                                                                    },
  { id:"l10", ts:"06:00:00", vendor:"Tesco Logistics",method:"manual",    trips:22, status:"success"                                                                    },
]

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const statusCfg: Record<ConnStatus, { dot: string; badge: string; label: string }> = {
  connected:    { dot:"bg-green-500",  badge:"bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",  label:"Connected"    },
  disconnected: { dot:"bg-gray-400",   badge:"bg-gray-100 text-foreground",                                             label:"Disconnected"  },
  syncing:      { dot:"bg-amber-400 animate-pulse", badge:"bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", label:"Syncing…" },
  error:        { dot:"bg-red-500",    badge:"bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",          label:"Error"        },
}

const methodIcon: Record<Method, React.ReactNode> = {
  api:       <Globe className="h-3.5 w-3.5" />,
  extension: <Puzzle className="h-3.5 w-3.5" />,
  manual:    <FileSpreadsheet className="h-3.5 w-3.5" />,
}
const methodLabel: Record<Method, string> = {
  api: "API", extension: "Extension", manual: "Manual Upload",
}

// ─── MODALS ───────────────────────────────────────────────────────────────────

function APIModal({ vendor, onClose }: { vendor: Vendor; onClose: () => void }) {
  const [tested, setTested] = React.useState<null|"ok"|"fail">(null)
  const [autoSync, setAutoSync] = React.useState(true)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <div className={`h-8 w-8 rounded-lg ${vendor.logoColor} flex items-center justify-center text-white text-[10px] font-black`}>{vendor.logoText}</div>
            {vendor.name} — API Setup
          </h3>
          <button onClick={onClose} className="rounded-lg border p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex flex-col gap-3">
          {vendor.apiFields?.map(f => (
            <div key={f.label}>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{f.label}</label>
              <input type={f.type ?? "text"} placeholder={f.placeholder}
                className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
          ))}

          {/* Webhook hint */}
          {vendor.apiFields?.some(f => f.label.includes("Webhook")) && (
            <div className="flex items-start gap-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 p-3 text-xs text-indigo-700 dark:text-indigo-400">
              <Webhook className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>Copy this webhook URL into your {vendor.name} developer portal to receive real-time push updates.</span>
            </div>
          )}

          {/* Auto-sync toggle */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium">Auto-import enabled</p>
              <p className="text-xs text-muted-foreground">Pull data every 15 minutes</p>
            </div>
            <button onClick={() => setAutoSync(v => !v)}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${autoSync ? "bg-indigo-500" : "bg-muted border"}`}>
              <span className={`inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform ${autoSync ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>

          {/* Test result */}
          {tested && (
            <div className={`flex items-center gap-2 rounded-lg p-3 text-sm font-medium ${tested === "ok" ? "bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400" : "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400"}`}>
              {tested === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {tested === "ok" ? "Connection successful — credentials valid." : "Connection failed — check credentials and retry."}
            </div>
          )}
        </div>

        <div className="mt-5 flex gap-2">
          <button onClick={() => setTested(Math.random() > 0.3 ? "ok" : "fail")}
            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border text-sm hover:bg-muted">
            <Zap className="h-3.5 w-3.5" /> Test Connection
          </button>
          <button onClick={onClose}
            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            Save & Connect
          </button>
        </div>
      </div>
    </div>
  )
}

function ExtensionModal({ vendor, onClose }: { vendor: Vendor; onClose: () => void }) {
  const [installed] = React.useState(false) // simulate not installed
  const [mins, setMins] = React.useState(vendor.autoSyncMins ?? 5)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Puzzle className="h-5 w-5 text-indigo-500" />
            {vendor.name} — Chrome Extension
          </h3>
          <button onClick={onClose} className="rounded-lg border p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        {!installed ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-900/30">
              <Puzzle className="h-8 w-8 text-indigo-500" />
            </div>
            <p className="font-semibold">Extension Not Detected</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Install the FleetYes Sync extension to automatically pull {vendor.name} load boards and route updates into your dashboard.
            </p>
            <div className="w-full rounded-xl border border-dashed border-indigo-300 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950/20 p-4 text-sm">
              <p className="font-medium text-indigo-800 dark:text-indigo-300 mb-2">📌 Setup Guide</p>
              <ol className="text-left space-y-1 text-xs text-indigo-700 dark:text-indigo-400">
                <li>1. Click "Download Extension" below</li>
                <li>2. Click "Add to Chrome" on the Web Store page</li>
                <li>3. Pin the extension from the Chrome toolbar (puzzle icon)</li>
                <li>4. Return here — status will update automatically</li>
              </ol>
            </div>
            <a href="https://chrome.google.com/webstore" target="_blank" rel="noopener noreferrer"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 text-sm font-semibold text-white hover:bg-indigo-600">
              <ExternalLink className="h-4 w-4" /> Download Extension — Chrome Web Store
            </a>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 rounded-xl border border-green-300 bg-green-50 dark:border-green-900 dark:bg-green-950/20 p-4">
              <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />
              <div>
                <p className="font-semibold text-green-800 dark:text-green-300">Extension Active</p>
                <p className="text-xs text-green-700 dark:text-green-400">Scraping {vendor.name} load board · Responding to FleetYes</p>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Auto-Sync Frequency (minutes)</label>
              <input type="number" min={1} max={60} value={mins} onChange={e => setMins(Number(e.target.value))}
                className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border text-sm hover:bg-muted">Close</button>
          {installed && (
            <button onClick={onClose} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              Save Settings
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function ManualModal({ vendor, onClose }: { vendor: Vendor; onClose: () => void }) {
  const [dragging, setDragging] = React.useState(false)
  const [file, setFile] = React.useState<string|null>(null)
  const isTesco = vendor.id === "tesco" || vendor.id === "asda" || vendor.id === "nfw" || vendor.id === "custom"

  // Data Mapper columns (Tesco-style demo)
  const tescoCols = ["Store #","Pallet Count","Delivery Date","Time Window","Postcode","Reference"]
  const systemCols = ["store_id","pallet_qty","delivery_date","time_window","postcode","reference"]
  const [mapping, setMapping] = React.useState<Record<string,string>>(
    Object.fromEntries(tescoCols.map((c,i) => [c, systemCols[i] ?? ""]))
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-2xl my-4">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-indigo-500" />
            {vendor.name} — Manual Upload
          </h3>
          <button onClick={onClose} className="rounded-lg border p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        {/* Dropzone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); setFile(e.dataTransfer.files[0]?.name ?? null) }}
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer
            ${dragging ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20" : "border-muted-foreground/30 hover:border-indigo-400 hover:bg-muted/30"}`}
          onClick={() => setFile("example_tesco_roster_w11.xlsx")}
        >
          <UploadCloud className={`h-10 w-10 mb-3 ${dragging ? "text-indigo-500" : "text-muted-foreground"}`} />
          {file
            ? <p className="text-sm font-semibold text-green-600">✓ {file}</p>
            : <>
                <p className="text-sm font-semibold">Drag & Drop {vendor.name} Route Sheet</p>
                <p className="text-xs text-muted-foreground mt-1">or click to browse · CSV, XLS, XLSX accepted</p>
              </>
          }
        </div>

        {/* Template download */}
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Not sure of the format?</span>
          <button className="inline-flex items-center gap-1 text-indigo-500 hover:underline">
            <Download className="h-3 w-3" /> Download {vendor.name} template
          </button>
        </div>

        {/* Data Mapper (retail vendors) */}
        {isTesco && file && (
          <div className="mt-5">
            <p className="mb-2 text-sm font-semibold flex items-center gap-2">
              <Settings className="h-4 w-4 text-indigo-500" /> Data Column Mapper
            </p>
            <p className="mb-3 text-xs text-muted-foreground">Map your spreadsheet columns to FleetYes fields. Drag or select below.</p>
            <div className="rounded-xl border overflow-hidden">
              <div className="grid grid-cols-2 border-b bg-muted/40 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <span>Your Column</span><span>FleetYes Field</span>
              </div>
              <div className="divide-y">
                {tescoCols.map(col => (
                  <div key={col} className="grid grid-cols-2 items-center gap-2 px-3 py-2">
                    <span className="text-xs font-mono font-medium">{col}</span>
                    <select value={mapping[col]} onChange={e => setMapping(m => ({ ...m, [col]: e.target.value }))}
                      className="h-7 rounded border bg-background text-xs px-1 outline-none focus:ring-1 focus:ring-ring">
                      <option value="">— skip —</option>
                      {systemCols.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border text-sm hover:bg-muted">Cancel</button>
          <button disabled={!file} onClick={onClose}
            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40">
            <CloudDownload className="h-4 w-4" /> Import {file ? "File" : "—"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── FIX MODAL ────────────────────────────────────────────────────────────────

function FixModal({ entry, onClose }: { entry: LogEntry; onClose: () => void }) {
  const [rows, setRows] = React.useState(entry.rows ?? [])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" /> Review & Fix Import Errors
          </h3>
          <button onClick={onClose} className="rounded-lg border p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Correct the values below and retry the import. Rows with errors were skipped.
        </p>
        <div className="flex flex-col gap-3">
          {rows.map((r, i) => (
            <div key={i} className="rounded-xl border p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 text-[10px] font-bold">Row {r.row}</span>
                <span className="text-xs font-semibold">{r.field}</span>
                <span className="text-xs text-muted-foreground">{r.issue}</span>
              </div>
              <input
                value={rows[i].value}
                onChange={e => setRows(prev => prev.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
                placeholder={`Enter correct ${r.field}…`}
                className="h-8 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          ))}
        </div>
        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border text-sm hover:bg-muted">Cancel</button>
          <button onClick={onClose}
            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            <RotateCcw className="h-4 w-4" /> Fix & Retry Import
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── VENDOR CARD ──────────────────────────────────────────────────────────────

function VendorCard({ vendor, onAPI, onExt, onManual }: {
  vendor: Vendor
  onAPI: () => void; onExt: () => void; onManual: () => void
}) {
  const s = statusCfg[vendor.status]
  return (
    <div className="flex flex-col rounded-xl border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b bg-muted/30 px-4 py-3">
        <div className={`h-9 w-9 shrink-0 rounded-xl ${vendor.logoColor} flex items-center justify-center text-white font-black text-[10px]`}>
          {vendor.logoText}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{vendor.name}</p>
          <p className="text-[10px] text-muted-foreground">{vendor.category}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`h-2 w-2 rounded-full ${s.dot}`} />
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${s.badge}`}>{s.label}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 divide-x border-b text-center">
        <div className="py-2">
          <p className="text-sm font-bold">{vendor.tripsToday ?? "—"}</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Trips today</p>
        </div>
        <div className="py-2">
          <p className="text-xs font-medium truncate px-1">{vendor.lastSync ? vendor.lastSync.slice(11) : "Never"}</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Last sync</p>
        </div>
      </div>

      {/* Methods */}
      <div className="flex flex-col gap-2 p-3 flex-1">
        {vendor.methods.map(m => (
          <button
            key={m}
            onClick={m === "api" ? onAPI : m === "extension" ? onExt : onManual}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors text-left
              ${vendor.primaryMethod === m ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/20 dark:text-indigo-400" : "bg-background hover:bg-muted text-muted-foreground"}`}
          >
            {methodIcon[m]}
            <span className="flex-1">{methodLabel[m]}</span>
            {vendor.primaryMethod === m && <span className="text-[9px] uppercase tracking-wide opacity-60">Primary</span>}
            <ChevronRight className="h-3 w-3 opacity-50" />
          </button>
        ))}

        {vendor.notes && (
          <p className="mt-1 text-[10px] text-muted-foreground leading-relaxed">{vendor.notes}</p>
        )}
      </div>
    </div>
  )
}

// ─── ACTIVITY LOG ─────────────────────────────────────────────────────────────

function ActivityLog() {
  const [fixEntry, setFixEntry] = React.useState<LogEntry|null>(null)
  const [filter, setFilter] = React.useState<"all"|Method|"failed">("all")

  const filtered = activityLog.filter(e =>
    filter === "all" ? true :
    filter === "failed" ? e.status === "failed" || e.status === "warning" :
    e.method === filter
  )

  const logStatus = {
    success: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    failed:  "bg-red-100   text-red-700   dark:bg-red-900/30   dark:text-red-400",
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Universal Activity Log</h3>
        </div>
        <div className="flex gap-1.5">
          {(["all","api","extension","manual","failed"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-lg px-2.5 py-1 text-[10px] font-medium capitalize transition-colors
                ${filter === f ? "bg-primary text-primary-foreground" : "border bg-background hover:bg-muted text-muted-foreground"}`}
            >{f}</button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[700px]">
          <thead>
            <tr className="border-b bg-muted/20">
              {["Time","Provider","Method","Trips Imported","Status","Action"].map(h => (
                <th key={h} className="px-4 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-2.5 font-mono text-muted-foreground">{e.ts}</td>
                <td className="px-4 py-2.5 font-medium">{e.vendor}</td>
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5">
                    {methodIcon[e.method]} {methodLabel[e.method]}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-bold">{e.trips > 0 ? e.trips : "—"}</td>
                <td className="px-4 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 font-bold capitalize ${logStatus[e.status]}`}>{e.status}</span>
                </td>
                <td className="px-4 py-2.5">
                  {e.status === "failed" && (
                    <button className="inline-flex h-7 items-center gap-1 rounded-lg border px-2 hover:bg-muted text-muted-foreground">
                      <RotateCcw className="h-3 w-3" /> Retry
                    </button>
                  )}
                  {e.status === "warning" && e.rows && (
                    <button onClick={() => setFixEntry(e)}
                      className="inline-flex h-7 items-center gap-1 rounded-lg bg-amber-500 px-2 text-white font-medium hover:bg-amber-600">
                      <Eye className="h-3 w-3" /> Review & Fix
                    </button>
                  )}
                  {e.status === "success" && (
                    <button className="text-indigo-500 hover:underline text-[10px]">View</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {fixEntry && <FixModal entry={fixEntry} onClose={() => setFixEntry(null)} />}
    </div>
  )
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function ImportHubPage() {
  const [apiVendor,  setApiVendor]  = React.useState<Vendor|null>(null)
  const [extVendor,  setExtVendor]  = React.useState<Vendor|null>(null)
  const [manVendor,  setManVendor]  = React.useState<Vendor|null>(null)
  const [search,     setSearch]     = React.useState("")
  const [catFilter,  setCatFilter]  = React.useState("All")

  const cats = ["All", ...Array.from(new Set(vendors.map(v => v.category)))]
  const filtered = vendors.filter(v => {
    const q = search.toLowerCase()
    const matchQ   = !q || v.name.toLowerCase().includes(q)
    const matchCat = catFilter === "All" || v.category === catFilter
    return matchQ && matchCat
  })

  const connected    = vendors.filter(v => v.status === "connected").length
  const tripsToday   = vendors.reduce((a, v) => a + (v.tripsToday ?? 0), 0)
  const errors       = vendors.filter(v => v.status === "error").length
  const syncingNow   = vendors.filter(v => v.status === "syncing").length

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8 lg:p-10">

      {/* Page header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <PageHeader pageKey="importHub" />
        </div>
        <button className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 self-start sm:self-auto">
          <Plus className="h-4 w-4" /> Add Provider
        </button>
      </div>

      {/* Global sync status bar */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500">
            <CheckCircle2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold">{tripsToday}</p>
            <p className="text-xs font-medium text-muted-foreground">Trips imported today</p>
            <p className="text-[10px] text-muted-foreground">across all providers</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500">
            <Wifi className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold">{connected}</p>
            <p className="text-xs font-medium text-muted-foreground">Active connections</p>
            <p className="text-[10px] text-muted-foreground">{syncingNow} syncing right now</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${errors > 0 ? "bg-red-500" : "bg-green-500"}`}>
            {errors > 0 ? <WifiOff className="h-5 w-5 text-white" /> : <CheckCircle2 className="h-5 w-5 text-white" />}
          </div>
          <div>
            <p className="text-2xl font-bold">{errors}</p>
            <p className="text-xs font-medium text-muted-foreground">Sync failures</p>
            <p className="text-[10px] text-muted-foreground">{errors > 0 ? "Needs attention" : "All systems go"}</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500">
            <RefreshCw className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold">{vendors.length}</p>
            <p className="text-xs font-medium text-muted-foreground">Providers configured</p>
            <p className="text-[10px] text-muted-foreground">{vendors.filter(v=>v.status==="disconnected").length} not yet connected</p>
          </div>
        </div>
      </div>

      {/* Critical error banner */}
      {errors > 0 && (
        <div className="rounded-xl border border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/20 p-4 flex items-center gap-3">
          <XCircle className="h-5 w-5 shrink-0 text-red-500" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">
              {errors} provider{errors > 1 ? "s require" : " requires"} immediate attention
            </p>
            <p className="text-xs text-red-700 dark:text-red-400">
              {vendors.filter(v => v.status === "error").map(v => v.name).join(", ")} — route data not being imported
            </p>
          </div>
          <button onClick={() => setApiVendor(vendors.find(v => v.status === "error") ?? null)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-red-500 px-3 text-xs font-medium text-white hover:bg-red-600 shrink-0">
            <Key className="h-3.5 w-3.5" /> Reconnect
          </button>
        </div>
      )}

      {/* Vendor Gallery */}
      <div>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold text-base">Vendor Integration Gallery</h2>
          <div className="flex flex-wrap items-center gap-2">
            {cats.map(c => (
              <button key={c} onClick={() => setCatFilter(c)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors
                  ${catFilter === c ? "bg-primary text-primary-foreground" : "border bg-background hover:bg-muted text-muted-foreground"}`}
              >{c}</button>
            ))}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search providers…"
                className="h-8 rounded-lg border bg-background pl-8 pr-3 text-xs outline-none focus:ring-2 focus:ring-ring w-40" />
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(v => (
            <VendorCard
              key={v.id}
              vendor={v}
              onAPI={() => setApiVendor(v)}
              onExt={() => setExtVendor(v)}
              onManual={() => setManVendor(v)}
            />
          ))}
        </div>
      </div>

      {/* Activity Log */}
      <ActivityLog />

      {/* Modals */}
      {apiVendor && <APIModal vendor={apiVendor} onClose={() => setApiVendor(null)} />}
      {extVendor && <ExtensionModal vendor={extVendor} onClose={() => setExtVendor(null)} />}
      {manVendor && <ManualModal vendor={manVendor} onClose={() => setManVendor(null)} />}
    </div>
  )
}
