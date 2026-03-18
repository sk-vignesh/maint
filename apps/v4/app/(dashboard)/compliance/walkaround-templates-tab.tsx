"use client"
import * as React from "react"
import {
  Plus, Pencil, Copy, Trash2, CheckCircle2, ChevronUp, ChevronDown,
  X, Truck, ClipboardList, Save, Star, AlertTriangle,
} from "lucide-react"

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface CheckItem    { id: string; text: string }
export interface CheckSection { id: string; name: string; items: CheckItem[] }
export interface WalkaroundTemplate {
  id: string
  name: string
  description: string
  sections: CheckSection[]
  assignedVehicles: string[]   // reg plates
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

// ─── DEMO DATA ────────────────────────────────────────────────────────────────

export const ALL_VEHICLES = [
  "NUX9VAM", "TB67KLM", "LK21DVA", "PN19RFX", "OU70TBN", "YJ19HKP",
]

function mkId() { return Math.random().toString(36).slice(2, 9) }

export const SEED_TEMPLATES: WalkaroundTemplate[] = [
  {
    id: "tpl1", name: "Standard HGV", description: "Default DVSA-aligned walkaround for all HGV goods vehicles.",
    isDefault: true, createdAt: "2026-01-01", updatedAt: "2026-01-01",
    assignedVehicles: ["NUX9VAM", "TB67KLM", "LK21DVA", "PN19RFX"],
    sections: [
      { id: "s1", name: "Tyres & Wheels", items: [
        { id: mkId(), text: "Offside front tyre condition/pressure" },
        { id: mkId(), text: "Nearside front tyre condition/pressure" },
        { id: mkId(), text: "Offside rear tyres (dual)" },
        { id: mkId(), text: "Nearside rear tyres (dual)" },
        { id: mkId(), text: "Wheel nuts visible security" },
      ]},
      { id: "s2", name: "Lights", items: [
        { id: mkId(), text: "Headlights main & dipped" },
        { id: mkId(), text: "Tail lights" },
        { id: mkId(), text: "Brake lights" },
        { id: mkId(), text: "Indicators (all 4)" },
        { id: mkId(), text: "Reverse light & audible warning" },
        { id: mkId(), text: "Marker lights" },
      ]},
      { id: "s3", name: "Brakes", items: [
        { id: mkId(), text: "Air pressure build-up" },
        { id: mkId(), text: "Handbrake holds on incline" },
        { id: mkId(), text: "Brake pedal feel (no sponginess)" },
      ]},
      { id: "s4", name: "Fluids & Engine", items: [
        { id: mkId(), text: "Engine oil level" },
        { id: mkId(), text: "Coolant level" },
        { id: mkId(), text: "AdBlue level" },
        { id: mkId(), text: "No visible fuel/oil leaks" },
        { id: mkId(), text: "Windscreen washer fluid" },
      ]},
      { id: "s5", name: "Body & Cab", items: [
        { id: mkId(), text: "Windscreen (no cracks in driver's eye-line)" },
        { id: mkId(), text: "Wipers functioning" },
        { id: mkId(), text: "All mirrors present & adjusted" },
        { id: mkId(), text: "Horn working" },
        { id: mkId(), text: "No body damage that changes vehicle width" },
      ]},
    ],
  },
  {
    id: "tpl2", name: "Refrigerated Unit", description: "Extends the Standard HGV with reefer-specific checks.",
    isDefault: false, createdAt: "2026-01-15", updatedAt: "2026-02-10",
    assignedVehicles: ["OU70TBN"],
    sections: [
      { id: "s1", name: "Tyres & Wheels", items: [
        { id: mkId(), text: "Offside front tyre condition/pressure" },
        { id: mkId(), text: "Nearside front tyre condition/pressure" },
        { id: mkId(), text: "Offside rear tyres (dual)" },
        { id: mkId(), text: "Nearside rear tyres (dual)" },
        { id: mkId(), text: "Wheel nuts visible security" },
      ]},
      { id: "s2", name: "Lights", items: [
        { id: mkId(), text: "Headlights main & dipped" },
        { id: mkId(), text: "Tail lights" },
        { id: mkId(), text: "Brake lights" },
        { id: mkId(), text: "Indicators (all 4)" },
        { id: mkId(), text: "Reverse light & audible warning" },
      ]},
      { id: "s3", name: "Brakes", items: [
        { id: mkId(), text: "Air pressure build-up" },
        { id: mkId(), text: "Handbrake holds on incline" },
        { id: mkId(), text: "Brake pedal feel" },
      ]},
      { id: "s4", name: "Fluids & Engine", items: [
        { id: mkId(), text: "Engine oil level" },
        { id: mkId(), text: "Coolant level" },
        { id: mkId(), text: "AdBlue level" },
        { id: mkId(), text: "No visible fuel/oil leaks" },
      ]},
      { id: "sR1", name: "Refrigeration Unit", items: [
        { id: mkId(), text: "Reefer unit starts and runs without fault code" },
        { id: mkId(), text: "Set temperature achieved before loading" },
        { id: mkId(), text: "Reefer fuel level (diesel, if separate tank)" },
        { id: mkId(), text: "Door seals & gaskets intact — no tears" },
        { id: mkId(), text: "Cargo area temperature recorded (probe)" },
        { id: mkId(), text: "Reefer unit hours logged" },
      ]},
    ],
  },
  {
    id: "tpl3", name: "Tail-Lift Vehicle", description: "Extends the Standard HGV with LOLER tail-lift pre-use checks.",
    isDefault: false, createdAt: "2026-02-01", updatedAt: "2026-02-01",
    assignedVehicles: ["YJ19HKP"],
    sections: [
      { id: "s1", name: "Tyres & Wheels", items: [
        { id: mkId(), text: "Offside front tyre condition/pressure" },
        { id: mkId(), text: "Nearside front tyre condition/pressure" },
        { id: mkId(), text: "Offside rear tyres (dual)" },
        { id: mkId(), text: "Nearside rear tyres (dual)" },
        { id: mkId(), text: "Wheel nuts visible security" },
      ]},
      { id: "s2", name: "Lights", items: [
        { id: mkId(), text: "Headlights main & dipped" },
        { id: mkId(), text: "Tail lights & brake lights" },
        { id: mkId(), text: "Indicators & marker lights" },
        { id: mkId(), text: "Reverse light & audible warning" },
      ]},
      { id: "s3", name: "Brakes", items: [
        { id: mkId(), text: "Air pressure build-up" },
        { id: mkId(), text: "Handbrake tested" },
        { id: mkId(), text: "Brake pedal feel" },
      ]},
      { id: "s4", name: "Fluids & Engine", items: [
        { id: mkId(), text: "Engine oil, coolant, AdBlue levels" },
        { id: mkId(), text: "No visible leaks" },
        { id: mkId(), text: "Hydraulic fluid level (tail-lift)" },
      ]},
      { id: "sTL", name: "Tail-Lift (LOLER)", items: [
        { id: mkId(), text: "LOLER inspection certificate in date" },
        { id: mkId(), text: "Lift platform — no cracks, weld failures, or deformation" },
        { id: mkId(), text: "Safety edge / anti-trap device functional" },
        { id: mkId(), text: "Platform lip/gate latches correctly" },
        { id: mkId(), text: "Control buttons: raise, lower, tilt — all responsive" },
        { id: mkId(), text: "No hydraulic leaks under deck or at cylinder" },
        { id: mkId(), text: "Maximum load label legible and in place" },
        { id: mkId(), text: "Emergency stop tested and functional" },
      ]},
    ],
  },
]

// ─── SECTION EDITOR ───────────────────────────────────────────────────────────

function SectionEditor({
  section, onChange, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown,
}: {
  section: CheckSection
  onChange: (s: CheckSection) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
}) {
  const [newItemText, setNewItemText] = React.useState("")

  function addItem() {
    if (!newItemText.trim()) return
    onChange({ ...section, items: [...section.items, { id: mkId(), text: newItemText.trim() }] })
    setNewItemText("")
  }

  function deleteItem(id: string) {
    onChange({ ...section, items: section.items.filter(i => i.id !== id) })
  }

  function moveItem(idx: number, dir: -1 | 1) {
    const items = [...section.items]
    const [item] = items.splice(idx, 1)
    items.splice(idx + dir, 0, item)
    onChange({ ...section, items })
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      {/* Section header */}
      <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2">
        <div className="flex flex-col gap-0.5">
          <button onClick={onMoveUp}  disabled={!canMoveUp}  className="h-4 w-4 flex items-center justify-center rounded hover:bg-muted disabled:opacity-20"><ChevronUp className="h-3 w-3" /></button>
          <button onClick={onMoveDown} disabled={!canMoveDown} className="h-4 w-4 flex items-center justify-center rounded hover:bg-muted disabled:opacity-20"><ChevronDown className="h-3 w-3" /></button>
        </div>
        <input
          value={section.name}
          onChange={e => onChange({ ...section, name: e.target.value })}
          className="flex-1 bg-transparent text-sm font-semibold outline-none focus:underline"
          placeholder="Section name…"
        />
        <span className="text-[10px] text-muted-foreground">{section.items.length} items</span>
        <button onClick={onDelete} className="h-6 w-6 flex items-center justify-center rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Items */}
      <div className="divide-y">
        {section.items.map((item, idx) => (
          <div key={item.id} className="flex items-center gap-1.5 px-3 py-1.5 group">
            <div className="flex flex-col gap-0.5 shrink-0">
              <button onClick={() => moveItem(idx, -1)} disabled={idx === 0} className="h-3.5 w-4 flex items-center justify-center rounded hover:bg-muted disabled:opacity-20"><ChevronUp className="h-2.5 w-2.5" /></button>
              <button onClick={() => moveItem(idx, 1)}  disabled={idx === section.items.length - 1} className="h-3.5 w-4 flex items-center justify-center rounded hover:bg-muted disabled:opacity-20"><ChevronDown className="h-2.5 w-2.5" /></button>
            </div>
            <span className="text-[10px] text-muted-foreground w-4 shrink-0 text-right">{idx + 1}</span>
            <input
              value={item.text}
              onChange={e => onChange({ ...section, items: section.items.map(i => i.id === item.id ? { ...i, text: e.target.value } : i) })}
              className="flex-1 bg-transparent text-xs outline-none focus:underline min-w-0"
            />
            <button onClick={() => deleteItem(item.id)} className="shrink-0 h-5 w-5 flex items-center justify-center rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Add item */}
      <div className="flex items-center gap-1.5 border-t px-3 py-1.5">
        <input
          value={newItemText}
          onChange={e => setNewItemText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") addItem() }}
          placeholder="Add check item…"
          className="flex-1 bg-transparent text-xs text-muted-foreground placeholder:text-muted-foreground/50 outline-none"
        />
        <button onClick={addItem} disabled={!newItemText.trim()} className="h-6 w-6 flex items-center justify-center rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── TEMPLATE EDITOR ─────────────────────────────────────────────────────────

function TemplateEditor({
  template, onSave, onCancel,
}: {
  template: WalkaroundTemplate
  onSave: (t: WalkaroundTemplate) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = React.useState<WalkaroundTemplate>(() =>
    JSON.parse(JSON.stringify(template))
  )

  function addSection() {
    setDraft(d => ({
      ...d,
      sections: [...d.sections, { id: mkId(), name: "New Section", items: [] }],
    }))
  }

  function updateSection(idx: number, s: CheckSection) {
    setDraft(d => { const secs = [...d.sections]; secs[idx] = s; return { ...d, sections: secs } })
  }

  function deleteSection(idx: number) {
    setDraft(d => ({ ...d, sections: d.sections.filter((_, i) => i !== idx) }))
  }

  function moveSection(idx: number, dir: -1 | 1) {
    setDraft(d => {
      const secs = [...d.sections]
      const [sec] = secs.splice(idx, 1)
      secs.splice(idx + dir, 0, sec)
      return { ...d, sections: secs }
    })
  }

  const totalItems = draft.sections.reduce((n, s) => n + s.items.length, 0)

  return (
    <div className="flex flex-col gap-5">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs hover:bg-muted">
          ← Back
        </button>
        <span className="text-sm font-semibold">
          {template.id.startsWith("new_") ? "New Template" : `Editing: ${template.name}`}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{draft.sections.length} sections · {totalItems} items</span>
          <button
            onClick={() => onSave({ ...draft, updatedAt: new Date().toISOString().slice(0, 10) })}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Save className="h-3.5 w-3.5" /> Save Template
          </button>
        </div>
      </div>

      {/* Meta */}
      <div className="rounded-xl border bg-card p-4 shadow-sm grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase">Template Name</label>
          <input
            value={draft.name}
            onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
            className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="e.g. Refrigerated Unit"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase">Description</label>
          <input
            value={draft.description}
            onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
            className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="Brief description…"
          />
        </div>
        <div className="sm:col-span-2 flex items-center gap-2">
          <input
            id="isDefault"
            type="checkbox"
            checked={draft.isDefault}
            onChange={e => setDraft(d => ({ ...d, isDefault: e.target.checked }))}
            className="h-4 w-4 rounded"
          />
          <label htmlFor="isDefault" className="text-sm">
            Set as <strong>default template</strong> (used for vehicles with no assigned template)
          </label>
        </div>
      </div>

      {/* Sections */}
      <div className="flex flex-col gap-3">
        {draft.sections.map((sec, idx) => (
          <SectionEditor
            key={sec.id}
            section={sec}
            onChange={s => updateSection(idx, s)}
            onDelete={() => deleteSection(idx)}
            onMoveUp={() => moveSection(idx, -1)}
            onMoveDown={() => moveSection(idx, 1)}
            canMoveUp={idx > 0}
            canMoveDown={idx < draft.sections.length - 1}
          />
        ))}
        <button
          onClick={addSection}
          className="inline-flex h-9 items-center gap-2 rounded-xl border-2 border-dashed border-indigo-300 px-4 text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Section
        </button>
      </div>
    </div>
  )
}

// ─── VEHICLE ASSIGNMENT PANEL ─────────────────────────────────────────────────

function VehicleAssignmentPanel({
  template,
  allTemplates,
  onChange,
}: {
  template: WalkaroundTemplate
  allTemplates: WalkaroundTemplate[]
  onChange: (assignedVehicles: string[]) => void
}) {
  function toggleVehicle(reg: string) {
    const already = template.assignedVehicles.includes(reg)
    onChange(
      already
        ? template.assignedVehicles.filter(v => v !== reg)
        : [...template.assignedVehicles, reg]
    )
  }

  function getAssignedTemplateName(reg: string) {
    const t = allTemplates.find(t => t.assignedVehicles.includes(reg) && t.id !== template.id)
    return t?.name ?? null
  }

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <h4 className="text-sm font-bold mb-1">Vehicle Assignment</h4>
      <p className="text-[11px] text-muted-foreground mb-3">Assigning a vehicle here removes it from its current template. One template per vehicle.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {ALL_VEHICLES.map(reg => {
          const assigned = template.assignedVehicles.includes(reg)
          const otherTpl = getAssignedTemplateName(reg)
          return (
            <button
              key={reg}
              onClick={() => toggleVehicle(reg)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors text-left ${
                assigned
                  ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300"
                  : "hover:bg-muted"
              }`}
            >
              <Truck className={`h-3.5 w-3.5 shrink-0 ${assigned ? "text-indigo-500" : "text-muted-foreground"}`} />
              <div className="min-w-0">
                <p className="font-mono font-semibold truncate">{reg}</p>
                {!assigned && otherTpl && <p className="text-[10px] text-muted-foreground truncate">{otherTpl}</p>}
                {assigned && <p className="text-[10px] text-indigo-500">Assigned</p>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────

export function WalkaroundTemplatesTab({
  templates,
  onTemplatesChange,
}: {
  templates: WalkaroundTemplate[]
  onTemplatesChange: (t: WalkaroundTemplate[]) => void
}) {
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [expandedAssignment, setExpandedAssignment] = React.useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null)

  const editing = editingId ? templates.find(t => t.id === editingId) ?? null : null

  function saveTemplate(updated: WalkaroundTemplate) {
    // If marked as default, unset all others
    const next = templates.some(t => t.id === updated.id)
      ? templates.map(t => t.id === updated.id ? updated : updated.isDefault ? { ...t, isDefault: false } : t)
      : [...templates.map(t => updated.isDefault ? { ...t, isDefault: false } : t), updated]
    onTemplatesChange(next)
    setEditingId(null)
  }

  function copyTemplate(tpl: WalkaroundTemplate) {
    const copy: WalkaroundTemplate = {
      ...JSON.parse(JSON.stringify(tpl)),
      id: `new_${mkId()}`,
      name: `Copy of ${tpl.name}`,
      isDefault: false,
      assignedVehicles: [],
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
    }
    onTemplatesChange([...templates, copy])
    setEditingId(copy.id)
  }

  function deleteTemplate(id: string) {
    onTemplatesChange(templates.filter(t => t.id !== id))
    setDeleteConfirm(null)
  }

  function newTemplate() {
    const tpl: WalkaroundTemplate = {
      id: `new_${mkId()}`, name: "", description: "", isDefault: false,
      assignedVehicles: [], sections: [],
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
    }
    onTemplatesChange([...templates, tpl])
    setEditingId(tpl.id)
  }

  function updateAssignment(id: string, assignedVehicles: string[]) {
    // Remove these vehicles from any other template first
    const next = templates.map(t => {
      if (t.id === id) return { ...t, assignedVehicles }
      return { ...t, assignedVehicles: t.assignedVehicles.filter(v => !assignedVehicles.includes(v)) }
    })
    onTemplatesChange(next)
  }

  // ── Editor view ──
  if (editing) {
    return (
      <div className="flex gap-5">
        <div className="flex-1 min-w-0">
          <TemplateEditor
            template={editing}
            onSave={saveTemplate}
            onCancel={() => setEditingId(null)}
          />
        </div>
        <div className="w-72 shrink-0">
          <VehicleAssignmentPanel
            template={editing}
            allTemplates={templates}
            onChange={veh => {
              // update draft inline without closing editor
              const updated = { ...editing, assignedVehicles: veh }
              const next = templates.map(t => {
                if (t.id === updated.id) return updated
                return { ...t, assignedVehicles: t.assignedVehicles.filter(v => !veh.includes(v)) }
              })
              onTemplatesChange(next)
            }}
          />
        </div>
      </div>
    )
  }

  // ── List view ──
  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Walkaround Templates</p>
          <p className="text-xs text-muted-foreground">Create named question templates and assign them to vehicles. Drivers see the questions for their assigned vehicle.</p>
        </div>
        <button onClick={newTemplate} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-3.5 w-3.5" /> New Template
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5 text-left">Template</th>
              <th className="px-4 py-2.5 text-center">Sections</th>
              <th className="px-4 py-2.5 text-center">Questions</th>
              <th className="px-4 py-2.5 text-left">Assigned Vehicles</th>
              <th className="px-4 py-2.5 text-left">Last Modified</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {templates.map(tpl => {
              const totalQ = tpl.sections.reduce((n, s) => n + s.items.length, 0)
              return (
                <React.Fragment key={tpl.id}>
                  <tr className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-indigo-500 shrink-0" />
                        <div>
                          <p className="font-medium">{tpl.name || <span className="text-muted-foreground italic">Untitled</span>}</p>
                          {tpl.description && <p className="text-[11px] text-muted-foreground">{tpl.description}</p>}
                        </div>
                        {tpl.isDefault && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                            <Star className="h-2.5 w-2.5" /> Default
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-muted-foreground">{tpl.sections.length}</td>
                    <td className="px-4 py-3 text-center text-xs text-muted-foreground">{totalQ}</td>
                    <td className="px-4 py-3">
                      {tpl.assignedVehicles.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {tpl.assignedVehicles.map(reg => (
                            <span key={reg} className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono font-medium">{reg}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{tpl.updatedAt}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setExpandedAssignment(expandedAssignment === tpl.id ? null : tpl.id)}
                          className="inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-xs hover:bg-muted"
                        >
                          <Truck className="h-3 w-3" /> Assign
                        </button>
                        <button
                          onClick={() => setEditingId(tpl.id)}
                          className="inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-xs hover:bg-muted"
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                        <button
                          onClick={() => copyTemplate(tpl)}
                          className="inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-xs hover:bg-muted"
                        >
                          <Copy className="h-3 w-3" /> Copy
                        </button>
                        {deleteConfirm === tpl.id ? (
                          <>
                            <button onClick={() => deleteTemplate(tpl.id)} className="inline-flex h-7 items-center gap-1 rounded-lg bg-red-600 px-2 text-xs font-medium text-white hover:bg-red-700">Confirm</button>
                            <button onClick={() => setDeleteConfirm(null)} className="inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-xs hover:bg-muted">Cancel</button>
                          </>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(tpl.id)}
                            disabled={tpl.isDefault}
                            className="inline-flex h-7 items-center gap-1 rounded-lg border border-red-200 px-2 text-xs text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 disabled:opacity-30 disabled:cursor-not-allowed"
                            title={tpl.isDefault ? "Cannot delete the default template" : "Delete template"}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {/* Inline vehicle assignment expand */}
                  {expandedAssignment === tpl.id && (
                    <tr>
                      <td colSpan={6} className="px-4 pb-4 bg-muted/10">
                        <div className="pt-3">
                          <VehicleAssignmentPanel
                            template={tpl}
                            allTemplates={templates}
                            onChange={veh => updateAssignment(tpl.id, veh)}
                          />
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
        {templates.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No templates yet</p>
            <button onClick={newTemplate} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="h-3.5 w-3.5" /> Create First Template
            </button>
          </div>
        )}
      </div>

      {/* Unassigned vehicles warning */}
      {(() => {
        const assigned = templates.flatMap(t => t.assignedVehicles)
        const unassigned = ALL_VEHICLES.filter(v => !assigned.includes(v))
        if (!unassigned.length) return null
        return (
          <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 p-4">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-semibold text-amber-800 dark:text-amber-300">Vehicles using default template</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                {unassigned.join(", ")} — not assigned to a specific template. They will use the default template.
              </p>
            </div>
          </div>
        )
      })()}

      {/* Summary — unassigned vehicles */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="border-b bg-muted/40 px-4 py-2.5">
          <p className="text-xs font-semibold">Vehicle → Template Map</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2 text-left">Vehicle</th>
              <th className="px-4 py-2 text-left">Template</th>
              <th className="px-4 py-2 text-center">Questions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {ALL_VEHICLES.map(reg => {
              const tpl = templates.find(t => t.assignedVehicles.includes(reg))
                ?? templates.find(t => t.isDefault)
              const totalQ = tpl ? tpl.sections.reduce((n, s) => n + s.items.length, 0) : 0
              const isFallback = !templates.find(t => t.assignedVehicles.includes(reg))
              return (
                <tr key={reg} className="hover:bg-muted/20">
                  <td className="px-4 py-2 font-mono font-semibold text-xs">{reg}</td>
                  <td className="px-4 py-2 text-xs">
                    {tpl ? (
                      <span className="flex items-center gap-1.5">
                        {tpl.name}
                        {isFallback && <span className="text-[10px] text-muted-foreground">(default fallback)</span>}
                      </span>
                    ) : (
                      <span className="text-red-600 text-xs">⚠ No template!</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center text-xs text-muted-foreground">{totalQ}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── HELPER — resolve template for a vehicle ─────────────────────────────────

export function resolveTemplate(
  reg: string,
  templates: WalkaroundTemplate[],
): WalkaroundTemplate | null {
  return (
    templates.find(t => t.assignedVehicles.includes(reg)) ??
    templates.find(t => t.isDefault) ??
    templates[0] ??
    null
  )
}
