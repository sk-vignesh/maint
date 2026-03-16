"use client"
import * as React from "react"
import {
  FileText, Plus, Search, X, ChevronRight, CheckCircle2,
  AlertTriangle, Clock, Upload, Download, Trash2, Calendar,
  Shield, Building2, Pencil, Eye, Fingerprint, AlertCircle, Files,
} from "lucide-react"

// ─── TYPES ──────────────────────────────────────────────────────────────────────

interface BusinessDocument {
  id: string
  name: string
  category: string
  description: string
  fileName: string | null
  fileUrl: string | null
  uploadDate: string
  expiryDate: string | null
  status: "valid" | "expiring_soon" | "expired" | "no_expiry"
  uploadedBy: string
  signedBy: string | null
  signedAt: string | null
  notes: string
  version: number
  tags: string[]
}

// ─── CONSTANTS ──────────────────────────────────────────────────────────────────

const DOC_CATEGORIES = [
  "Operator's Licence",
  "Public Liability Insurance",
  "Employers' Liability Insurance",
  "Motor Fleet Insurance",
  "Goods in Transit Insurance",
  "Health & Safety Policy",
  "Risk Assessment",
  "Environmental Permit",
  "FORS Certificate",
  "ISO Certificate",
  "DVSA Earned Recognition",
  "Amazon Audit Certificate",
  "Client Audit Certificate",
  "Company Handbook",
  "Drug & Alcohol Policy",
  "Modern Slavery Statement",
  "GDPR Privacy Policy",
  "Training Certificate",
  "Other",
] as const

const catIcons: Record<string, typeof Shield> = {
  "Operator's Licence": Shield,
  "Public Liability Insurance": Shield,
  "Employers' Liability Insurance": Shield,
  "Motor Fleet Insurance": Shield,
  "Goods in Transit Insurance": Shield,
  "Health & Safety Policy": FileText,
  "Risk Assessment": AlertTriangle,
  "Environmental Permit": FileText,
  "FORS Certificate": CheckCircle2,
  "ISO Certificate": CheckCircle2,
  "DVSA Earned Recognition": CheckCircle2,
  "Amazon Audit Certificate": CheckCircle2,
  "Client Audit Certificate": CheckCircle2,
  "Company Handbook": FileText,
  "Drug & Alcohol Policy": FileText,
  "Modern Slavery Statement": FileText,
  "GDPR Privacy Policy": FileText,
  "Training Certificate": CheckCircle2,
  "Other": Files,
}

const statusColors: Record<BusinessDocument["status"], string> = {
  valid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  expiring_soon: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  expired: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  no_expiry: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
}

const statusLabels: Record<BusinessDocument["status"], string> = {
  valid: "Valid",
  expiring_soon: "Expiring Soon",
  expired: "Expired",
  no_expiry: "No Expiry",
}

// ─── HELPERS ────────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function daysUntil(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
}

function computeStatus(doc: { expiryDate: string | null }): BusinessDocument["status"] {
  if (!doc.expiryDate) return "no_expiry"
  const days = daysUntil(doc.expiryDate)
  if (days < 0) return "expired"
  if (days <= 30) return "expiring_soon"
  return "valid"
}

// ─── DEMO DATA ──────────────────────────────────────────────────────────────────

