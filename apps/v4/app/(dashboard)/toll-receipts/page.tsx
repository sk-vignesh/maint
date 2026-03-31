"use client"

import { PageHeader } from "@/components/page-header"
import * as React from "react"
import {
  RefreshCw, X, Loader2, AlertCircle,
  Upload, CheckCircle2, XCircle, FileText,
  ChevronLeft, ChevronRight, Filter, Eye, ImageIcon,
} from "lucide-react"
import { useLang } from "@/components/lang-context"
import {
  listTollReceipts, uploadTollFile, importTollImage, importTollZip,
  TOLL_RECEIPT_STATUSES,
  type TollReceiptImage,
} from "@/lib/toll-receipts-api"
import { listDrivers, type Driver } from "@/lib/drivers-api"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso?: string | null) {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })
    + " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
}

const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  processed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  failed:    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  duplicate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
}

// ─── Receipt Detail Modal ─────────────────────────────────────────────────────

function ReceiptDetailModal({ receipt, onClose }: { receipt: TollReceiptImage; onClose: () => void }) {
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
                {[
                  ["Total Amount", ext.total_amount ? `${ext.currency ?? ""} ${ext.total_amount}` : undefined],
                  ["Date", ext.parsed_date ?? ext.transaction_date],
                  ["Time", ext.parsed_time ?? ext.transaction_time],
                  ["Entry Point", ext.entry_point],
                  ["Exit Point", ext.exit_point],
                  ["Vehicle Class", ext.vehicle_class],
                  ["Vehicle VRN", ext.parsed_vehicle_vrn ?? ext.vehicle_number],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex items-start justify-between px-4 py-2.5">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <span className="text-right text-xs font-medium">{(value as string) ?? "—"}</span>
                  </div>
                ))}
                {ext.raw_text && (
                  <div className="px-4 py-3">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Raw OCR Text</p>
                    <p className="whitespace-pre-wrap text-[10px] font-mono text-muted-foreground">{ext.raw_text}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                No extraction data available
              </div>
            )}
            <div className="border-t px-4 py-3 mt-auto">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${STATUS_STYLES[receipt.status] ?? ""}`}>{receipt.status}</span>
                {receipt.is_duplicate && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold dark:bg-slate-800">Duplicate</span>}
              </div>
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
            <h2 className="text-base font-bold">Upload Toll Receipts</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Upload images or a ZIP batch</p>
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
              <p className="font-medium">{step === "uploading" ? "Uploading file…" : "Processing receipt…"}</p>
            </div>
          )}

          {step === "done" && result && (
            <div className="flex flex-col gap-4">
              <div className={`flex items-center gap-3 rounded-xl p-4 ${result.success || result.partial_success ? "bg-green-50 dark:bg-green-950/20" : "bg-amber-50 dark:bg-amber-950/20"}`}>
                {result.success || result.partial_success ? <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" /> : <XCircle className="h-6 w-6 text-amber-500 shrink-0" />}
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
            <div className="flex items-center gap-3 rounded-xl bg-red-50 dark:bg-red-950/20 p-4">
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
              <button onClick={runUpload} disabled={!file} className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">Upload</button>
            </>
          )}
          {step === "done" && <button onClick={() => { onDone(); onClose() }} className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Done — Refresh List</button>}
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

// ─── Filter Panel ─────────────────────────────────────────────────────────────

type Filters = { driver_uuid: string; status: string; start_date: string; end_date: string }
const EMPTY_FILTERS: Filters = { driver_uuid: "", status: "", start_date: "", end_date: "" }

function FilterPanel({ open, onClose, filters, setFilters, drivers }: {
  open: boolean; onClose: () => void
  filters: Filters; setFilters: (f: Filters) => void
  drivers: Driver[]
}) {
  const [local, setLocal] = React.useState<Filters>(filters)
  const set = <K extends keyof Filters>(k: K, v: string) => setLocal(f => ({ ...f, [k]: v }))
  React.useEffect(() => { setLocal(filters) }, [filters])
  const active = Object.values(filters).filter(Boolean).length
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
          <button onClick={() => { setLocal(EMPTY_FILTERS); setFilters(EMPTY_FILTERS) }} className="flex-1 rounded-lg border px-3 py-2 text-sm text-muted-foreground hover:bg-muted">Clear all</button>
          <button onClick={() => { setFilters(local); onClose() }} className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Apply{active > 0 ? ` (${active})` : ""}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TollReceiptsPage() {
  const { t } = useLang()

  const [records, setRecords] = React.useState<TollReceiptImage[]>([])
  const [meta, setMeta] = React.useState({ total: 0, last_page: 1, current_page: 1 })
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")

  const [filters, setFilters] = React.useState<Filters>(EMPTY_FILTERS)
  const [page, setPage] = React.useState(1)
  const [detailRecord, setDetailRecord] = React.useState<TollReceiptImage | null>(null)
  const [showUpload, setShowUpload] = React.useState(false)
  const [showFilter, setShowFilter] = React.useState(false)

  const [drivers, setDrivers] = React.useState<Driver[]>([])

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

  const activeFilters = Object.values(filters).filter(Boolean).length
  const pendingCount = records.filter(r => r.status === "pending").length
  const processedCount = records.filter(r => r.status === "processed").length
  const failedCount = records.filter(r => r.status === "failed").length

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8 lg:p-10">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <PageHeader pageKey="tollReceipts" />
          <p className="mt-1 text-sm text-muted-foreground">{t.pages.tollReceipts.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowUpload(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Upload className="h-3.5 w-3.5" /> Upload Receipts
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total Receipts", value: meta.total },
          { label: "Pending OCR", value: pendingCount, highlight: pendingCount > 0 },
          { label: "Processed", value: processedCount },
          { label: "Failed / Error", value: failedCount, warn: failedCount > 0 },
        ].map(k => (
          <div key={k.label} className={`rounded-xl border bg-card p-4 shadow-sm ${"warn" in k && k.warn ? "border-red-200 dark:border-red-800" : "highlight" in k && k.highlight ? "border-amber-200 dark:border-amber-800" : ""}`}>
            <p className={`text-2xl font-bold ${"warn" in k && k.warn ? "text-red-600 dark:text-red-400" : "highlight" in k && k.highlight ? "text-amber-600 dark:text-amber-400" : ""}`}>{k.value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <button onClick={() => setShowFilter(true)}
          className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors ${activeFilters > 0 ? "border-primary bg-primary/10 text-primary" : "bg-background text-muted-foreground hover:bg-muted"}`}>
          <Filter className="h-3.5 w-3.5" /> Filters{activeFilters > 0 ? ` (${activeFilters})` : ""}
        </button>
        <button onClick={() => fetchData(page)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-background text-muted-foreground hover:bg-muted">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
        <p className="ml-auto text-xs text-muted-foreground">{meta.total} receipts</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <div className="overflow-auto rounded-xl border bg-card shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : records.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No toll receipts found</p>
            <p className="mt-1 text-xs text-muted-foreground">Receipts sync from the driver app, or upload images above</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                {["Driver","Captured","Amount","Entry","Exit","Vehicle Class","VRN","Status","Action"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map(r => {
                const ext = r.extracted_data
                return (
                  <tr key={r.uuid} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-2.5 whitespace-nowrap">{r.driver?.name ?? r.driver_name ?? "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{fmt(r.captured_at ?? r.created_at)}</td>
                    <td className="px-4 py-2.5 font-semibold whitespace-nowrap">
                      {ext?.total_amount ? `${ext.currency ?? ""} ${ext.total_amount}` : r.amount ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-xs max-w-[120px]">
                      <p className="truncate">{ext?.entry_point ?? "—"}</p>
                    </td>
                    <td className="px-4 py-2.5 text-xs max-w-[120px]">
                      <p className="truncate">{ext?.exit_point ?? "—"}</p>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{ext?.vehicle_class ?? "—"}</td>
                    <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap">{ext?.parsed_vehicle_vrn ?? ext?.vehicle_number ?? "—"}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${STATUS_STYLES[r.status] ?? ""}`}>{r.status}</span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <button onClick={() => setDetailRecord(r)} className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:underline">
                        <Eye className="h-3 w-3" /> View
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/20">
                <td colSpan={9} className="px-4 py-2 text-xs text-muted-foreground">{meta.total} total receipts</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {meta.last_page > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Page {meta.current_page} of {meta.last_page}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="h-8 w-8 rounded-lg border bg-background text-muted-foreground hover:bg-muted disabled:opacity-40 flex items-center justify-center">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => setPage(p => Math.min(meta.last_page, p + 1))} disabled={page === meta.last_page}
              className="h-8 w-8 rounded-lg border bg-background text-muted-foreground hover:bg-muted disabled:opacity-40 flex items-center justify-center">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {detailRecord && <ReceiptDetailModal receipt={detailRecord} onClose={() => setDetailRecord(null)} />}
      {showUpload && <UploadWizard onClose={() => setShowUpload(false)} onDone={() => fetchData(1)} />}
      <FilterPanel open={showFilter} onClose={() => setShowFilter(false)} filters={filters} setFilters={setFilters} drivers={drivers} />
    </div>
  )
}
