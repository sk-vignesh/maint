"use client"

import { PageHeader } from "@/components/page-header"
import * as React from "react"
import {
  Search, RefreshCw, X, Loader2, AlertCircle, Upload, CheckCircle2,
  XCircle, FileText, Eye, ImageIcon, BarChart2, Filter,
} from "lucide-react"
import { useLang } from "@/components/lang-context"
import {
  listTollReceipts, uploadTollFile, importTollImage, importTollZip,
  TOLL_RECEIPT_STATUSES,
  type TollReceiptImage,
} from "@/lib/toll-receipts-api"
import { listDrivers, type Driver } from "@/lib/drivers-api"

import { AgGridReact } from "ag-grid-react"
import {
  type ColDef, type ICellRendererParams,
  ModuleRegistry, AllCommunityModule,
  themeQuartz,
} from "ag-grid-community"

ModuleRegistry.registerModules([AllCommunityModule])

// ─── AG Grid themes (mirrors trips page exactly) ──────────────────────────────

const baseParams = {
  fontFamily: "var(--font-sans, 'Montserrat', 'Inter', system-ui, sans-serif)",
  fontSize: 13,
  rowHeight: 39,
  headerHeight: 38,
  backgroundColor: "var(--background, #ffffff)",
  foregroundColor: "var(--foreground, #1a1a1a)",
  headerBackgroundColor: "var(--muted, #f5f5f5)",
  headerTextColor: "var(--muted-foreground, #666666)",
  borderColor: "var(--border, #e5e7eb)",
  rowBorder: false,
  wrapperBorder: false,
  headerRowBorder: false,
  columnBorder: false,
  cellHorizontalPaddingScale: 1.1,
  rowVerticalPaddingScale: 1,
  selectedRowBackgroundColor: "var(--accent, #f0f0f0)",
  gridSize: 5,
  scrollbarWidth: 6,
}

const lightTheme = themeQuartz.withParams({
  ...baseParams,
  backgroundColor: "#ffffff",
  foregroundColor: "#1f2933",
  headerBackgroundColor: "#f9fafb",
  headerTextColor: "#39485d",
  borderColor: "#eff0f1",
  rowHoverColor: "#f5f7fb",
  selectedRowBackgroundColor: "#edf2ff",
})

const darkTheme = themeQuartz.withParams({
  ...baseParams,
  backgroundColor: "#141414",
  foregroundColor: "#e5e5e5",
  headerBackgroundColor: "#1e2531",
  headerTextColor: "#c9d0da",
  borderColor: "#2a2a2a",
  rowHoverColor: "#1f2937",
  selectedRowBackgroundColor: "#1e3a5f",
})

// ─── Status styles ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  pending:   { bg: "bg-amber-50 dark:bg-amber-900/20",   border: "border-amber-300/70 dark:border-amber-600/40",   text: "text-amber-800 dark:text-amber-300",   dot: "bg-amber-500" },
  processed: { bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-300/70 dark:border-emerald-600/40", text: "text-emerald-800 dark:text-emerald-300", dot: "bg-emerald-500" },
  failed:    { bg: "bg-red-50 dark:bg-red-900/20",       border: "border-red-300/70 dark:border-red-600/40",       text: "text-red-800 dark:text-red-300",       dot: "bg-red-500" },
  duplicate: { bg: "bg-slate-50 dark:bg-slate-900/20",   border: "border-slate-300/70 dark:border-slate-600/40",   text: "text-slate-700 dark:text-slate-300",   dot: "bg-slate-400" },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso?: string | null) {
  if (!iso) return "—"
  const d = new Date(iso)
  const day   = d.getDate().toString().padStart(2, "0")
  const month = d.toLocaleString("en-GB", { month: "short" })
  const year  = d.getFullYear().toString().slice(-2)
  const time  = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
  return iso.length > 10 ? `${day} ${month} ${year} ${time}` : `${day} ${month} ${year}`
}

// ─── Status Cell Renderer ─────────────────────────────────────────────────────

function StatusCell({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.pending
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold capitalize ${s.bg} ${s.border} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  )
}