const demoDocs: BusinessDocument[] = [
  {
    id: "bd1", name: "Operator's Licence — Standard National", category: "Operator's Licence",
    description: "Standard national operator's licence for goods vehicles over 3.5 tonnes. Covers 3 operating centres.",
    fileName: "OLN-2024-0891.pdf", fileUrl: "#", uploadDate: "2024-06-15", expiryDate: "2029-06-15",
    status: "valid", uploadedBy: "G. Williams", signedBy: "G. Williams", signedAt: "2024-06-15",
    notes: "Renewed 2024. Covers up to 15 vehicles across 3 centres.", version: 3, tags: ["regulatory", "dvsa"],
  },
  {
    id: "bd2", name: "Employers' Liability Insurance Certificate", category: "Employers' Liability Insurance",
    description: "Mandatory employers' liability insurance. Minimum £5 million cover as required by UK law.",
    fileName: "EL-Insurance-2026.pdf", fileUrl: "#", uploadDate: "2026-01-10", expiryDate: "2026-12-31",
    status: "valid", uploadedBy: "G. Williams", signedBy: "G. Williams", signedAt: "2026-01-10",
    notes: "Provider: Allianz. Policy ref: EL-2026-GBR-0891", version: 1, tags: ["insurance", "mandatory"],
  },
  {
    id: "bd3", name: "Public Liability Insurance", category: "Public Liability Insurance",
    description: "Public liability insurance covering third-party claims. £10 million limit of indemnity.",
    fileName: "PL-Insurance-2026.pdf", fileUrl: "#", uploadDate: "2026-01-10", expiryDate: "2026-12-31",
    status: "valid", uploadedBy: "G. Williams", signedBy: "G. Williams", signedAt: "2026-01-10",
    notes: "Provider: Allianz. Policy ref: PL-2026-GBR-0892", version: 1, tags: ["insurance", "mandatory"],
  },
  {
    id: "bd4", name: "Motor Fleet Insurance Policy", category: "Motor Fleet Insurance",
    description: "Comprehensive motor fleet insurance covering all registered vehicles. Includes goods in transit.",
    fileName: "Fleet-Insurance-2026.pdf", fileUrl: "#", uploadDate: "2025-12-20", expiryDate: "2026-04-01",
    status: "expiring_soon", uploadedBy: "M. Patel", signedBy: "M. Patel", signedAt: "2025-12-20",
    notes: "Renewal due 1 Apr 2026. Broker: Willis Towers Watson.", version: 2, tags: ["insurance", "fleet"],
  },
  {
    id: "bd5", name: "Health & Safety Policy", category: "Health & Safety Policy",
    description: "Company health and safety policy document as required by Health and Safety at Work Act 1974.",
    fileName: "H-and-S-Policy-v4.pdf", fileUrl: "#", uploadDate: "2025-09-01", expiryDate: null,
    status: "no_expiry", uploadedBy: "G. Williams", signedBy: "G. Williams", signedAt: "2025-09-01",
    notes: "Version 4 — updated for new warehouse operations.", version: 4, tags: ["policy", "mandatory"],
  },
  {
    id: "bd6", name: "FORS Gold Accreditation", category: "FORS Certificate",
    description: "Fleet Operator Recognition Scheme Gold accreditation certificate.",
    fileName: "FORS-Gold-2026.pdf", fileUrl: "#", uploadDate: "2025-11-15", expiryDate: "2026-11-15",
    status: "valid", uploadedBy: "G. Williams", signedBy: "G. Williams", signedAt: "2025-11-15",
    notes: "Accreditation number: FORS-G-12345. Annual renewal.", version: 1, tags: ["accreditation", "fors"],
  },
  {
    id: "bd7", name: "Amazon DSP Audit Certificate — Q4 2025", category: "Amazon Audit Certificate",
    description: "Amazon Delivery Service Partner audit compliance certificate for Q4 2025.",
    fileName: "Amazon-Audit-Q4-2025.pdf", fileUrl: "#", uploadDate: "2025-12-22", expiryDate: "2026-03-31",
    status: "expiring_soon", uploadedBy: "M. Patel", signedBy: "M. Patel", signedAt: "2025-12-22",
    notes: "Score: 98%. Next audit scheduled Q1 2026.", version: 1, tags: ["amazon", "audit"],
  },
  {
    id: "bd8", name: "Drug & Alcohol Testing Policy", category: "Drug & Alcohol Policy",
    description: "Company drug and alcohol testing policy covering all drivers and warehouse staff.",
    fileName: "Drug-Alcohol-Policy-v2.pdf", fileUrl: "#", uploadDate: "2024-03-01", expiryDate: null,
    status: "no_expiry", uploadedBy: "G. Williams", signedBy: "G. Williams", signedAt: "2024-03-01",
    notes: "Version 2 — aligned with Amazon requirements.", version: 2, tags: ["policy", "audit"],
  },
  {
    id: "bd9", name: "ISO 45001 Certificate", category: "ISO Certificate",
    description: "Occupational Health and Safety Management System certification.",
    fileName: "ISO-45001-cert.pdf", fileUrl: "#", uploadDate: "2024-08-20", expiryDate: "2025-08-20",
    status: "expired", uploadedBy: "G. Williams", signedBy: "G. Williams", signedAt: "2024-08-20",
    notes: "EXPIRED — Renewal audit pending. Auditor: BSI Group.", version: 1, tags: ["iso", "certification"],
  },
  {
    id: "bd10", name: "GDPR Privacy Policy", category: "GDPR Privacy Policy",
    description: "Data protection and privacy policy in compliance with UK GDPR and the Data Protection Act 2018.",
    fileName: "GDPR-Policy-v3.pdf", fileUrl: "#", uploadDate: "2025-05-25", expiryDate: null,
    status: "no_expiry", uploadedBy: "G. Williams", signedBy: null, signedAt: null,
    notes: "Version 3 — updated for new driver tracking systems.", version: 3, tags: ["policy", "gdpr"],
  },
]

