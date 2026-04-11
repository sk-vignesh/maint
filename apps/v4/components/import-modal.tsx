"use client"

import * as React from "react"
import { X, Upload, Loader2, CheckCircle2, AlertCircle, FileSpreadsheet, Download } from "lucide-react"
import { ontrackFetch, getToken } from "@/lib/ontrack-api"
import { useLang } from "@/components/lang-context"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ImportResult {
  // Primary field names (per API docs)
  imported?:        number
  skipped?:         number
  error_log_url?:   string
  // Alternative field names the API may actually return
  created?:         number
  created_count?:   number
  // Entity-specific keys e.g. "created_vehicle", "created_driver", "created_place"
  created_vehicle?: number
  created_driver?:  number
  created_place?:   number
  inserted?:        number
  inserted_count?:  number
  total_processed?: number
  total?:           number
  count?:           number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]:    any
}

/** Normalise whatever the import endpoint returns into a consistent shape */
function normaliseImportResult(raw: ImportResult): ImportResult {
  // Unwrap if the result is nested under a `data` key
  const r: ImportResult = (raw as ImportResult & { data?: ImportResult }).data ?? raw

  // Entity-specific key scan: picks up any "created_*" field automatically
  // e.g. created_vehicle, created_driver, created_place
  const entityCreated = Object.entries(r)
    .filter(([k]) => k.startsWith("created_") && typeof r[k] === "number")
    .reduce((sum, [, v]) => sum + (v as number), 0) || undefined

  const importedCount =
    r.imported ??
    entityCreated ??
    r.created ??
    r.created_count ??
    r.inserted ??
    r.inserted_count ??
    r.total_processed ??
    r.total ??
    r.count ??
    0

  const skippedCount = r.skipped ?? r.skipped_count ?? 0

  return {
    imported:       importedCount,
    skipped:        skippedCount,
    error_log_url:  r.error_log_url,
  }
}

type Step = "pick" | "uploading" | "importing" | "done" | "error"

// ─── Upload helper ────────────────────────────────────────────────────────────

async function uploadFile(
  file: File,
  type: string,
): Promise<string> {
  const token = getToken()
  const fd = new FormData()
  fd.append("file", file)
  fd.append("type", type)
  const res = await fetch("https://ontrack-api.agilecyber.com/int/v1/files/upload", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.message ?? body?.error ?? `Upload failed (HTTP ${res.status})`)
  }
  const data = await res.json()
  // API may return { uuid } or { id } or { file: { uuid } }
  const uuid = data?.uuid ?? data?.id ?? data?.file?.uuid ?? data?.file?.id
  if (!uuid) throw new Error("Upload succeeded but no file UUID returned.")
  return uuid as string
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ImportModalProps {
  open:       boolean
  onClose:    () => void
  onDone:     () => void
  /** Human label e.g. "Vehicles" */
  entityName: string
  /** `type` field sent to /files/upload (e.g. "driver_import") */
  uploadType: string
  /** Function that calls the entity-specific import endpoint */
  importFn:   (fileUuids: string[]) => Promise<ImportResult>
}

export function ImportModal({
  open, onClose, onDone, entityName, uploadType, importFn,
}: ImportModalProps) {
  const { t } = useLang()
  const c = t.common

  const [step,        setStep]        = React.useState<Step>("pick")
  const [file,        setFile]        = React.useState<File | null>(null)
  const [dragging,    setDragging]    = React.useState(false)
  const [result,      setResult]      = React.useState<ImportResult | null>(null)
  const [errorMsg,    setErrorMsg]    = React.useState<string | null>(null)
  const fileRef = React.useRef<HTMLInputElement>(null)

  // Reset when opened
  React.useEffect(() => {
    if (open) { setStep("pick"); setFile(null); setResult(null); setErrorMsg(null) }
  }, [open])

  if (!open) return null

  const accept = ".xlsx,.xls,.csv"

  const handleFile = (f: File) => {
    setFile(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const run = async () => {
    if (!file) return
    try {
      setStep("uploading")
      const uuid = await uploadFile(file, uploadType)
      setStep("importing")
      const raw = await importFn([uuid])
      console.log("[ImportModal] raw API response:", raw)
      const res = normaliseImportResult(raw)
      setResult(res)
      setStep("done")
      onDone()
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Import failed")
      setStep("error")
    }
  }

  const downloadErrorLog = (url: string) => {
    const a = document.createElement("a")
    a.href = url
    a.download = `${entityName.toLowerCase()}-import-errors.csv`
    a.click()
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-sm font-bold">{c.upload} {entityName}</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {/* PICK */}
          {step === "pick" && (
            <div className="space-y-4">
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-10 transition-colors ${dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"}`}
              >
                <Upload className={`h-8 w-8 ${dragging ? "text-primary" : "text-muted-foreground"}`} />
                {file ? (
                  <div className="text-center">
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                      <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                      {file.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB — {c.clickToChange}
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm font-medium">{c.dropFile}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{c.supports}</p>
                  </div>
                )}
                <input ref={fileRef} type="file" accept={accept} className="hidden"
                  onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={onClose} className="h-9 rounded-lg border bg-background px-4 text-sm text-muted-foreground hover:bg-muted">
                  {c.cancel}
                </button>
                <button onClick={run} disabled={!file}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-40">
                  <Upload className="h-3.5 w-3.5" /> {c.upload}
                </button>
              </div>
            </div>
          )}

          {/* UPLOADING / IMPORTING */}
          {(step === "uploading" || step === "importing") && (
            <div className="flex flex-col items-center gap-4 py-10">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm font-medium">
                {step === "uploading" ? c.upload + "…" : `${c.creating} ${entityName.toLowerCase()}…`}
              </p>
              <p className="text-xs text-muted-foreground">{c.loading}</p>
            </div>
          )}

          {/* DONE */}
          {step === "done" && result && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-500" />
                <div>
                  <p className="font-semibold">{c.importComplete}</p>
                  <p className="text-xs text-muted-foreground">
                    {result.imported ?? 0} {c.rowsImported}
                    {(result.skipped ?? 0) > 0 && `, ${result.skipped} ${c.rowsSkipped}`}
                  </p>
                </div>
              </div>
              {result.error_log_url && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/20">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-300">{c.someRowsHadErrors}</p>
                  <button onClick={() => downloadErrorLog(result.error_log_url!)}
                    className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 underline dark:text-amber-300">
                    <Download className="h-3 w-3" /> {c.downloadErrorLog}
                  </button>
                </div>
              )}
              <div className="flex justify-end">
                <button onClick={onClose} className="h-9 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                  {c.close}
                </button>
              </div>
            </div>
          )}

          {/* ERROR */}
          {step === "error" && (
            <div className="space-y-4 py-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-7 w-7 shrink-0 text-red-500 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-600 dark:text-red-400">{c.importFailed}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{errorMsg}</p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={onClose} className="h-9 rounded-lg border bg-background px-4 text-sm text-muted-foreground hover:bg-muted">
                  {c.cancel}
                </button>
                <button onClick={() => { setStep("pick"); setErrorMsg(null) }}
                  className="h-9 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                  {c.tryAgainBtn}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
