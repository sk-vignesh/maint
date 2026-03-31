"use client"

import { PageHeader } from "@/components/page-header"
import * as React from "react"
import {
  Search, Download, Plus, RefreshCw, X, Loader2,
  AlertCircle, Trash2, Upload, CheckCircle2, XCircle, FileText,
  ChevronLeft, ChevronRight, Filter, Send,
} from "lucide-react"
import { useLang } from "@/components/lang-context"
import {
  listTollReports, createTollReport, updateTollReport,
  deleteTollReport, bulkDeleteFuelReports, exportFuelReports,
  uploadReportFile, importTollReports, sendToAmazon,
  TOLL_DIRECTIONS, AMAZON_STATUSES,
  type TollReport, type CreateTollPayload,
} from "@/lib/fuel-reports-api"
import { listVehicles, type Vehicle } from "@/lib/vehicles-api"
import { listDrivers, type Driver } from "@/lib/drivers-api"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso?: string | null) {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })
    + " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
}

const AMAZON_STYLES: Record<string, string> = {
  new:    "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700",
  unseen: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700",
  seen:   "bg-green-50 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700",
}
const AMAZON_DOT: Record<string, string> = {
  new:    "bg-amber-500",
  unseen: "bg-blue-500",
  seen:   "bg-green-500",
}
const AMAZON_LABELS: Record<string, string> = {
  new: "Awaiting Send", unseen: "Unread", seen: "Sent",
}

// ─── Add/Edit Slide-Over ──────────────────────────────────────────────────────

