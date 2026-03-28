"use client"
import * as React from "react"
import {
  FileText, Plus, Search, X, ChevronDown, CheckCircle2,
  AlertTriangle, Clock, Upload, Download, Trash2, Calendar,
  Shield, Building2, Pencil, Eye, Fingerprint, AlertCircle, Files,
  Loader2, RefreshCw,
} from "lucide-react"
import {
  listComplianceDocs,
  listBusinessCategories,
  createComplianceDoc,
  updateComplianceDoc,
  deleteComplianceDoc,
  type ApiComplianceDocument,
  type ApiBusinessCategory,
  type ApiCategoryDocumentRow,
} from "@/lib/compliance-docs-api"
import { getCompanyUuid } from "@/lib/ontrack-api"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

const statusColors: Record<string, string> = {
  valid:         "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  expiring_soon: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  expired:       "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  no_expiry:     "bg-gray-100 text-foreground dark:bg-gray-800 dark:text-foreground",
}
const statusLabels: Record<string, string> = {
  valid:         "Valid",
  expiring_soon: "Expiring Soon",
  expired:       "Expired",
  no_expiry:     "No Expiry",
}

// ─── Document Detail Panel ────────────────────────────────────────────────────

function DocumentPanel({
  doc, category, onClose, onSign, onDelete, onRefresh,
}: {
  doc: ApiComplianceDocument
  category: string
  onClose: () => void
  onSign: (doc: ApiComplianceDocument) => Promise<void>
  onDelete: (doc: ApiComplianceDocument) => Promise<void>
  onRefresh: () => void
}) {
  const [editing, setEditing] = React.useState(false)
  const [editTitle, setEditTitle] = React.useState(doc.title || "")
  const [editDesc, setEditDesc] = React.useState(doc.description || "")
  const [editExpiry, setEditExpiry] = React.useState(doc.expires_at || "")
  const [editNotes, setEditNotes] = React.useState(doc.notes || "")
  const [saving, setSaving] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [signing, setSigning] = React.useState(false)

  async function save() {
    setSaving(true)
    try {
      await updateComplianceDoc(doc.uuid, {
        title: editTitle || undefined,
        description: editDesc || undefined,
        expires_at: editExpiry || null,
        notes: editNotes || undefined,
      })
      setEditing(false)
      onRefresh()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this document? This cannot be undone.")) return
    setDeleting(true)
    try {
      await onDelete(doc)
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  async function handleSign() {
    setSigning(true)
    try {
      await onSign(doc)
      onRefresh()
    } finally {
      setSigning(false)
    }
  }

  const status = doc.document_status

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-background border-l shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center gap-3 border-b px-5 py-4">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            status === "expired" ? "bg-red-500" : status === "expiring_soon" ? "bg-amber-500" : "bg-indigo-500"
          }`}>
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold truncate">{doc.title || "Untitled Document"}</h3>
            <p className="text-[10px] text-muted-foreground uppercase">{category}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg border hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
          {/* Status bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase ${statusColors[status] ?? ""}`}>
              {statusLabels[status] ?? status}
            </span>
            {doc.expires_at && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {status === "expired"
                  ? `Expired ${fmtDate(doc.expires_at)}`
                  : `Expires ${fmtDate(doc.expires_at)}${doc.days_remaining != null ? ` (${doc.days_remaining}d)` : ""}`
                }
              </span>
            )}
            {doc.signer1_signature ? (
              <span className="ml-auto rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 px-2.5 py-1 text-[10px] font-medium text-green-700 dark:text-green-400 flex items-center gap-1">
                <Fingerprint className="h-3 w-3" /> Signed by {doc.signer1_signature.name}
              </span>
            ) : (
              <button
                onClick={handleSign}
                disabled={signing}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {signing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Fingerprint className="h-3.5 w-3.5" />}
                Sign Document
              </button>
            )}
          </div>

          {/* Details */}
          {!editing ? (
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold">Document Details</h4>
                <button onClick={() => setEditing(true)} className="inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-xs hover:bg-muted">
                  <Pencil className="h-3 w-3" /> Edit
                </button>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Description", value: doc.description || "—" },
                  { label: "File", value: doc.file_name || "No file uploaded" },
                  { label: "Uploaded", value: doc.uploaded_at ? `${fmtDate(doc.uploaded_at)} by ${doc.uploaded_by ?? "—"}` : "—" },
                  { label: "Expiry", value: doc.expires_at ? fmtDate(doc.expires_at) : "No expiry date" },
                  { label: "Notes", value: doc.notes || "—" },
                ].map(r => (
                  <div key={r.label}>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase">{r.label}</p>
                    <p className="text-sm">{r.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <h4 className="text-sm font-bold mb-3">Edit Document</h4>
              <div className="grid gap-3">
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase">Title</label>
                  <input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase">Description</label>
                  <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3} className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase">Expiry Date</label>
                  <input type="date" value={editExpiry} onChange={e => setEditExpiry(e.target.value)} className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                  <p className="text-[10px] text-muted-foreground mt-0.5">Leave blank if this document doesn&apos;t expire</p>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase">Notes</label>
                  <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={2} className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                <button onClick={save} disabled={saving} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                  {saving && <Loader2 className="h-3 w-3 animate-spin" />} Save
                </button>
                <button onClick={() => setEditing(false)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs hover:bg-muted">Cancel</button>
              </div>
            </div>
          )}

          {/* File section */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h4 className="text-sm font-bold mb-3">File</h4>
            {doc.file_url ? (
              <div className="flex items-center gap-3 rounded-lg bg-muted/30 p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.file_name || "Document"}</p>
                  <p className="text-[10px] text-muted-foreground">Uploaded {fmtDate(doc.uploaded_at)}</p>
                </div>
                <div className="flex gap-1">
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs hover:bg-muted">
                    <Eye className="h-3 w-3" /> View
                  </a>
                  <a href={doc.file_url} download className="inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs hover:bg-muted">
                    <Download className="h-3 w-3" /> Download
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-6 text-center rounded-lg border-2 border-dashed">
                <Upload className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">No file attached yet</p>
              </div>
            )}
          </div>

          {/* Audit trail */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h4 className="text-sm font-bold mb-3">Audit Trail</h4>
            <div className="space-y-2">
              {doc.signer2_signature && (
                <div className="flex items-start gap-2 text-xs">
                  <Fingerprint className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />
                  <div><span className="font-medium">Counter-signed</span><span className="text-muted-foreground"> by {doc.signer2_signature.name} on {fmtDate(doc.signer2_signature.signed_at)}</span></div>
                </div>
              )}
              {doc.signer1_signature && (
                <div className="flex items-start gap-2 text-xs">
                  <Fingerprint className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />
                  <div><span className="font-medium">Signed</span><span className="text-muted-foreground"> by {doc.signer1_signature.name} on {fmtDate(doc.signer1_signature.signed_at)}</span></div>
                </div>
              )}
              {doc.uploaded_at && (
                <div className="flex items-start gap-2 text-xs">
                  <Upload className="h-3.5 w-3.5 text-blue-600 mt-0.5 shrink-0" />
                  <div><span className="font-medium">Uploaded</span><span className="text-muted-foreground"> by {doc.uploaded_by ?? "—"} on {fmtDate(doc.uploaded_at)}</span></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-5 py-3 flex items-center gap-2">
          {!doc.signer1_signature && (
            <button onClick={handleSign} disabled={signing} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
              <Fingerprint className="h-3.5 w-3.5" /> Sign
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 px-4 text-xs text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 disabled:opacity-60"
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Delete
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Add Document Form ────────────────────────────────────────────────────────

function AddDocumentForm({
  categories, companyUuid, onAdded, onCancel,
}: {
  categories: ApiBusinessCategory[]
  companyUuid: string
  onAdded: () => void
  onCancel: () => void
}) {
  const [title, setTitle] = React.useState("")
  const [categoryId, setCategoryId] = React.useState(categories[0]?.uuid ?? "other")
  const [customCatName, setCustomCatName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [expiryDate, setExpiryDate] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const isOther = categoryId === "other"

  async function submit() {
    if (!title.trim()) return
    if (isOther && !customCatName.trim()) return
    setSaving(true)
    setError(null)
    try {
      await createComplianceDoc({
        company_uuid: companyUuid,
        entity_type: "business",
        category_id: categoryId,
        ...(isOther ? { custom_category_name: customCatName.trim() } : {}),
        title: title.trim(),
        description: description.trim() || undefined,
        expires_at: expiryDate || null,
        notes: notes.trim() || undefined,
      })
      onAdded()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create document")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border bg-blue-50 dark:bg-blue-900/10 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Plus className="h-4 w-4 text-primary" /> Add New Document
        </h3>
        <button onClick={onCancel} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      </div>
      {error && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">{error}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase">Document Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Employers' Liability Insurance 2026" className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase">Category</label>
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
            {categories.map(c => <option key={c.uuid} value={c.uuid}>{c.name}</option>)}
          </select>
        </div>
        {isOther && (
          <div>
            <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase">New Category Name</label>
            <input value={customCatName} onChange={e => setCustomCatName(e.target.value)} placeholder="e.g. Environmental Compliance" className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
        )}
        <div>
          <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase">Expiry Date <span className="normal-case">(optional)</span></label>
          <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Brief description..." className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase">Notes</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Policy ref, provider, etc." className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>
      <div className="flex gap-2 mt-4 pt-3 border-t">
        <button onClick={submit} disabled={saving || !title.trim() || (isOther && !customCatName.trim())} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {saving && <Loader2 className="h-3 w-3 animate-spin" />}
          <Plus className="h-3 w-3" /> Add Document
        </button>
        <button onClick={onCancel} className="inline-flex h-8 items-center rounded-lg border px-3 text-xs hover:bg-muted">Cancel</button>
      </div>
    </div>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function BusinessDocsTab() {
  const [rows, setRows] = React.useState<ApiCategoryDocumentRow[]>([])
  const [categories, setCategories] = React.useState<ApiBusinessCategory[]>([])
  const [summary, setSummary] = React.useState<{ expired: number; expiring_soon: number; awaiting_signatures: number } | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const [search, setSearch] = React.useState("")
  const [filterStatus, setFilterStatus] = React.useState<string>("all")
  const [panelDoc, setPanelDoc] = React.useState<{ doc: ApiComplianceDocument; category: string } | null>(null)
  const [showAdd, setShowAdd] = React.useState(false)

  const companyUuid = getCompanyUuid() ?? ""

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [docsRes, catsRes] = await Promise.all([
        listComplianceDocs({ entity_type: "business", company_uuid: companyUuid || undefined }),
        listBusinessCategories({ company_uuid: companyUuid || undefined }),
      ])
      setRows(docsRes.data as ApiCategoryDocumentRow[])
      setSummary(docsRes.summary)
      // for_filter=false already gives us the "Other" option at the end
      setCategories(catsRes.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load documents")
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => { load() }, [])

  // Flatten all documents from the category rows
  const allDocs: { doc: ApiComplianceDocument; category: string }[] = rows
    .filter(r => r.compliance != null)
    .map(r => ({ doc: r.compliance!, category: r.category.name }))

  // Filtered view
  const filtered = allDocs.filter(({ doc, category }) => {
    if (filterStatus !== "all" && doc.document_status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      if (!(doc.title ?? "").toLowerCase().includes(q) && !category.toLowerCase().includes(q)) return false
    }
    return true
  })

  async function handleSign(doc: ApiComplianceDocument) {
    await updateComplianceDoc(doc.uuid, {
      signer1_signature: { name: "Current User", signed_at: new Date().toISOString() },
    })
    await load()
  }

  async function handleDelete(doc: ApiComplianceDocument) {
    await deleteComplianceDoc(doc.uuid)
    await load()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <AlertTriangle className="h-10 w-10 text-red-500/50" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs hover:bg-muted">
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${(summary?.expired ?? 0) > 0 ? "bg-red-500" : "bg-green-500"}`}>
            <AlertTriangle className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold">{summary?.expired ?? 0}</p>
            <p className="text-xs text-muted-foreground">Expired / Overdue</p>
            <p className="text-[10px] text-muted-foreground">{(summary?.expired ?? 0) > 0 ? "requires immediate action" : "all current"}</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${(summary?.expiring_soon ?? 0) > 0 ? "bg-amber-500" : "bg-green-500"}`}>
            <Clock className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold">{summary?.expiring_soon ?? 0}</p>
            <p className="text-xs text-muted-foreground">Expiring Soon</p>
            <p className="text-[10px] text-muted-foreground">{(summary?.expiring_soon ?? 0) > 0 ? "plan renewal" : "no upcoming renewals"}</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${(summary?.awaiting_signatures ?? 0) > 0 ? "bg-indigo-500" : "bg-green-500"}`}>
            <Fingerprint className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold">{summary?.awaiting_signatures ?? 0}</p>
            <p className="text-xs text-muted-foreground">Awaiting Signatures</p>
            <p className="text-[10px] text-muted-foreground">{(summary?.awaiting_signatures ?? 0) > 0 ? "not fully signed" : "all signed"}</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents..." className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="flex gap-1 rounded-lg border bg-muted/30 p-0.5">
          {(["all", "expired", "expiring_soon", "valid", "no_expiry"] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${filterStatus === s ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >{s === "all" ? "All" : statusLabels[s]}</button>
          ))}
        </div>
        <button onClick={load} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border hover:bg-muted" title="Refresh">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => setShowAdd(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-3.5 w-3.5" /> Add Document
        </button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <AddDocumentForm
          categories={categories}
          companyUuid={companyUuid}
          onAdded={() => { setShowAdd(false); load() }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {/* Document list by category */}
      <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2.5 text-left">Document</th>
              <th className="px-3 py-2.5 text-left">Category</th>
              <th className="px-3 py-2.5 text-left">Status</th>
              <th className="px-3 py-2.5 text-left">Expiry</th>
              <th className="px-3 py-2.5 text-left">Uploaded</th>
              <th className="px-3 py-2.5 text-center w-20">Signed</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map(({ doc, category }) => (
              <tr key={doc.uuid} className="hover:bg-muted/30 transition-colors cursor-pointer group" onClick={() => setPanelDoc({ doc, category })}>
                <td className="px-3 py-2.5">
                  <span className="font-medium group-hover:text-primary transition-colors">{doc.title || "Untitled"}</span>
                </td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{category}</td>
                <td className="px-3 py-2.5">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase whitespace-nowrap ${statusColors[doc.document_status] ?? ""}`}>
                    {statusLabels[doc.document_status] ?? doc.document_status}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                  {doc.expires_at ? (
                    <span className={doc.document_status === "expired" ? "text-red-600 font-medium" : doc.document_status === "expiring_soon" ? "text-amber-600 font-medium" : "text-muted-foreground"}>
                      {fmtDate(doc.expires_at)}{doc.days_remaining != null && doc.document_status === "expiring_soon" ? ` (${doc.days_remaining}d)` : ""}
                    </span>
                  ) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(doc.uploaded_at)}</td>
                <td className="px-3 py-2.5 text-center">
                  {doc.signer1_signature
                    ? <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                    : <span className="text-xs text-muted-foreground">—</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Files className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {search || filterStatus !== "all" ? "No documents match your filters" : "No business documents yet"}
            </p>
            {!search && filterStatus === "all" && (
              <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                <Plus className="h-3.5 w-3.5" /> Add First Document
              </button>
            )}
          </div>
        )}
      </div>

      {/* Side Panel */}
      {panelDoc && (
        <DocumentPanel
          doc={panelDoc.doc}
          category={panelDoc.category}
          onClose={() => setPanelDoc(null)}
          onSign={handleSign}
          onDelete={handleDelete}
          onRefresh={load}
        />
      )}
    </div>
  )
}