// ─── SIDE PANEL ─────────────────────────────────────────────────────────────────

function DocumentPanel({
  doc, onClose, onSign, onUpdate,
}: {
  doc: BusinessDocument
  onClose: () => void
  onSign: () => void
  onUpdate: (d: BusinessDocument) => void
}) {
  const [editing, setEditing] = React.useState(false)
  const [editName, setEditName] = React.useState(doc.name)
  const [editDesc, setEditDesc] = React.useState(doc.description)
  const [editExpiry, setEditExpiry] = React.useState(doc.expiryDate || "")
  const [editNotes, setEditNotes] = React.useState(doc.notes)
  const [editTags, setEditTags] = React.useState(doc.tags.join(", "))
  const CatIcon = catIcons[doc.category] || Files
  const status = computeStatus(doc)

  function save() {
    onUpdate({
      ...doc,
      name: editName,
      description: editDesc,
      expiryDate: editExpiry || null,
      notes: editNotes,
      tags: editTags.split(",").map(t => t.trim()).filter(Boolean),
      status: computeStatus({ expiryDate: editExpiry || null }),
    })
    setEditing(false)
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-background border-l shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center gap-3 border-b px-5 py-4">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            status === "expired" ? "bg-red-500" : status === "expiring_soon" ? "bg-amber-500" : "bg-indigo-500"
          }`}>
            <CatIcon className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold truncate">{doc.name}</h3>
            <p className="text-[10px] text-muted-foreground uppercase">{doc.category}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg border hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-5">
            {/* Status + Signature bar */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase ${statusColors[status]}`}>{statusLabels[status]}</span>
              {doc.expiryDate && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {status === "expired"
                    ? `Expired ${fmtDate(doc.expiryDate)}`
                    : `Expires ${fmtDate(doc.expiryDate)} (${daysUntil(doc.expiryDate)} days)`
                  }
                </span>
              )}
              {doc.signedBy ? (
                <span className="ml-auto rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 px-2.5 py-1 text-[10px] font-medium text-green-700 dark:text-green-400 flex items-center gap-1">
                  <Fingerprint className="h-3 w-3" /> Signed by {doc.signedBy} · {doc.signedAt ? fmtDate(doc.signedAt) : ""}
                </span>
              ) : (
                <button onClick={onSign} className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-indigo-700">
                  <Fingerprint className="h-3.5 w-3.5" /> Sign Document
                </button>
              )}
            </div>

            {/* Details (read or edit) */}
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
                    { label: "File", value: doc.fileName || "No file uploaded" },
                    { label: "Uploaded", value: `${fmtDate(doc.uploadDate)} by ${doc.uploadedBy}` },
                    { label: "Expiry", value: doc.expiryDate ? fmtDate(doc.expiryDate) : "No expiry date" },
                    { label: "Version", value: `v${doc.version}` },
                    { label: "Notes", value: doc.notes || "—" },
                  ].map(r => (
                    <div key={r.label}>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase">{r.label}</p>
                      <p className="text-sm">{r.value}</p>
                    </div>
                  ))}
                  {doc.tags.length > 0 && (
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase mb-1">Tags</p>
                      <div className="flex flex-wrap gap-1">
                        {doc.tags.map(t => (
                          <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <h4 className="text-sm font-bold mb-3">Edit Document</h4>
                <div className="grid gap-3">
                  <div>
                    <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase">Name</label>
                    <input value={editName} onChange={e => setEditName(e.target.value)} className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
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
                  <div>
                    <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase">Tags (comma separated)</label>
                    <input value={editTags} onChange={e => setEditTags(e.target.value)} placeholder="e.g. insurance, mandatory" className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                  <button onClick={save} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90">Save</button>
                  <button onClick={() => setEditing(false)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs hover:bg-muted">Cancel</button>
                </div>
              </div>
            )}

            {/* File actions */}
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <h4 className="text-sm font-bold mb-3">File</h4>
              {doc.fileName ? (
                <div className="flex items-center gap-3 rounded-lg bg-muted/30 p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.fileName}</p>
                    <p className="text-[10px] text-muted-foreground">Uploaded {fmtDate(doc.uploadDate)}</p>
                  </div>
                  <div className="flex gap-1">
                    <button className="inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs hover:bg-muted">
                      <Eye className="h-3 w-3" /> View
                    </button>
                    <button className="inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs hover:bg-muted">
                      <Download className="h-3 w-3" /> Download
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-6 text-center rounded-lg border-2 border-dashed">
                  <Upload className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">No file attached</p>
                  <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                    <Upload className="h-3.5 w-3.5" /> Upload File
                  </button>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-2">File upload will be available when connected to backend</p>
            </div>

            {/* Audit trail */}
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <h4 className="text-sm font-bold mb-3">Audit Trail</h4>
              <div className="space-y-2">
                {doc.signedAt && (
                  <div className="flex items-start gap-2 text-xs">
                    <Fingerprint className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium">Signed</span>
                      <span className="text-muted-foreground"> by {doc.signedBy} on {fmtDate(doc.signedAt)}</span>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2 text-xs">
                  <Upload className="h-3.5 w-3.5 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium">Uploaded</span>
                    <span className="text-muted-foreground"> by {doc.uploadedBy} on {fmtDate(doc.uploadDate)} (v{doc.version})</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="border-t px-5 py-3 flex items-center gap-2">
          {!doc.signedBy && (
            <button onClick={onSign} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-xs font-medium text-white hover:bg-indigo-700">
              <Fingerprint className="h-3.5 w-3.5" /> Sign Document
            </button>
          )}
          <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-4 text-xs hover:bg-muted">
            <Upload className="h-3.5 w-3.5" /> Replace File
          </button>
          <div className="flex-1" />
          <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 px-4 text-xs text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      </div>
    </>
  )
}

// ─── ADD DOCUMENT FORM ──────────────────────────────────────────────────────────

function AddDocumentForm({ onAdd, onCancel }: {
  onAdd: (doc: BusinessDocument) => void
  onCancel: () => void
}) {
  const [name, setName] = React.useState("")
  const [category, setCategory] = React.useState<string>(DOC_CATEGORIES[0])
  const [description, setDescription] = React.useState("")
  const [expiryDate, setExpiryDate] = React.useState("")
  const [notes, setNotes] = React.useState("")

  function submit() {
    if (!name.trim()) return
    const doc: BusinessDocument = {
      id: `bd${Date.now()}`, name: name.trim(), category, description: description.trim(),
      fileName: null, fileUrl: null, uploadDate: new Date().toISOString().slice(0, 10),
      expiryDate: expiryDate || null, status: computeStatus({ expiryDate: expiryDate || null }),
      uploadedBy: "Current User", signedBy: null, signedAt: null,
      notes: notes.trim(), version: 1, tags: [],
    }
    onAdd(doc)
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
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase">Document Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Employers' Liability Insurance 2026" className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase">Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
            {DOC_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase">Expiry Date <span className="normal-case">(optional)</span></label>
          <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Brief description of this document..." className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase">Notes</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Policy ref, provider, etc." className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>
      <div className="flex gap-2 mt-4 pt-3 border-t">
        <button onClick={submit} disabled={!name.trim()} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          <Plus className="h-3 w-3" /> Add Document
        </button>
        <p className="text-[10px] text-muted-foreground self-center ml-2">You can attach a file after creating the document</p>
      </div>
    </div>
  )
}

// ─── MAIN EXPORT ────────────────────────────────────────────────────────────────

export function BusinessDocsTab() {
  const [docs, setDocs] = React.useState<BusinessDocument[]>(demoDocs)
  const [search, setSearch] = React.useState("")
  const [filterCat, setFilterCat] = React.useState("all")
  const [filterStatus, setFilterStatus] = React.useState<"all" | BusinessDocument["status"]>("all")
  const [sortBy, setSortBy] = React.useState<"name" | "expiry" | "upload" | "status">("expiry")
  const [panelDoc, setPanelDoc] = React.useState<BusinessDocument | null>(null)
  const [showAdd, setShowAdd] = React.useState(false)

  // Update status on each render based on dates
  const docsWithStatus = docs.map(d => ({ ...d, status: computeStatus(d) }))

  // KPIs
  const totalDocs = docsWithStatus.length
  const expiredCount = docsWithStatus.filter(d => d.status === "expired").length
  const expiringCount = docsWithStatus.filter(d => d.status === "expiring_soon").length
  const unsignedCount = docsWithStatus.filter(d => !d.signedBy).length

  // Filter + search
  const filtered = docsWithStatus
    .filter(d => filterCat === "all" || d.category === filterCat)
    .filter(d => filterStatus === "all" || d.status === filterStatus)
    .filter(d => !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.category.toLowerCase().includes(search.toLowerCase()) || d.tags.some(t => t.toLowerCase().includes(search.toLowerCase())))

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name)
    if (sortBy === "upload") return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
    if (sortBy === "status") {
      const order = { expired: 0, expiring_soon: 1, valid: 2, no_expiry: 3 }
      return order[a.status] - order[b.status]
    }
    // expiry – nulls last
    if (!a.expiryDate && !b.expiryDate) return 0
    if (!a.expiryDate) return 1
    if (!b.expiryDate) return -1
    return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
  })

  function handleAdd(doc: BusinessDocument) {
    setDocs(prev => [doc, ...prev])
    setShowAdd(false)
  }

  function handleUpdate(updated: BusinessDocument) {
    setDocs(prev => prev.map(d => d.id === updated.id ? updated : d))
    setPanelDoc(updated)
  }

  function handleSign(doc: BusinessDocument) {
    const signed = {
      ...doc,
      signedBy: "Current User",
      signedAt: new Date().toISOString().slice(0, 10),
    }
    handleUpdate(signed)
  }

  // Unique categories from data
  const usedCategories = [...new Set(docsWithStatus.map(d => d.category))].sort()

  return (
    <div className="flex flex-col gap-5">
      {/* KPIs — same pattern as Vehicle / Driver sub-tabs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${expiredCount > 0 ? "bg-red-500" : "bg-green-500"}`}>
            <AlertTriangle className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold">{expiredCount}</p>
            <p className="text-xs text-muted-foreground">Expired / Overdue</p>
            <p className="text-[10px] text-muted-foreground">{expiredCount > 0 ? "requires immediate action" : "all current"}</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${expiringCount > 0 ? "bg-amber-500" : "bg-green-500"}`}>
            <Clock className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold">{expiringCount}</p>
            <p className="text-xs text-muted-foreground">Expiring ≤ 30 Days</p>
            <p className="text-[10px] text-muted-foreground">{expiringCount > 0 ? "plan renewal" : "no upcoming renewals"}</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${unsignedCount > 0 ? "bg-indigo-500" : "bg-green-500"}`}>
            <Fingerprint className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold">{unsignedCount}</p>
            <p className="text-xs text-muted-foreground">Awaiting Signatures</p>
            <p className="text-[10px] text-muted-foreground">{unsignedCount > 0 ? "not fully signed" : "all signed"}</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents..." className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="h-9 rounded-lg border bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All Categories</option>
          {usedCategories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex gap-1 rounded-lg border bg-muted/30 p-0.5">
          {(["all", "expired", "expiring_soon", "valid", "no_expiry"] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${filterStatus === s ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >{s === "all" ? "All" : statusLabels[s]}</button>
          ))}
        </div>
        <button onClick={() => setShowAdd(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="h-3.5 w-3.5" /> Add Document
        </button>
      </div>

      {/* Add Form */}
      {showAdd && <AddDocumentForm onAdd={handleAdd} onCancel={() => setShowAdd(false)} />}

      {/* Document List */}
      <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2.5 text-left">
                <button onClick={() => setSortBy("name")} className={`hover:text-foreground ${sortBy === "name" ? "text-foreground" : ""}`}>Document {sortBy === "name" && "↓"}</button>
              </th>
              <th className="px-3 py-2.5 text-left">Category</th>
              <th className="px-3 py-2.5 text-left">
                <button onClick={() => setSortBy("status")} className={`hover:text-foreground ${sortBy === "status" ? "text-foreground" : ""}`}>Status {sortBy === "status" && "↓"}</button>
              </th>
              <th className="px-3 py-2.5 text-left">
                <button onClick={() => setSortBy("expiry")} className={`hover:text-foreground ${sortBy === "expiry" ? "text-foreground" : ""}`}>Expiry {sortBy === "expiry" && "↓"}</button>
              </th>
              <th className="px-3 py-2.5 text-left">
                <button onClick={() => setSortBy("upload")} className={`hover:text-foreground ${sortBy === "upload" ? "text-foreground" : ""}`}>Uploaded {sortBy === "upload" && "↓"}</button>
              </th>
              <th className="px-3 py-2.5 text-left">Uploaded By</th>
              <th className="px-3 py-2.5 text-center w-20">Signed</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sorted.map(doc => (
              <tr key={doc.id} className="hover:bg-muted/30 transition-colors cursor-pointer group" onClick={() => setPanelDoc(doc)}>
                <td className="px-3 py-2.5">
                  <span className="font-medium group-hover:text-primary transition-colors">{doc.name}</span>
                </td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{doc.category}</td>
                <td className="px-3 py-2.5">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase whitespace-nowrap ${statusColors[doc.status]}`}>{statusLabels[doc.status]}</span>
                </td>
                <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                  {doc.expiryDate ? (
                    <span className={doc.status === "expired" ? "text-red-600 font-medium" : doc.status === "expiring_soon" ? "text-amber-600 font-medium" : "text-muted-foreground"}>
                      {fmtDate(doc.expiryDate)}{doc.status === "expiring_soon" && ` (${daysUntil(doc.expiryDate)}d)`}
                    </span>
                  ) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(doc.uploadDate)}</td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{doc.uploadedBy}</td>
                <td className="px-3 py-2.5 text-center">
                  {doc.signedBy
                    ? <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                    : <span className="text-xs text-muted-foreground">—</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Files className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">{search ? "No documents match your search" : "No business documents yet"}</p>
            <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="h-3.5 w-3.5" /> Add First Document
            </button>
          </div>
        )}
      </div>

      {/* Side Panel */}
      {panelDoc && (
        <DocumentPanel
          doc={panelDoc}
          onClose={() => setPanelDoc(null)}
          onSign={() => handleSign(panelDoc)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  )
}