// ─── Receipt Detail Drawer ────────────────────────────────────────────────────

function ReceiptDetailDrawer({ receipt, onClose }: { receipt: TollReceiptImage; onClose: () => void }) {
  const ext = receipt.extracted_data
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col border-l bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-base font-bold">Toll Receipt Detail</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {receipt.driver?.name ?? receipt.driver_name ?? "Unknown driver"} · {fmt(receipt.captured_at ?? receipt.created_at)}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg border p-1.5 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex flex-1 gap-0 overflow-hidden">
          {/* Image panel */}
          <div className="flex w-1/2 flex-col items-center justify-center border-r bg-muted/20 p-4">
            {receipt.file?.url ? (
              <img src={receipt.file.url} alt="Toll Receipt" className="max-h-full max-w-full rounded-lg object-contain shadow" />
            ) : (
              <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                <ImageIcon className="h-12 w-12 opacity-40" />
                <p className="text-sm">No image available</p>
              </div>
            )}
          </div>

          {/* Extracted data panel */}
          <div className="flex w-1/2 flex-col overflow-y-auto">
            <div className="border-b px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">OCR Extracted Data</p>
            </div>
            {ext ? (
              <div className="divide-y">
                {([
                  ["Total Amount", ext.total_amount ? `${ext.currency ?? ""} ${ext.total_amount}` : undefined],
                  ["Date",         ext.parsed_date ?? ext.transaction_date],
                  ["Time",         ext.parsed_time ?? ext.transaction_time],
                  ["Entry Point",  ext.entry_point],
                  ["Exit Point",   ext.exit_point],
                  ["Vehicle Class",ext.vehicle_class],
                  ["VRN",          ext.parsed_vehicle_vrn ?? ext.vehicle_number],
                ] as [string, string | undefined][]).map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between px-4 py-2.5">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <span className="text-right text-xs font-medium">{value ?? "—"}</span>
                  </div>
                ))}
                {ext.raw_text && (
                  <div className="px-4 py-3">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Raw OCR Text</p>
                    <pre className="whitespace-pre-wrap text-[10px] font-mono text-muted-foreground">{ext.raw_text}</pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                No extraction data available
              </div>
            )}
            <div className="border-t px-4 py-3 mt-auto">
              <StatusCell status={receipt.status} />
              {receipt.is_duplicate && (
                <span className="ml-2 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold dark:bg-slate-800">Duplicate</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Upload Wizard ────────────────────────────────────────────────────────────

type UploadMode = "zip" | "image"
type UploadStep = "upload" | "uploading" | "importing" | "done" | "error"

function UploadWizard({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [mode, setMode] = React.useState<UploadMode>("zip")
  const [step, setStep] = React.useState<UploadStep>("upload")
  const [file, setFile] = React.useState<File | null>(null)
  const [result, setResult] = React.useState<Awaited<ReturnType<typeof importTollZip>> | null>(null)
  const [errMsg, setErrMsg] = React.useState("")
  const fileRef = React.useRef<HTMLInputElement>(null)

  const runUpload = async () => {
    if (!file) return
    try {
      setStep("uploading")
      const uploaded = await uploadTollFile(file)
      setStep("importing")
      const res = mode === "zip"
        ? await importTollZip([uploaded.uuid])
        : await importTollImage([uploaded.uuid])
      setResult(res)
      setStep("done")
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : "Upload failed")
      setStep("error")
    }
  }

  const accept = mode === "zip" ? ".zip" : ".jpg,.jpeg,.png,.pdf"

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={step === "upload" ? onClose : undefined} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="font-bold text-base">Upload Toll Receipts</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Upload images or a ZIP batch for OCR processing</p>
          </div>
          <button onClick={onClose} className="rounded-lg border p-1.5 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-5">
          {step === "upload" && (
            <>
              {/* Mode toggle */}
              <div className="flex rounded-lg border bg-muted/30 p-1 gap-1">
                {([["zip", "ZIP Batch"], ["image", "Single Image / PDF"]] as [UploadMode, string][]).map(([m, label]) => (
                  <button key={m} onClick={() => { setMode(m); setFile(null) }}
                    className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${mode === m ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                    {label}
                  </button>
                ))}
              </div>

              <div onClick={() => fileRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/30 py-10 transition-colors hover:border-primary/40 hover:bg-muted/20">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-medium">{file ? file.name : `Click to select ${mode === "zip" ? "ZIP file" : "image or PDF"}`}</p>
                  <p className="text-xs text-muted-foreground">{mode === "zip" ? ".zip" : ".jpg, .png, .pdf"} accepted</p>
                </div>
                {file && <span className="rounded-full bg-green-100 px-3 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">Ready to upload</span>}
              </div>
              <input ref={fileRef} type="file" accept={accept} className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
            </>
          )}

          {(step === "uploading" || step === "importing") && (
            <div className="flex flex-col items-center gap-4 py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">{step === "uploading" ? "Uploading file…" : "Processing receipt…"}</p>
                <p className="text-xs text-muted-foreground mt-1">This may take a moment</p>
              </div>
            </div>
          )}

          {step === "done" && result && (
            <div className="flex flex-col gap-4">
              <div className={`flex items-center gap-3 rounded-xl p-4 ${result.success || result.partial_success ? "bg-green-50 dark:bg-green-950/20" : "bg-amber-50 dark:bg-amber-950/20"}`}>
                {result.success || result.partial_success
                  ? <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
                  : <XCircle className="h-6 w-6 text-amber-500 shrink-0" />}
                <div>
                  <p className={`font-medium ${result.success || result.partial_success ? "text-green-800 dark:text-green-300" : "text-amber-700 dark:text-amber-300"}`}>
                    {result.success ? "Upload complete" : "Upload complete with issues"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{result.inserted_count ?? 0} receipts imported</p>
                </div>
              </div>
            </div>
          )}

          {step === "error" && (
            <div className="flex items-center gap-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-4">
              <XCircle className="h-6 w-6 text-red-500 shrink-0" />
              <div>
                <p className="font-medium text-red-700 dark:text-red-400">Upload failed</p>
                <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">{errMsg}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t p-4">
          {step === "upload" && (
            <>
              <button onClick={onClose} className="flex-1 rounded-lg border px-3 py-2 text-sm text-muted-foreground hover:bg-muted">Cancel</button>
              <button onClick={runUpload} disabled={!file}
                className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                Upload
              </button>
            </>
          )}
          {step === "done" && (
            <button onClick={() => { onDone(); onClose() }}
              className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Done — Refresh List
            </button>
          )}
          {step === "error" && (
            <>
              <button onClick={() => setStep("upload")} className="flex-1 rounded-lg border px-3 py-2 text-sm text-muted-foreground hover:bg-muted">Try Again</button>
              <button onClick={onClose} className="flex-1 rounded-lg border px-3 py-2 text-sm hover:bg-muted">Close</button>
            </>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Filter Drawer ────────────────────────────────────────────────────────────

type Filters = { driver_uuid: string; status: string; start_date: string; end_date: string }
const EMPTY_FILTERS: Filters = { driver_uuid: "", status: "", start_date: "", end_date: "" }

function FilterDrawer({ open, onClose, filters, setFilters, drivers }: {
  open: boolean; onClose: () => void
  filters: Filters; setFilters: (f: Filters) => void
  drivers: Driver[]
}) {
  const [local, setLocal] = React.useState<Filters>(filters)
  const set = <K extends keyof Filters>(k: K, v: string) => setLocal(f => ({ ...f, [k]: v }))
  React.useEffect(() => { setLocal(filters) }, [filters])
  if (!open) return null
  const sel = "h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-72 flex-col border-l bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-bold">Filter Receipts</h2>
          <button onClick={onClose} className="rounded-lg border p-1.5 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Driver</label>
            <select value={local.driver_uuid} onChange={e => set("driver_uuid", e.target.value)} className={sel}>
              <option value="">Any driver</option>
              {drivers.map(d => <option key={d.uuid} value={d.uuid}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Status</label>
            <select value={local.status} onChange={e => set("status", e.target.value)} className={sel}>
              <option value="">Any status</option>
              {TOLL_RECEIPT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Captured from</label>
            <input type="date" value={local.start_date} onChange={e => set("start_date", e.target.value)} className={sel} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Captured to</label>
            <input type="date" value={local.end_date} onChange={e => set("end_date", e.target.value)} className={sel} />
          </div>
        </div>
        <div className="flex gap-2 border-t p-4">
          <button onClick={() => { setLocal(EMPTY_FILTERS); setFilters(EMPTY_FILTERS) }}
            className="flex-1 rounded-lg border px-3 py-2 text-sm text-muted-foreground hover:bg-muted">Clear all</button>
          <button onClick={() => { setFilters(local); onClose() }}
            className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Apply
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TollReceiptsPage() {
  const { t } = useLang()

  // Data
  const [records, setRecords]   = React.useState<TollReceiptImage[]>([])
  const [meta, setMeta]         = React.useState({ total: 0, last_page: 1, current_page: 1 })
  const [loading, setLoading]   = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError]       = React.useState("")
  const [drivers, setDrivers]   = React.useState<Driver[]>([])

  // UI state
  const [filters, setFilters]       = React.useState<Filters>(EMPTY_FILTERS)
  const [page, setPage]             = React.useState(1)
  const [search, setSearch]         = React.useState("")
  const [showSearch, setShowSearch] = React.useState(false)
  const [showCards, setShowCards]   = React.useState(false)
  const [showFilters, setShowFilters] = React.useState(false)
  const [showUpload, setShowUpload] = React.useState(false)
  const [showFilter, setShowFilter] = React.useState(false)
  const [detailRecord, setDetailRecord] = React.useState<TollReceiptImage | null>(null)

  // AG Grid
  const gridRef = React.useRef<AgGridReact<TollReceiptImage>>(null)
  const [isDark, setIsDark] = React.useState(false)

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const sync = () => setIsDark(document.documentElement.classList.contains("dark") || mq.matches)
    sync()
    const obs = new MutationObserver(sync)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => obs.disconnect()
  }, [])

  // Quick search
  React.useEffect(() => {
    gridRef.current?.api?.setGridOption("quickFilterText", search)
  }, [search])

  const fetchData = React.useCallback(async (p = page) => {
    setLoading(true)
    setError("")
    try {
      const res = await listTollReceipts({
        page: p, limit: 50,
        driver_uuid: filters.driver_uuid || undefined,
        status: filters.status || undefined,
        start_date: filters.start_date || undefined,
        end_date: filters.end_date || undefined,
      })
      setRecords(res.expense_receipt_images)
      setMeta({ total: res.meta.total, last_page: res.meta.last_page, current_page: res.meta.current_page })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [page, filters])

  React.useEffect(() => {
    listDrivers({ limit: 999 }).then(r => setDrivers(r.drivers ?? [])).catch(() => {})
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { setPage(1); fetchData(1) }, [filters])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { fetchData(page) }, [page])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData(page)
    setRefreshing(false)
  }

  const activeFilters = Object.values(filters).filter(Boolean).length
  const pendingCount   = records.filter(r => r.status === "pending").length
  const processedCount = records.filter(r => r.status === "processed").length
  const failedCount    = records.filter(r => r.status === "failed").length

  // Column definitions
  const colDefs = React.useMemo<ColDef<TollReceiptImage>[]>(() => [
    {
      headerName: "Driver",
      valueGetter: ({ data }) => data?.driver?.name ?? data?.driver_name ?? "",
      filter: "agTextColumnFilter",
      flex: 1.2,
      minWidth: 140,
      cellRenderer: ({ value }: ICellRendererParams) => (
        <span className="font-medium">{value || <span className="text-muted-foreground">—</span>}</span>
      ),
    },
    {
      headerName: "Captured",
      valueGetter: ({ data }) => data?.captured_at ?? data?.created_at ?? "",
      filter: "agDateColumnFilter",
      width: 148,
      sort: "desc",
      cellRenderer: ({ data }: ICellRendererParams<TollReceiptImage>) => (
        <span className="text-xs text-muted-foreground">{fmt(data?.captured_at ?? data?.created_at)}</span>
      ),
    },
    {
      headerName: "Amount",
      valueGetter: ({ data }) => {
        const ext = data?.extracted_data
        return ext?.total_amount ? `${ext.currency ?? ""} ${ext.total_amount}` : data?.amount ?? ""
      },
      filter: "agTextColumnFilter",
      width: 110,
      cellRenderer: ({ value }: ICellRendererParams) => (
        <span className="font-semibold tabular-nums">{value || <span className="text-muted-foreground">—</span>}</span>
      ),
    },
    {
      headerName: "Entry Point",
      valueGetter: ({ data }) => data?.extracted_data?.entry_point ?? "",
      filter: "agTextColumnFilter",
      flex: 1,
      minWidth: 120,
      cellRenderer: ({ value }: ICellRendererParams) => (
        <span className="text-xs truncate">{value || <span className="text-muted-foreground">—</span>}</span>
      ),
    },
    {
      headerName: "Exit Point",
      valueGetter: ({ data }) => data?.extracted_data?.exit_point ?? "",
      filter: "agTextColumnFilter",
      flex: 1,
      minWidth: 120,
      cellRenderer: ({ value }: ICellRendererParams) => (
        <span className="text-xs truncate">{value || <span className="text-muted-foreground">—</span>}</span>
      ),
    },
    {
      headerName: "Vehicle Class",
      valueGetter: ({ data }) => data?.extracted_data?.vehicle_class ?? "",
      filter: "agTextColumnFilter",
      width: 120,
      cellRenderer: ({ value }: ICellRendererParams) => (
        <span className="text-xs text-muted-foreground">{value || "—"}</span>
      ),
    },
    {
      headerName: "VRN",
      valueGetter: ({ data }) => data?.extracted_data?.parsed_vehicle_vrn ?? data?.extracted_data?.vehicle_number ?? "",
      filter: "agTextColumnFilter",
      width: 110,
      cellRenderer: ({ value }: ICellRendererParams) => (
        <span className="font-mono text-xs">{value || <span className="text-muted-foreground">—</span>}</span>
      ),
    },
    {
      headerName: "Status",
      field: "status",
      filter: "agTextColumnFilter",
      width: 130,
      cellRenderer: ({ value }: ICellRendererParams) => value ? <StatusCell status={value} /> : null,
    },
    {
      headerName: "",
      colId: "_action",
      width: 70,
      sortable: false,
      filter: false,
      cellRenderer: ({ data }: ICellRendererParams<TollReceiptImage>) => data ? (
        <button
          onClick={() => setDetailRecord(data)}
          className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
        >
          <Eye className="h-3 w-3" /> View
        </button>
      ) : null,
    },
  ], [])

  const defaultColDef = React.useMemo<ColDef>(() => ({
    sortable: true,
    resizable: true,
    suppressHeaderMenuButton: !showFilters,
    suppressHeaderFilterButton: !showFilters,
    floatingFilter: false,
  }), [showFilters])

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-hidden px-6 pt-3 pb-2 md:px-8 lg:px-10">

      {/* ── Summary Cards (toggled by Stats button) ─── */}
      {showCards && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total Receipts", value: meta.total,      colour: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20",           alert: false },
            { label: "Pending OCR",    value: pendingCount,    colour: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20",       alert: pendingCount > 0 },
            { label: "Processed",      value: processedCount,  colour: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20", alert: false },
            { label: "Failed",         value: failedCount,     colour: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20",               alert: failedCount > 0 },
          ].map(c => (
            <div key={c.label} className={`relative flex flex-col gap-2 rounded-xl border bg-card px-4 py-3 shadow-sm transition-shadow hover:shadow-md ${c.alert ? "border-amber-300 dark:border-amber-700" : ""}`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">{c.label}</span>
                <span className={`rounded-lg p-1.5 ${c.colour}`}>
                  <BarChart2 className="h-4 w-4" />
                </span>
              </div>
              <p className="text-2xl font-bold tabular-nums leading-none">
                {loading ? <span className="inline-block h-7 w-10 animate-pulse rounded bg-muted" /> : c.value}
              </p>
              {c.alert && <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-amber-500" />}
            </div>
          ))}
        </div>
      )}

      {/* ── Toolbar ─────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">

          {/* Page title */}
          <PageHeader pageKey="tollReceipts" />

          <div className="flex-1" />

          {/* Expanding search */}
          <div className={`flex items-center transition-all duration-200 ${showSearch ? "w-52" : "w-8"}`}>
            {showSearch ? (
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search receipts…"
                  className="h-8 w-full rounded-lg border bg-background pl-8 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <button onClick={() => { setSearch(""); setShowSearch(false) }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button onClick={() => setShowSearch(true)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-background text-muted-foreground hover:bg-muted">
                <Search className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Separator */}
          <span className="h-6 w-px bg-border" />

          {/* Refresh */}
          <button onClick={handleRefresh}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-background text-muted-foreground hover:bg-muted">
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>

          {/* Stats toggle */}
          <button
            onClick={() => setShowCards(v => !v)}
            title="Toggle summary cards"
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${showCards ? "border-primary bg-primary/10 text-primary" : "bg-background text-muted-foreground hover:bg-muted"}`}
          >
            <BarChart2 className="h-3.5 w-3.5" />
          </button>

          {/* Filter columns toggle */}
          <button
            onClick={() => setShowFilters(v => !v)}
            title="Toggle column filters"
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${showFilters ? "border-primary bg-primary/10 text-primary" : "bg-background text-muted-foreground hover:bg-muted"}`}
          >
            <Filter className="h-3.5 w-3.5" />
          </button>

          {/* Separator */}
          <span className="h-6 w-px bg-border" />

          {/* Filter drawer button */}
          <button
            onClick={() => setShowFilter(true)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors ${activeFilters > 0 ? "border-primary bg-primary/10 text-primary" : "bg-background text-muted-foreground hover:bg-muted"}`}
          >
            Filters{activeFilters > 0 ? ` (${activeFilters})` : ""}
          </button>

          {/* Upload */}
          <button onClick={() => setShowUpload(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Upload className="h-3.5 w-3.5" /> Upload
          </button>
        </div>
      </div>

      {/* ── Error banner ─────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* ── AG Grid ──────────────────────────────────── */}
      <div className="relative flex-1 overflow-hidden rounded-xl border bg-card shadow-sm">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {!loading && records.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-16">
            <FileText className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No toll receipts found</p>
            <p className="text-xs text-muted-foreground">Receipts sync from the driver app, or upload images above</p>
          </div>
        ) : (
          <AgGridReact<TollReceiptImage>
            ref={gridRef}
            theme={isDark ? darkTheme : lightTheme}
            rowData={records}
            columnDefs={colDefs}
            defaultColDef={defaultColDef}
            rowSelection={{ mode: "multiRow", checkboxes: false }}
            suppressRowClickSelection
            animateRows
            className="h-full w-full"
          />
        )}
      </div>

      {/* ── Pagination ───────────────────────────────── */}
      {meta.last_page > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {meta.current_page} of {meta.last_page} · {meta.total} receipts
          </p>
          <div className="flex gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="inline-flex h-8 items-center gap-1 rounded-lg border bg-background px-3 text-xs text-muted-foreground hover:bg-muted disabled:opacity-40"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage(p => Math.min(meta.last_page, p + 1))} disabled={page === meta.last_page}
              className="inline-flex h-8 items-center gap-1 rounded-lg border bg-background px-3 text-xs text-muted-foreground hover:bg-muted disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* ── Drawers ──────────────────────────────────── */}
      {detailRecord && <ReceiptDetailDrawer receipt={detailRecord} onClose={() => setDetailRecord(null)} />}
      {showUpload && <UploadWizard onClose={() => setShowUpload(false)} onDone={() => fetchData(1)} />}
      <FilterDrawer open={showFilter} onClose={() => setShowFilter(false)} filters={filters} setFilters={setFilters} drivers={drivers} />
    </div>
  )
}