function TollSlideOver({
  record, vehicles, drivers, onClose, onSaved,
}: {
  record: TollReport | null
  vehicles: Vehicle[]
  drivers: Driver[]
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!record
  const [form, setForm] = React.useState<CreateTollPayload>(
    record
      ? {
          vr_id: record.vr_id ?? "",
          trip_id: record.trip_id ?? "",
          crossing_date: record.crossing_date ? record.crossing_date.slice(0, 16) : "",
          direction: record.direction ?? "",
          amount: record.amount ?? 0,
          amount_incl_tax: record.amount_incl_tax ?? undefined,
          currency: record.currency ?? "GBP",
          vehicle_uuid: record.vehicle?.uuid ?? record.vehicle_uuid ?? "",
          driver_uuid: record.driver?.uuid ?? record.driver_uuid ?? "",
          status: record.status ?? "pending",
        }
      : { vr_id: "", crossing_date: "", direction: "", amount: 0, currency: "GBP", status: "pending" }
  )
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState("")

  const set = <K extends keyof CreateTollPayload>(k: K, v: CreateTollPayload[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setError("")
    setSaving(true)
    try {
      const payload = {
        ...form,
        amount: Number(form.amount),
        amount_incl_tax: form.amount_incl_tax ? Number(form.amount_incl_tax) : undefined,
        crossing_date: form.crossing_date ? new Date(form.crossing_date as string).toISOString() : undefined,
      }
      if (isEdit && record) {
        await updateTollReport(record.uuid, payload)
      } else {
        await createTollReport(payload)
      }
      onSaved()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const input = "h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
  const sel = "h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div><label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>{children}</div>
  )

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-base font-bold">{isEdit ? "Edit Toll Record" : "Add Toll Record"}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{isEdit ? `Editing ${record?.public_id}` : "Create a new toll expense record"}</p>
          </div>
          <button onClick={onClose} className="rounded-lg border p-1.5 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/20 px-3 py-2 text-xs text-red-700 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="VRID"><input value={form.vr_id ?? ""} onChange={e => set("vr_id", e.target.value)} className={input} placeholder="VRID-001234" /></Field>
            <Field label="Trip ID"><input value={form.trip_id ?? ""} onChange={e => set("trip_id", e.target.value)} className={input} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Crossing Date / Time">
              <input type="datetime-local" value={form.crossing_date as string ?? ""} onChange={e => set("crossing_date", e.target.value)} className={input} />
            </Field>
            <Field label="Direction">
              <select value={form.direction ?? ""} onChange={e => set("direction", e.target.value)} className={sel}>
                <option value="">Select…</option>
                {TOLL_DIRECTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Vehicle">
              <select value={form.vehicle_uuid ?? ""} onChange={e => set("vehicle_uuid", e.target.value)} className={sel}>
                <option value="">Select vehicle…</option>
                {vehicles.map(v => <option key={v.uuid} value={v.uuid}>{v.plate_number}</option>)}
              </select>
            </Field>
            <Field label="Driver">
              <select value={form.driver_uuid ?? ""} onChange={e => set("driver_uuid", e.target.value)} className={sel}>
                <option value="">Select driver…</option>
                {drivers.map(d => <option key={d.uuid} value={d.uuid}>{d.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount (excl. VAT)"><input type="number" step="0.01" min="0" value={form.amount ?? ""} onChange={e => set("amount", Number(e.target.value))} className={input} /></Field>
            <Field label="Amount (incl. VAT)"><input type="number" step="0.01" min="0" value={form.amount_incl_tax ?? ""} onChange={e => set("amount_incl_tax", e.target.value ? Number(e.target.value) : undefined)} className={input} /></Field>
          </div>
          <Field label="Currency"><input value={form.currency ?? "GBP"} onChange={e => set("currency", e.target.value)} className={input} placeholder="GBP" /></Field>
        </div>

        <div className="flex gap-2 border-t p-4">
          <button onClick={onClose} className="flex-1 rounded-lg border px-3 py-2 text-sm text-muted-foreground hover:bg-muted">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Record"}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Import Wizard ────────────────────────────────────────────────────────────

type ImportStep = "upload" | "uploading" | "importing" | "done" | "error"

function ImportWizard({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [step, setStep] = React.useState<ImportStep>("upload")
  const [file, setFile] = React.useState<File | null>(null)
  const [result, setResult] = React.useState<Awaited<ReturnType<typeof importTollReports>> | null>(null)
  const [errMsg, setErrMsg] = React.useState("")
  const fileRef = React.useRef<HTMLInputElement>(null)

  const runImport = async () => {
    if (!file) return
    try {
      setStep("uploading")
      const uploaded = await uploadReportFile(file)
      setStep("importing")
      const res = await importTollReports([uploaded.uuid])
      setResult(res)
      setStep("done")
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : "Import failed")
      setStep("error")
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={step === "upload" ? onClose : undefined} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-base font-bold">Import Toll Records</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Upload a CSV or Excel file</p>
          </div>
          <button onClick={onClose} className="rounded-lg border p-1.5 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-5">
          {step === "upload" && (
            <>
              <div onClick={() => fileRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/30 py-10 transition-colors hover:border-primary/40 hover:bg-muted/20">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-medium">{file ? file.name : "Click to select file"}</p>
                  <p className="text-xs text-muted-foreground">.xlsx, .xls, .csv — max 5000 rows</p>
                </div>
                {file && <span className="rounded-full bg-green-100 px-3 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">Ready to import</span>}
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
            </>
          )}
          {(step === "uploading" || step === "importing") && (
            <div className="flex flex-col items-center gap-4 py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="font-medium">{step === "uploading" ? "Uploading file…" : "Importing records…"}</p>
            </div>
          )}
          {step === "done" && result && (
            <div className="flex flex-col gap-4">
              <div className={`flex items-center gap-3 rounded-xl p-4 ${result.success || result.partial_success ? "bg-green-50 dark:bg-green-950/20" : "bg-red-50 dark:bg-red-950/20"}`}>
                {result.success || result.partial_success ? <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" /> : <XCircle className="h-6 w-6 text-red-500 shrink-0" />}
                <div>
                  <p className={`font-medium ${result.success || result.partial_success ? "text-green-800 dark:text-green-300" : "text-red-700 dark:text-red-400"}`}>
                    {result.success ? "Import complete" : result.partial_success ? "Partial import" : "Import failed"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{result.message}</p>
                </div>
              </div>
              {result.error_log_url && (
                <a href={result.error_log_url} className="inline-flex items-center gap-1 text-xs text-amber-700 underline" target="_blank" rel="noreferrer">
                  <FileText className="h-3 w-3" /> Download error log
                </a>
              )}
            </div>
          )}
          {step === "error" && (
            <div className="flex items-center gap-3 rounded-xl bg-red-50 dark:bg-red-950/20 p-4">
              <XCircle className="h-6 w-6 text-red-500 shrink-0" />
              <div>
                <p className="font-medium text-red-700 dark:text-red-400">Import failed</p>
                <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">{errMsg}</p>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2 border-t p-4">
          {step === "upload" && (
            <>
              <button onClick={onClose} className="flex-1 rounded-lg border px-3 py-2 text-sm text-muted-foreground hover:bg-muted">Cancel</button>
              <button onClick={runImport} disabled={!file} className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">Start Import</button>
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

// ─── Send to Amazon Modal — 3-step flow ──────────────────────────────────────
//  Step 1: Select period + filter type
//  Step 2: Preview — fetch matching records, show total count + amount
//  Step 3: Confirm & send → show result

type AmazonStep = "period" | "preview" | "sending" | "done" | "error"

interface AmazonPreview {
  total: number
  amount: number
  currency: string
}

function SendToAmazonModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const [step, setStep] = React.useState<AmazonStep>("period")
  const [fromDate, setFromDate] = React.useState("")
  const [toDate, setToDate] = React.useState("")
  const [filter, setFilter] = React.useState<"ready_to_sent" | "unseen" | "all">("ready_to_sent")
  const [preview, setPreview] = React.useState<AmazonPreview | null>(null)
  const [previewLoading, setPreviewLoading] = React.useState(false)
  const [result, setResult] = React.useState("")
  const [downloadUrl, setDownloadUrl] = React.useState("")
  const [error, setError] = React.useState("")

  // Step 2: fetch preview counts using the list endpoint + same filters
  const loadPreview = async () => {
    setPreviewLoading(true)
    setError("")
    try {
      const res = await listTollReports({
        page: 1, limit: 500,
        seen_status_of_amazon: filter === "ready_to_sent" ? "new" : filter === "unseen" ? "unseen" : undefined,
        start_date: fromDate || undefined,
        end_date: toDate || undefined,
      })
      const records = res.toll_reports
      const amount = records.reduce((a, r) => a + Number(r.amount ?? 0), 0)
      setPreview({ total: res.meta.total, amount, currency: records[0]?.currency ?? "GBP" })
      setStep("preview")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load preview")
    } finally {
      setPreviewLoading(false)
    }
  }

  // Step 3: send
  const handleSend = async () => {
    setStep("sending")
    setError("")
    try {
      const res = await sendToAmazon({ from_date: fromDate || undefined, to_date: toDate || undefined, filter_param: filter })
      setResult(res.message ?? "Report sent successfully")
      setDownloadUrl(res.download_url ?? "")
      setStep("done")
      onSent()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Send failed")
      setStep("error")
    }
  }

  const filterLabel: Record<typeof filter, string> = {
    ready_to_sent: "New records only (Awaiting Send)",
    unseen: "Unread records",
    all: "All records in period",
  }

  const input = "h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={step === "period" ? onClose : undefined} />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-card shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="font-bold">Send to Amazon</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Email toll report to the configured Amazon recipient</p>
          </div>
          {step !== "sending" && (
            <button onClick={onClose} className="rounded-lg border p-1.5 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
          )}
        </div>

        {/* Step indicator */}
        <div className="flex border-b">
          {(["Select Period", "Preview", "Confirm"] as const).map((label, i) => {
            const stepIndex = step === "period" ? 0 : step === "preview" ? 1 : 2
            return (
              <div key={label} className={`flex-1 py-2.5 text-center text-[11px] font-medium transition-colors ${i === stepIndex ? "border-b-2 border-primary text-primary" : i < stepIndex ? "text-muted-foreground" : "text-muted-foreground/40"}`}>
                <span className={`mr-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${i < stepIndex ? "bg-green-500 text-white" : i === stepIndex ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {i < stepIndex ? "✓" : i + 1}
                </span>
                {label}
              </div>
            )
          })}
        </div>

        {/* Body */}
        <div className="p-5">

          {/* Step 1: Period Selection */}
          {step === "period" && (
            <div className="flex flex-col gap-4">
              {error && <div className="rounded-lg bg-red-50 dark:bg-red-950/20 px-3 py-2 text-xs text-red-700 dark:text-red-400">{error}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">From date</label>
                  <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className={input} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">To date</label>
                  <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className={input} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Records to include</label>
                <select value={filter} onChange={e => setFilter(e.target.value as typeof filter)} className={input}>
                  <option value="ready_to_sent">New records only (Awaiting Send)</option>
                  <option value="unseen">Unread records</option>
                  <option value="all">All records in period</option>
                </select>
              </div>
              <p className="text-[11px] text-muted-foreground">Leave dates blank to include all time. We&apos;ll preview the matching claims before sending.</p>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === "preview" && preview && (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Claims to be sent</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-3xl font-bold">{preview.total}</p>
                    <p className="text-xs text-muted-foreground">Total records</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{preview.currency} {preview.amount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Total amount</p>
                  </div>
                </div>
              </div>
              <div className="rounded-lg bg-muted/30 px-3 py-2 text-xs">
                <p><span className="font-medium">Period:</span> {fromDate || "All time"} {toDate ? `→ ${toDate}` : ""}</p>
                <p className="mt-0.5"><span className="font-medium">Filter:</span> {filterLabel[filter]}</p>
              </div>
              {preview.total === 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                  <AlertCircle className="h-4 w-4 shrink-0" /> No records match these filters. Adjust the period or filter type.
                </div>
              )}
            </div>
          )}

          {/* Step 2: Preview loading */}
          {previewLoading && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Fetching matching records…</p>
            </div>
          )}

          {/* Step 3: Sending */}
          {step === "sending" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Sending report to Amazon…</p>
            </div>
          )}

          {/* Done */}
          {step === "done" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 rounded-xl bg-green-50 dark:bg-green-950/20 p-4">
                <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-300">Report sent</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{result}</p>
                </div>
              </div>
              {downloadUrl && (
                <a href={downloadUrl} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:underline dark:text-indigo-400">
                  <FileText className="h-3.5 w-3.5" /> Download report file
                </a>
              )}
            </div>
          )}

          {/* Error */}
          {step === "error" && (
            <div className="flex items-center gap-3 rounded-xl bg-red-50 dark:bg-red-950/20 p-4">
              <XCircle className="h-6 w-6 text-red-500 shrink-0" />
              <div>
                <p className="font-medium text-red-700 dark:text-red-400">Send failed</p>
                <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex gap-2 border-t px-5 py-4">
          {step === "period" && (
            <>
              <button onClick={onClose} className="flex-1 rounded-lg border px-3 py-2 text-sm text-muted-foreground hover:bg-muted">Cancel</button>
              <button onClick={loadPreview} disabled={previewLoading}
                className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
                {previewLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Preview Claims →
              </button>
            </>
          )}
          {step === "preview" && preview && (
            <>
              <button onClick={() => setStep("period")} className="flex-1 rounded-lg border px-3 py-2 text-sm text-muted-foreground hover:bg-muted">← Back</button>
              <button onClick={handleSend} disabled={preview.total === 0}
                className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                Send {preview.total} Record{preview.total !== 1 ? "s" : ""}
              </button>
            </>
          )}
          {(step === "done" || step === "error") && (
            <button onClick={onClose} className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Close</button>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Filter Panel ─────────────────────────────────────────────────────────────

type Filters = { vehicle: string; seen_status: string; start_date: string; end_date: string }
const EMPTY_FILTERS: Filters = { vehicle: "", seen_status: "", start_date: "", end_date: "" }

function FilterPanel({ open, onClose, filters, setFilters, vehicles }: {
  open: boolean; onClose: () => void
  filters: Filters; setFilters: (f: Filters) => void
  vehicles: Vehicle[]
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
          <h2 className="font-bold">Filter Tolls</h2>
          <button onClick={onClose} className="rounded-lg border p-1.5 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Vehicle</label>
            <select value={local.vehicle} onChange={e => set("vehicle", e.target.value)} className={sel}>
              <option value="">Any vehicle</option>
              {vehicles.map(v => <option key={v.uuid} value={v.uuid}>{v.plate_number}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Amazon Status</label>
            <select value={local.seen_status} onChange={e => set("seen_status", e.target.value)} className={sel}>
              <option value="">Any</option>
              {AMAZON_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Date from</label>
            <input type="date" value={local.start_date} onChange={e => set("start_date", e.target.value)} className={sel} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Date to</label>
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

export default function TollExpensesPage() {
  const { t } = useLang()
  const c = t.common

  const [records, setRecords] = React.useState<TollReport[]>([])
  const [meta, setMeta] = React.useState({ total: 0, last_page: 1, current_page: 1 })
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")

  const [search, setSearch] = React.useState("")
  const [filters, setFilters] = React.useState<Filters>(EMPTY_FILTERS)
  const [page, setPage] = React.useState(1)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [slideOver, setSlideOver] = React.useState<TollReport | null | "new">(null)
  const [showImport, setShowImport] = React.useState(false)
  const [showFilter, setShowFilter] = React.useState(false)
  const [showAmazon, setShowAmazon] = React.useState(false)
  const [showCards, setShowCards] = React.useState(false)
  const [searchFocused, setSearchFocused] = React.useState(false)
  const [deleting, setDeleting] = React.useState<string | null>(null)
  const [exporting, setExporting] = React.useState(false)

  const [vehicles, setVehicles] = React.useState<Vehicle[]>([])
  const [drivers, setDrivers] = React.useState<Driver[]>([])

  const searchRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  React.useEffect(() => {
    clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => setDebouncedSearch(search), 200)
    return () => clearTimeout(searchRef.current)
  }, [search])

  const fetchData = React.useCallback(async (p = page) => {
    setLoading(true)
    setError("")
    try {
      const res = await listTollReports({
        page: p, limit: 15,
        query: debouncedSearch || undefined,
        vehicle: filters.vehicle || undefined,
        seen_status_of_amazon: filters.seen_status || undefined,
        start_date: filters.start_date || undefined,
        end_date: filters.end_date || undefined,
      })
      const raw = res as unknown as Record<string, unknown>
      const rows = (raw.toll_reports ?? raw.data ?? []) as TollReport[]
      setRecords(rows)
      const m = res.meta ?? { total: 0, last_page: 1, current_page: 1 }
      setMeta({ total: m.total, last_page: m.last_page, current_page: m.current_page })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, filters])

  React.useEffect(() => {
    listVehicles({ limit: 999 }).then(r => setVehicles(r.vehicles)).catch(() => {})
    listDrivers({ limit: 999 }).then(r => setDrivers(r.drivers ?? [])).catch(() => {})
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { setPage(1); fetchData(1) }, [debouncedSearch, filters])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { fetchData(page) }, [page])

  const handleDelete = async (uuid: string) => {
    if (!confirm("Delete this toll record?")) return
    setDeleting(uuid)
    try { await deleteTollReport(uuid); fetchData(page) }
    catch (e: unknown) { alert(e instanceof Error ? e.message : "Delete failed") }
    finally { setDeleting(null) }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} record(s)?`)) return
    try { await bulkDeleteFuelReports([...selected]); setSelected(new Set()); fetchData(page) }
    catch (e: unknown) { alert(e instanceof Error ? e.message : "Delete failed") }
  }

  const handleExport = async () => {
    setExporting(true)
    try { await exportFuelReports({ report_type: "toll", format: "xlsx", from_date: filters.start_date || undefined, to_date: filters.end_date || undefined }) }
    catch (e: unknown) { alert(e instanceof Error ? e.message : "Export failed") }
    finally { setExporting(false) }
  }

  const toggleSelect = (uuid: string) =>
    setSelected(s => { const n = new Set(s); if (n.has(uuid)) n.delete(uuid); else n.add(uuid); return n })
  const toggleAll = () =>
    setSelected(s => s.size === records.length ? new Set() : new Set(records.map(r => r.uuid)))

  const activeFilters = Object.values(filters).filter(Boolean).length
  const totalAmount = records.reduce((a, r) => a + Number(r.amount ?? 0), 0)
  const pendingCount = records.filter(r => r.status === "pending").length
  const newCount = records.filter(r => r.seen_status_of_amazon === "new").length

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-hidden px-6 pt-3 pb-2 md:px-8 lg:px-10">

      {/* KPI Cards — toggled by Stats button */}
      {showCards && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total Records",    value: meta.total,       sub: "all time",      colour: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20",       icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg> },
            { label: "Amount (page)",    value: `£${totalAmount.toFixed(2)}`, sub: "excl. VAT", colour: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20", icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
            { label: "Pending Approval", value: pendingCount,     sub: "awaiting review", colour: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20",  icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
            { label: "Awaiting Amazon",  value: newCount,         sub: "not yet sent",   colour: "text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-900/20", icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg> },
          ].map(k => (
            <div key={k.label} className="relative flex flex-col gap-2 rounded-xl border bg-card px-4 py-3 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">{k.label}</span>
                <span className={`rounded-lg p-1.5 ${k.colour}`}>{k.icon}</span>
              </div>
              <p className="text-2xl font-bold tabular-nums leading-none">
                {loading ? <span className="inline-block h-7 w-10 animate-pulse rounded bg-muted" /> : k.value}
              </p>
              <p className="text-[11px] text-muted-foreground">{k.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div data-help="toolbar" className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <PageHeader pageKey="tollExpenses" />

          <div className="flex-1" />

          {selected.size > 0 && (
            <button onClick={handleBulkDelete}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-red-500 px-3 text-xs font-semibold text-white shadow-sm transition-all hover:bg-red-600">
              <Trash2 className="h-3.5 w-3.5" /> Delete {selected.size}
            </button>
          )}

          <div className={`relative transition-all duration-200 ${searchFocused ? "w-72" : "w-40"}`}>
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search vehicle, driver…" value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
              className="h-8 w-full rounded-lg border bg-background pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring" />
          </div>

          <div className="flex items-center gap-0.5 rounded-lg border bg-muted/30 p-0.5">
            <button onClick={() => setShowFilter(v => !v)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${activeFilters > 0 || showFilter ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-background hover:text-foreground"}`}>
              <Filter className="h-3 w-3" /> Filters{activeFilters > 0 ? ` (${activeFilters})` : ""}
            </button>
            <button onClick={() => setShowCards(v => !v)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${showCards ? "bg-blue-500 text-white shadow-sm" : "text-muted-foreground hover:bg-background hover:text-foreground"}`}>
              <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2 13V8M6 13V5M10 13V7M14 13V3" /></svg>
              Stats
            </button>
          </div>

          <span className="h-6 w-px bg-border" />

          <button onClick={() => fetchData(page)} title="Refresh"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setShowImport(true)} title="Import"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <Upload className="h-3.5 w-3.5" />
          </button>
          <button onClick={handleExport} disabled={exporting} title="Export"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40">
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          </button>
          <button onClick={() => setShowAmazon(true)} title="Send to Amazon"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <Send className="h-3.5 w-3.5" />
          </button>

          <span className="h-6 w-px bg-border" />

          <button onClick={() => setSlideOver("new")}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
            <Plus className="h-3.5 w-3.5" /> {c.newCharge}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Table */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">No toll records found</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-2.5"><input type="checkbox" checked={selected.size === records.length && records.length > 0} onChange={toggleAll} className="rounded" /></th>
                  {["ID","Date","Vehicle","Driver","VRID","Direction","Amount","Incl. VAT","Amazon",""].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.uuid} className="border-b last:border-0 transition-colors hover:bg-muted/20">
                    <td className="px-4 py-2.5"><input type="checkbox" checked={selected.has(r.uuid)} onChange={() => toggleSelect(r.uuid)} className="rounded" /></td>
                    <td className="px-4 py-2.5 font-mono text-xs text-primary whitespace-nowrap">{r.public_id}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{fmt(r.crossing_date || r.created_at)}</td>
                    <td className="px-4 py-2.5 font-mono font-bold whitespace-nowrap">{r.vehicle?.plate_number ?? "—"}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{r.driver?.name ?? "—"}</td>
                    <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap">{r.vr_id ?? "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{r.direction ?? "—"}</td>
                    <td className="px-4 py-2.5 font-semibold whitespace-nowrap">{r.currency ?? "GBP"} {Number(r.amount ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{r.amount_incl_tax ? `${r.currency} ${Number(r.amount_incl_tax).toFixed(2)}` : "—"}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {r.seen_status_of_amazon && (
                        <span className={`inline-flex items-center rounded-[100px] border pl-1 pr-3 text-[11px] font-medium leading-[2] ${AMAZON_STYLES[r.seen_status_of_amazon] ?? ""}`}>
                          <span className={`mr-2 ml-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${AMAZON_DOT[r.seen_status_of_amazon] ?? "bg-gray-400"}`} />
                          {AMAZON_LABELS[r.seen_status_of_amazon] ?? r.seen_status_of_amazon}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSlideOver(r)} className="text-xs text-primary hover:underline">Edit</button>
                        <button onClick={() => handleDelete(r.uuid)} disabled={deleting === r.uuid}
                          className="text-xs text-red-500 hover:underline disabled:opacity-50">{deleting === r.uuid ? "…" : "Del"}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/20">
                  <td colSpan={11} className="px-4 py-2 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>{meta.total} records · Page {meta.current_page} of {meta.last_page}</span>
                      {meta.last_page > 1 && (
                        <span className="flex items-center gap-1">
                          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                            className="h-6 w-6 rounded border bg-background text-muted-foreground hover:bg-muted disabled:opacity-40 flex items-center justify-center">
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setPage(p => Math.min(meta.last_page, p + 1))} disabled={page === meta.last_page}
                            className="h-6 w-6 rounded border bg-background text-muted-foreground hover:bg-muted disabled:opacity-40 flex items-center justify-center">
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {slideOver !== null && (
        <TollSlideOver record={slideOver === "new" ? null : slideOver} vehicles={vehicles} drivers={drivers}
          onClose={() => setSlideOver(null)} onSaved={() => fetchData(page)} />
      )}
      {showImport && <ImportWizard onClose={() => setShowImport(false)} onDone={() => fetchData(1)} />}
      {showAmazon && <SendToAmazonModal onClose={() => setShowAmazon(false)} onSent={() => fetchData(page)} />}
      <FilterPanel open={showFilter} onClose={() => setShowFilter(false)} filters={filters} setFilters={setFilters} vehicles={vehicles} />
    </div>
  )
}
