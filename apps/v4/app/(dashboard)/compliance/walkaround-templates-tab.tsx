"use client"
import * as React from "react"
import {
  Plus, Pencil, Copy, Trash2, CheckCircle2, ChevronUp, ChevronDown,
  X, Truck, ClipboardList, Save, Star, AlertTriangle, ChevronDown as Expand,
  Camera, HelpCircle, ToggleLeft, Type, Hash, List, Eye, EyeOff,
  AlertCircle, Info, Loader2,
} from "lucide-react"
import {
  listTemplates,
  createTemplate,
  updateTemplate as apiUpdateTemplate,
  deleteTemplate as apiDeleteTemplate,
  assignVehicles as apiAssignVehicles,
  apiTemplateToUI,
  uiTemplateToCreateRequest,
  uiTemplateToUpdateRequest,
} from "@/lib/walkaround-api"

// ─── TYPES ────────────────────────────────────────────────────────────────────

export type QuestionType =
  | "ok_advisory_fail"   // OK / Advisory / Fail  (3-way, current behaviour)
  | "pass_fail"          // Pass / Fail            (2-way, no advisory)
  | "yes_no"             // Yes / No
  | "text"               // Free text input
  | "number"             // Numeric input + optional unit
  | "select"             // Admin-defined dropdown

export type PhotoRequirement = "none" | "optional" | "required" | "required_on_fail"
export type DefectSeverity   = "advisory" | "dangerous"

export interface CheckItem {
  id: string
  text: string
  hint?: string                      // helper text shown to driver under the question
  type: QuestionType
  options?: string[]                 // for "select" type only
  unit?: string                      // for "number" type label (e.g. "bar", "mm")
  required: boolean                  // must answer before submit
  photoRequirement: PhotoRequirement
  failValues: string[]               // which answers count as a defect
  defectSeverity: DefectSeverity     // pre-set severity when defect fires
  conditionalOn?: {
    itemId: string                   // sibling item id
    value: string                    // trigger value
  }
}

export interface CheckSection { id: string; name: string; items: CheckItem[] }
export interface WalkaroundTemplate {
  id: string
  name: string
  description: string
  sections: CheckSection[]
  assignedVehicles: string[]
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const QUESTION_TYPES: { id: QuestionType; label: string; icon: React.ElementType; defaultFailValues: string[] }[] = [
  { id: "ok_advisory_fail", label: "OK / Advisory / Fail", icon: ToggleLeft,  defaultFailValues: ["fail"] },
  { id: "pass_fail",        label: "Pass / Fail",          icon: CheckCircle2, defaultFailValues: ["fail"] },
  { id: "yes_no",           label: "Yes / No",             icon: ToggleLeft,   defaultFailValues: ["no"]   },
  { id: "text",             label: "Text",                 icon: Type,         defaultFailValues: []        },
  { id: "number",           label: "Number",               icon: Hash,         defaultFailValues: []        },
  { id: "select",           label: "Select (dropdown)",    icon: List,         defaultFailValues: []        },
]

const PHOTO_REQ_OPTIONS: { id: PhotoRequirement; label: string; color: string }[] = [
  { id: "none",             label: "No photo",          color: "text-muted-foreground"          },
  { id: "optional",         label: "Optional",          color: "text-blue-600"                  },
  { id: "required",         label: "Always required",   color: "text-amber-600"                 },
  { id: "required_on_fail", label: "Required on fail",  color: "text-red-600"                   },
]

export const ALL_VEHICLES = [
  "NUX9VAM", "TB67KLM", "LK21DVA", "PN19RFX", "OU70TBN", "YJ19HKP",
]

function mkId() { return Math.random().toString(36).slice(2, 9) }

function makeDefaultItem(): CheckItem {
  return {
    id: mkId(), text: "", hint: "", type: "ok_advisory_fail",
    required: true, photoRequirement: "none",
    failValues: ["fail"], defectSeverity: "advisory",
  }
}

// ─── SEED DATA ────────────────────────────────────────────────────────────────

function mkItems(defs: { text: string; photo?: PhotoRequirement; type?: QuestionType; failValues?: string[]; severity?: DefectSeverity; hint?: string }[]): CheckItem[] {
  return defs.map(d => ({
    id: mkId(),
    text: d.text,
    hint: d.hint ?? "",
    type: d.type ?? "ok_advisory_fail",
    required: true,
    photoRequirement: d.photo ?? "none",
    failValues: d.failValues ?? ["fail"],
    defectSeverity: d.severity ?? "advisory",
  }))
}

export const SEED_TEMPLATES: WalkaroundTemplate[] = [
  {
    id: "tpl1", name: "Standard HGV",
    description: "DVSA-aligned walkaround for all HGV goods vehicles.",
    isDefault: true, createdAt: "2026-01-01", updatedAt: "2026-01-01",
    assignedVehicles: ["NUX9VAM", "TB67KLM", "LK21DVA", "PN19RFX"],
    sections: [
      { id: "s1", name: "Tyres & Wheels", items: mkItems([
        { text: "Offside front tyre condition/pressure", photo: "required_on_fail", severity: "dangerous", hint: "Check for cuts, bulges or tread below 1mm. Tyre pressure should match the vehicle placard." },
        { text: "Nearside front tyre condition/pressure", photo: "required_on_fail", severity: "dangerous" },
        { text: "Offside rear tyres (dual)",              photo: "required_on_fail", severity: "dangerous" },
        { text: "Nearside rear tyres (dual)",             photo: "required_on_fail", severity: "dangerous" },
        { text: "Wheel nuts visible security",            photo: "optional",         severity: "dangerous", hint: "Visual check only. Look for missing nuts or paint crack lines indicating movement." },
      ])},
      { id: "s2", name: "Lights", items: mkItems([
        { text: "Headlights main & dipped",       photo: "none" },
        { text: "Tail lights",                    photo: "none" },
        { text: "Brake lights",                   photo: "none" },
        { text: "Indicators (all 4)",             photo: "none" },
        { text: "Reverse light & audible warning",photo: "required_on_fail", severity: "dangerous" },
        { text: "Marker lights",                  photo: "none" },
      ])},
      { id: "s3", name: "Brakes", items: mkItems([
        { text: "Air pressure build-up",        hint: "Engine running: pressure should reach 8 bar within 3 minutes. Note time taken.", photo: "none",         severity: "dangerous" },
        { text: "Handbrake holds on incline",   photo: "required_on_fail", severity: "dangerous" },
        { text: "Brake pedal feel (no sponginess)", photo: "none", severity: "dangerous" },
      ])},
      { id: "s4", name: "Fluids & Engine", items: mkItems([
        { text: "Engine oil level",            photo: "none" },
        { text: "Coolant level",               photo: "none" },
        { text: "AdBlue level",                photo: "none",         hint: "Low AdBlue will derate engine. Top up if below 20%." },
        { text: "No visible fuel/oil leaks",   photo: "required_on_fail", severity: "dangerous" },
        { text: "Windscreen washer fluid",     photo: "none" },
      ])},
      { id: "s5", name: "Body & Cab", items: mkItems([
        { text: "Windscreen (no cracks in driver's eye-line)", photo: "required_on_fail", severity: "dangerous", hint: "Any crack in the swept area of the wiper is a prohibition offence." },
        { text: "Wipers functioning",                         photo: "none" },
        { text: "All mirrors present & adjusted",             photo: "required_on_fail", severity: "dangerous" },
        { text: "Horn working",                               photo: "none" },
        { text: "No body damage that changes vehicle width",  photo: "required_on_fail", severity: "advisory" },
      ])},
      { id: "s6", name: "Bridge & Height Strike", items: [
        { id: mkId(), text: "Vehicle height confirmed and height marker set", type: "number", unit: "m",
          hint: "Check the cab height indicator and confirm the height shown matches the vehicle plate. DVSA update Sept 2023.",
          required: true, photoRequirement: "none", failValues: [], defectSeverity: "dangerous" },
        ...mkItems([
          { text: "Height indicator/sticker legible and in correct position", photo: "none", severity: "dangerous" },
        ]),
      ]},
    ],
  },
  {
    id: "tpl2", name: "Refrigerated Unit",
    description: "Standard HGV checks plus LOLER reefer-specific pre-use checks.",
    isDefault: false, createdAt: "2026-01-15", updatedAt: "2026-02-10",
    assignedVehicles: ["OU70TBN"],
    sections: [
      { id: "s1", name: "Tyres & Wheels", items: mkItems([
        { text: "Offside front tyre condition/pressure", photo: "required_on_fail", severity: "dangerous" },
        { text: "Nearside front tyre condition/pressure",photo: "required_on_fail", severity: "dangerous" },
        { text: "Offside rear tyres (dual)",             photo: "required_on_fail", severity: "dangerous" },
        { text: "Nearside rear tyres (dual)",            photo: "required_on_fail", severity: "dangerous" },
        { text: "Wheel nuts visible security",           photo: "optional",         severity: "dangerous" },
      ])},
      { id: "s2", name: "Lights", items: mkItems([
        { text: "Headlights main & dipped", photo: "none" },
        { text: "Tail lights & brake lights",photo: "none" },
        { text: "Indicators & marker lights",photo: "none" },
        { text: "Reverse light & audible warning", photo: "required_on_fail", severity: "dangerous" },
      ])},
      { id: "s3", name: "Brakes", items: mkItems([
        { text: "Air pressure build-up",         photo: "none",         severity: "dangerous" },
        { text: "Handbrake holds on incline",    photo: "required_on_fail", severity: "dangerous" },
        { text: "Brake pedal feel",              photo: "none",         severity: "dangerous" },
      ])},
      { id: "s4", name: "Fluids & Engine", items: mkItems([
        { text: "Engine oil, coolant, AdBlue levels", photo: "none" },
        { text: "No visible leaks beneath vehicle",   photo: "required_on_fail", severity: "dangerous" },
      ])},
      { id: "sR1", name: "Refrigeration Unit", items: [
        { id: mkId(), text: "Reefer unit fault codes", type: "yes_no",
          hint: "Start unit and check dashboard. Any fault code must be reported. Answer YES if fault codes are present.",
          required: true, photoRequirement: "required_on_fail",
          failValues: ["yes"], defectSeverity: "dangerous" },
        { id: mkId(), text: "Set temperature achieved before loading?", type: "yes_no",
          hint: "Unit must reach set point before loading begins. Acceptable variance ±1°C.",
          required: true, photoRequirement: "required_on_fail",
          failValues: ["no"], defectSeverity: "dangerous" },
        { id: mkId(), text: "Current cargo temperature", type: "number", unit: "°C",
          hint: "Record the temperature shown on the unit display.",
          required: true, photoRequirement: "none",
          failValues: [], defectSeverity: "advisory" },
        ...mkItems([
          { text: "Reefer fuel level (diesel, separate tank) — OK", photo: "none", severity: "advisory", hint: "Minimum 25% fuel in reefer tank." },
          { text: "Door seals & gaskets intact — no tears or gaps",  photo: "required_on_fail", severity: "dangerous" },
          { text: "Reefer unit hours logged in trip sheet",          photo: "none" },
        ]),
      ]},
    ],
  },
  {
    id: "tpl3", name: "Tail-Lift Vehicle",
    description: "Standard HGV checks plus LOLER tail-lift pre-use inspection.",
    isDefault: false, createdAt: "2026-02-01", updatedAt: "2026-02-01",
    assignedVehicles: ["YJ19HKP"],
    sections: [
      { id: "s1", name: "Tyres & Wheels", items: mkItems([
        { text: "Offside front tyre condition/pressure", photo: "required_on_fail", severity: "dangerous" },
        { text: "Nearside front tyre condition/pressure",photo: "required_on_fail", severity: "dangerous" },
        { text: "Offside rear tyres (dual)",             photo: "required_on_fail", severity: "dangerous" },
        { text: "Nearside rear tyres (dual)",            photo: "required_on_fail", severity: "dangerous" },
        { text: "Wheel nuts visible security",           photo: "optional",         severity: "dangerous" },
      ])},
      { id: "s2", name: "Lights", items: mkItems([
        { text: "Headlights main & dipped",            photo: "none" },
        { text: "Tail lights & brake lights",          photo: "none" },
        { text: "Indicators & marker lights",          photo: "none" },
        { text: "Reverse light & audible warning",     photo: "required_on_fail", severity: "dangerous" },
      ])},
      { id: "s3", name: "Brakes & Fluids", items: mkItems([
        { text: "Air pressure build-up",               photo: "none",             severity: "dangerous" },
        { text: "Handbrake holds on incline",          photo: "required_on_fail", severity: "dangerous" },
        { text: "Engine oil, coolant, AdBlue levels",  photo: "none" },
        { text: "Hydraulic fluid level (tail-lift)",   photo: "none",             severity: "advisory",  hint: "Check reservoir under deck. Top up only with specified fluid." },
      ])},
      { id: "sTL", name: "Tail-Lift (LOLER Pre-Use)", items: [
        { id: mkId(), text: "LOLER thorough examination certificate in date?", type: "yes_no",
          hint: "6-monthly inspection required under LOLER 1998. Check sticker or paperwork before operating.",
          required: true, photoRequirement: "required",
          failValues: ["no"], defectSeverity: "dangerous" },
        ...mkItems([
          { text: "Platform — no cracks, weld failures, or deformation",   photo: "required_on_fail", severity: "dangerous" },
          { text: "Safety edge / anti-trap device functional",             photo: "required_on_fail", severity: "dangerous", hint: "Press safety edge during lowering — lift must stop immediately." },
          { text: "Platform lip/gate latches correctly and securely",      photo: "required_on_fail", severity: "dangerous" },
        ]),
        { id: mkId(), text: "Control buttons working correctly (raise, lower, tilt)", type: "ok_advisory_fail",
          hint: "Cycle through all movements. Check for unusual noise or jerky movement.",
          required: true, photoRequirement: "required_on_fail",
          failValues: ["fail"], defectSeverity: "dangerous" },
        ...mkItems([
          { text: "No hydraulic leaks under deck or at cylinder",          photo: "required_on_fail", severity: "dangerous" },
          { text: "Maximum load label legible and in position",            photo: "none",             severity: "advisory" },
          { text: "Emergency stop tested and functional",                  photo: "required_on_fail", severity: "dangerous" },
        ]),
        { id: mkId(), text: "Defects or concerns to report?", type: "yes_no",
          hint: "Any additional observations not covered above.",
          required: false, photoRequirement: "optional",
          failValues: ["yes"], defectSeverity: "advisory" },
      ]},
    ],
  },
]

// ─── QUESTION ITEM EDITOR ─────────────────────────────────────────────────────

function QuestionItemEditor({
  item,
  allItems,
  idx,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  item: CheckItem
  allItems: CheckItem[]
  idx: number
  onChange: (i: CheckItem) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
}) {
  const [expanded, setExpanded] = React.useState(false)
  const qType = QUESTION_TYPES.find(t => t.id === item.type)!
  const photoLabel = PHOTO_REQ_OPTIONS.find(p => p.id === item.photoRequirement)!

  function setType(t: QuestionType) {
    const def = QUESTION_TYPES.find(x => x.id === t)!
    onChange({ ...item, type: t, failValues: def.defaultFailValues, options: t === "select" ? (item.options ?? ["Option 1", "Option 2"]) : undefined })
  }

  // Options string for select type
  const optionsStr = (item.options ?? []).join("\n")

  const failValueOptions = (): string[] => {
    switch (item.type) {
      case "yes_no":           return ["yes", "no"]
      case "pass_fail":        return ["pass", "fail"]
      case "ok_advisory_fail": return ["ok", "advisory", "fail"]
      case "select":           return item.options ?? []
      default:                 return []
    }
  }

  const siblings = allItems.filter(i => i.id !== item.id && (i.type === "yes_no" || i.type === "pass_fail" || i.type === "ok_advisory_fail" || i.type === "select"))

  return (
    <div className={`rounded-lg border bg-card shadow-sm overflow-hidden transition-all ${expanded ? "ring-1 ring-ring" : ""}`}>
      {/* Collapsed row */}
      <div className="flex items-center gap-2 px-3 py-2 group">
        {/* Reorder */}
        <div className="flex flex-col gap-0.5 shrink-0">
          <button onClick={onMoveUp}   disabled={!canMoveUp}   className="h-3.5 w-4 flex items-center justify-center rounded hover:bg-muted disabled:opacity-20"><ChevronUp   className="h-2.5 w-2.5" /></button>
          <button onClick={onMoveDown} disabled={!canMoveDown} className="h-3.5 w-4 flex items-center justify-center rounded hover:bg-muted disabled:opacity-20"><ChevronDown className="h-2.5 w-2.5" /></button>
        </div>
        <span className="text-[10px] text-muted-foreground w-4 shrink-0 text-right font-mono">{idx + 1}</span>

        {/* Question text input */}
        <input
          value={item.text}
          onClick={e => e.stopPropagation()}
          onChange={e => onChange({ ...item, text: e.target.value })}
          className="flex-1 bg-transparent text-xs font-medium outline-none focus:underline min-w-0"
          placeholder="Question text…"
        />

        {/* Badges */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Type badge */}
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground whitespace-nowrap">{qType.label}</span>
          {/* Required */}
          {item.required && <span className="text-red-500 text-[10px] font-bold" title="Required">*</span>}
          {/* Photo */}
          <Camera className={`h-3 w-3 shrink-0 ${
            item.photoRequirement === "required"         ? "text-amber-500" :
            item.photoRequirement === "required_on_fail" ? "text-red-500"   :
            item.photoRequirement === "optional"         ? "text-blue-400"  :
            "text-muted-foreground/30"
          }`} title={photoLabel.label} />
          {/* Conditional */}
          {item.conditionalOn && <Eye className="h-3 w-3 text-indigo-400" title="Conditional display" />}
        </div>

        {/* Expand / delete */}
        <button onClick={() => setExpanded(e => !e)} className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted shrink-0">
          <Expand className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
        <button onClick={onDelete} className="h-6 w-6 flex items-center justify-center rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Expanded config panel */}
      {expanded && (
        <div className="border-t bg-muted/20 px-4 py-4 grid gap-4">

          {/* Hint text */}
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Help text <span className="normal-case font-normal text-muted-foreground/70">(shown to driver below the question)</span></label>
            <input
              value={item.hint ?? ""}
              onChange={e => onChange({ ...item, hint: e.target.value })}
              className="h-8 w-full rounded-lg border bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g. Check for cuts, bulges or tread below 1mm…"
            />
          </div>

          {/* Question Type */}
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Question Type</label>
            <div className="flex flex-wrap gap-1.5">
              {QUESTION_TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                    item.type === t.id ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300" : "hover:bg-muted"
                  }`}
                >
                  <t.icon className="h-3 w-3" />{t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Select options */}
          {item.type === "select" && (
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Dropdown Options <span className="normal-case font-normal">(one per line)</span></label>
              <textarea
                value={optionsStr}
                onChange={e => onChange({ ...item, options: e.target.value.split("\n").filter(Boolean) })}
                rows={4}
                className="w-full rounded-lg border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder={"Option 1\nOption 2\nOption 3"}
              />
            </div>
          )}

          {/* Number unit */}
          {item.type === "number" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Unit Label <span className="normal-case font-normal">(optional)</span></label>
                <input
                  value={item.unit ?? ""}
                  onChange={e => onChange({ ...item, unit: e.target.value })}
                  className="h-8 w-full rounded-lg border bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-ring"
                  placeholder="e.g. bar, mm, °C, m"
                />
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Required */}
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Required to submit?</label>
              <div className="flex gap-2">
                {[true, false].map(v => (
                  <button
                    key={String(v)}
                    onClick={() => onChange({ ...item, required: v })}
                    className={`flex-1 rounded-lg border py-1.5 text-[11px] font-medium transition-colors ${
                      item.required === v
                        ? v ? "border-green-400 bg-green-50 dark:bg-green-900/20 text-green-700" : "border-muted text-muted-foreground bg-muted/40"
                        : "hover:bg-muted"
                    }`}
                  >
                    {v ? "✓ Required" : "Optional"}
                  </button>
                ))}
              </div>
            </div>

            {/* Photo requirement */}
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Camera className="inline h-3 w-3 mr-1" />Photo requirement
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {PHOTO_REQ_OPTIONS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => onChange({ ...item, photoRequirement: p.id })}
                    className={`rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-colors text-left ${
                      item.photoRequirement === p.id ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700" : "hover:bg-muted"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Fail values + severity — only for non-text/number types */}
          {failValueOptions().length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <AlertCircle className="inline h-3 w-3 mr-1 text-red-500" />Which answers are a defect?
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {failValueOptions().map(v => {
                    const isFail = item.failValues.includes(v)
                    return (
                      <button
                        key={v}
                        onClick={() => onChange({
                          ...item,
                          failValues: isFail ? item.failValues.filter(x => x !== v) : [...item.failValues, v],
                        })}
                        className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium capitalize transition-colors ${
                          isFail ? "border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700" : "hover:bg-muted"
                        }`}
                      >
                        {v}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Defect severity</label>
                <div className="flex gap-2">
                  {(["advisory", "dangerous"] as DefectSeverity[]).map(s => (
                    <button
                      key={s}
                      onClick={() => onChange({ ...item, defectSeverity: s })}
                      className={`flex-1 rounded-lg border py-1.5 text-[11px] font-medium capitalize transition-colors ${
                        item.defectSeverity === s
                          ? s === "dangerous" ? "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700" : "border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700"
                          : "hover:bg-muted"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Conditional logic */}
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Eye className="inline h-3 w-3 mr-1" />Conditional display <span className="normal-case font-normal text-muted-foreground/70">(show this question only if…)</span>
            </label>
            {siblings.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">No other questions in this section with selectable responses.</p>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={item.conditionalOn?.itemId ?? ""}
                  onChange={e => {
                    if (!e.target.value) { onChange({ ...item, conditionalOn: undefined }); return }
                    onChange({ ...item, conditionalOn: { itemId: e.target.value, value: item.conditionalOn?.value ?? "" } })
                  }}
                  className="h-8 rounded-lg border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">— always show —</option>
                  {siblings.map(s => <option key={s.id} value={s.id}>{s.text || `Item ${s.id}`}</option>)}
                </select>
                {item.conditionalOn?.itemId && (
                  <>
                    <span className="text-xs text-muted-foreground">= </span>
                    <select
                      value={item.conditionalOn.value}
                      onChange={e => onChange({ ...item, conditionalOn: { ...item.conditionalOn!, value: e.target.value } })}
                      className="h-8 rounded-lg border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">— select value —</option>
                      {(() => {
                        const parent = allItems.find(i => i.id === item.conditionalOn?.itemId)
                        if (!parent) return []
                        const opts = parent.type === "yes_no" ? ["yes","no"] : parent.type === "pass_fail" ? ["pass","fail"] : parent.type === "ok_advisory_fail" ? ["ok","advisory","fail"] : parent.options ?? []
                        return opts.map(o => <option key={o} value={o}>{o}</option>)
                      })()}
                    </select>
                    <button onClick={() => onChange({ ...item, conditionalOn: undefined })} className="text-xs text-red-500 hover:underline">Clear</button>
                  </>
                )}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}

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
  function addItem() {
    onChange({ ...section, items: [...section.items, makeDefaultItem()] })
  }

  function updateItem(idx: number, item: CheckItem) {
    const items = [...section.items]; items[idx] = item
    onChange({ ...section, items })
  }

  function deleteItem(idx: number) {
    onChange({ ...section, items: section.items.filter((_, i) => i !== idx) })
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
      <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2.5">
        <div className="flex flex-col gap-0.5 shrink-0">
          <button onClick={onMoveUp}   disabled={!canMoveUp}   className="h-4 w-4 flex items-center justify-center rounded hover:bg-muted disabled:opacity-20"><ChevronUp   className="h-3 w-3" /></button>
          <button onClick={onMoveDown} disabled={!canMoveDown} className="h-4 w-4 flex items-center justify-center rounded hover:bg-muted disabled:opacity-20"><ChevronDown className="h-3 w-3" /></button>
        </div>
        <input
          value={section.name}
          onChange={e => onChange({ ...section, name: e.target.value })}
          className="flex-1 bg-transparent text-sm font-semibold outline-none focus:underline"
          placeholder="Section name…"
        />
        <span className="text-[10px] text-muted-foreground shrink-0">{section.items.length} checks</span>
        <button onClick={onDelete} className="h-6 w-6 flex items-center justify-center rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Items */}
      <div className="divide-y px-3 py-2 flex flex-col gap-1.5">
        {section.items.map((item, idx) => (
          <QuestionItemEditor
            key={item.id}
            item={item}
            allItems={section.items}
            idx={idx}
            onChange={updated => updateItem(idx, updated)}
            onDelete={() => deleteItem(idx)}
            onMoveUp={() => moveItem(idx, -1)}
            onMoveDown={() => moveItem(idx, 1)}
            canMoveUp={idx > 0}
            canMoveDown={idx < section.items.length - 1}
          />
        ))}
        {section.items.length === 0 && (
          <p className="py-3 text-center text-xs text-muted-foreground">No questions yet — add one below.</p>
        )}
      </div>

      {/* Add item */}
      <div className="border-t px-3 py-2">
        <button
          onClick={addItem}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Add check item
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
  const [draft, setDraft] = React.useState<WalkaroundTemplate>(() => JSON.parse(JSON.stringify(template)))

  const totalItems = draft.sections.reduce((n, s) => n + s.items.length, 0)

  function addSection() {
    setDraft(d => ({ ...d, sections: [...d.sections, { id: mkId(), name: "New Section", items: [] }] }))
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

  const mandatoryPhoto = draft.sections.flatMap(s => s.items).filter(i => i.photoRequirement === "required").length
  const failOnPhoto    = draft.sections.flatMap(s => s.items).filter(i => i.photoRequirement === "required_on_fail").length
  const requiredItems  = draft.sections.flatMap(s => s.items).filter(i => i.required).length

  return (
    <div className="flex flex-col gap-5">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={onCancel} className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs hover:bg-muted">← Back</button>
        <span className="text-sm font-semibold">{template.id.startsWith("new_") ? "New Template" : `Editing: ${template.name}`}</span>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span>{draft.sections.length} sections · {totalItems} checks</span>
            <span className="text-red-500">* {requiredItems} required</span>
            <span className="text-amber-500"><Camera className="inline h-3 w-3 mr-0.5" />{mandatoryPhoto} always · {failOnPhoto} on-fail</span>
          </div>
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
          <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
            className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="e.g. Refrigerated Unit" />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase">Description</label>
          <input value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
            className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Brief description…" />
        </div>
        <div className="sm:col-span-2 flex items-center gap-2">
          <input id="isDefault" type="checkbox" checked={draft.isDefault}
            onChange={e => setDraft(d => ({ ...d, isDefault: e.target.checked }))} className="h-4 w-4 rounded" />
          <label htmlFor="isDefault" className="text-sm">
            Set as <strong>default template</strong> (used for vehicles with no assigned template)
          </label>
        </div>
      </div>

      {/* Sections */}
      <div className="flex flex-col gap-3">
        {draft.sections.map((sec, idx) => (
          <SectionEditor key={sec.id} section={sec}
            onChange={s => updateSection(idx, s)}
            onDelete={() => deleteSection(idx)}
            onMoveUp={() => moveSection(idx, -1)}
            onMoveDown={() => moveSection(idx, 1)}
            canMoveUp={idx > 0}
            canMoveDown={idx < draft.sections.length - 1}
          />
        ))}
        <button onClick={addSection}
          className="inline-flex h-9 items-center gap-2 rounded-xl border-2 border-dashed border-indigo-300 px-4 text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors">
          <Plus className="h-4 w-4" /> Add Section
        </button>
      </div>
    </div>
  )
}

// ─── VEHICLE ASSIGNMENT PANEL ─────────────────────────────────────────────────

function VehicleAssignmentPanel({
  template, allTemplates, onChange,
}: {
  template: WalkaroundTemplate
  allTemplates: WalkaroundTemplate[]
  onChange: (assignedVehicles: string[]) => void
}) {
  function toggleVehicle(reg: string) {
    const already = template.assignedVehicles.includes(reg)
    onChange(already ? template.assignedVehicles.filter(v => v !== reg) : [...template.assignedVehicles, reg])
  }

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <h4 className="text-sm font-bold mb-1">Vehicle Assignment</h4>
      <p className="text-[11px] text-muted-foreground mb-3">One template per vehicle. Assigning here removes from current template.</p>
      <div className="grid grid-cols-2 gap-2">
        {ALL_VEHICLES.map(reg => {
          const assigned = template.assignedVehicles.includes(reg)
          const other    = allTemplates.find(t => t.id !== template.id && t.assignedVehicles.includes(reg))
          return (
            <button key={reg} onClick={() => toggleVehicle(reg)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors text-left ${
                assigned ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700" : "hover:bg-muted"
              }`}
            >
              <Truck className={`h-3.5 w-3.5 shrink-0 ${assigned ? "text-indigo-500" : "text-muted-foreground"}`} />
              <div className="min-w-0">
                <p className="font-mono font-semibold truncate">{reg}</p>
                {assigned ? <p className="text-[10px] text-indigo-500">Assigned ✓</p>
                  : other ? <p className="text-[10px] text-muted-foreground truncate">{other.name}</p>
                  : <p className="text-[10px] text-muted-foreground">Unassigned</p>}
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
  templates, onTemplatesChange,
}: {
  templates: WalkaroundTemplate[]
  onTemplatesChange: (t: WalkaroundTemplate[]) => void
}) {
  const [editingId, setEditingId]       = React.useState<string | null>(null)
  const [expandedAssign, setExpandedAssign] = React.useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm]   = React.useState<string | null>(null)
  const [apiLoading, setApiLoading]     = React.useState(false)
  const [apiError, setApiError]         = React.useState<string | null>(null)
  const [saving, setSaving]             = React.useState(false)

  // ── Fetch templates from API on mount ──
  React.useEffect(() => {
    let cancelled = false
    async function fetchTemplates() {
      setApiLoading(true)
      setApiError(null)
      try {
        const res = await listTemplates({ limit: 100 })
        if (!cancelled) {
          const uiTemplates = res.walkaroundTemplates.map(apiTemplateToUI)
          onTemplatesChange(uiTemplates)
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load templates"
          setApiError(message)
          onTemplatesChange([])
        }
      } finally {
        if (!cancelled) setApiLoading(false)
      }
    }
    fetchTemplates()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const editing = editingId ? templates.find(t => t.id === editingId) ?? null : null

  async function saveTemplate(updated: WalkaroundTemplate) {
    setSaving(true)
    try {
      const isNew = updated.id.startsWith("new_") || updated.id.startsWith("local_")
      if (isNew) {
        const req = uiTemplateToCreateRequest(updated)
        const res = await createTemplate(req)
        const created = apiTemplateToUI(res.walkaroundTemplate)
        const next = templates
          .filter(t => t.id !== updated.id)
          .map(t => created.isDefault ? { ...t, isDefault: false } : t)
        onTemplatesChange([...next, created])
      } else {
        const req = uiTemplateToUpdateRequest(updated)
        const res = await apiUpdateTemplate(updated.id, req)
        const saved = apiTemplateToUI(res.walkaroundTemplate)
        const next = templates.map(t =>
          t.id === updated.id ? saved : saved.isDefault ? { ...t, isDefault: false } : t
        )
        onTemplatesChange(next)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save template"
      setApiError(message)
    } finally {
      setSaving(false)
      setEditingId(null)
    }
  }

  function copyTemplate(tpl: WalkaroundTemplate) {
    const copy: WalkaroundTemplate = {
      ...JSON.parse(JSON.stringify(tpl)),
      id: `new_${mkId()}`, name: `Copy of ${tpl.name}`,
      isDefault: false, assignedVehicles: [],
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
    }
    onTemplatesChange([...templates, copy]); setEditingId(copy.id)
  }

  async function updateAssignment(id: string, veh: string[]) {
    // Optimistic local update
    onTemplatesChange(templates.map(t =>
      t.id === id ? { ...t, assignedVehicles: veh }
        : { ...t, assignedVehicles: t.assignedVehicles.filter(v => !veh.includes(v)) }
    ))
    // Fire API call in background
    try {
      await apiAssignVehicles(id, veh)
    } catch (err: unknown) {
      console.warn("Failed to sync vehicle assignment to API:", err)
    }
  }

  async function handleDelete(tplId: string) {
    try {
      await apiDeleteTemplate(tplId)
    } catch (err: unknown) {
      console.warn("Failed to delete template from API:", err)
    }
    onTemplatesChange(templates.filter(t => t.id !== tplId))
    setDeleteConfirm(null)
  }

  function newTemplate() {
    const tpl: WalkaroundTemplate = {
      id: `new_${mkId()}`, name: "", description: "", isDefault: false,
      assignedVehicles: [], sections: [],
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
    }
    onTemplatesChange([...templates, tpl]); setEditingId(tpl.id)
  }

  // ── Editor ──
  if (editing) {
    return (
      <div className="flex gap-5">
        <div className="flex-1 min-w-0">
          <TemplateEditor template={editing} onSave={saveTemplate} onCancel={() => setEditingId(null)} />
        </div>
        <div className="w-64 shrink-0">
          <VehicleAssignmentPanel
            template={editing} allTemplates={templates}
            onChange={veh => {
              const updated = { ...editing, assignedVehicles: veh }
              onTemplatesChange(templates.map(t => {
                if (t.id === updated.id) return updated
                return { ...t, assignedVehicles: t.assignedVehicles.filter(v => !veh.includes(v)) }
              }))
            }}
          />
        </div>
      </div>
    )
  }

  // ── List ──
  return (
    <div className="flex flex-col gap-5">
      {/* API status banner */}
      {apiError && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">API: {apiError} — showing local data</span>
          <button onClick={() => setApiError(null)} className="text-amber-600 hover:text-amber-800"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}
      {saving && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20 px-4 py-2.5 text-xs text-blue-800 dark:text-blue-300">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving template…
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Walkaround Templates</p>
          <p className="text-xs text-muted-foreground">Create configurable check templates with question types, mandatory photos, and conditional logic. Assign per vehicle.</p>
        </div>
        <div className="flex items-center gap-2">
          {apiLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <button onClick={newTemplate} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-3.5 w-3.5" /> New Template
          </button>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5 text-left">Template</th>
              <th className="px-4 py-2.5 text-center">Sections</th>
              <th className="px-4 py-2.5 text-center">Checks</th>
              <th className="px-4 py-2.5 text-center" title="Mandatory photo checks"><Camera className="h-3.5 w-3.5 inline" /></th>
              <th className="px-4 py-2.5 text-left">Vehicles</th>
              <th className="px-4 py-2.5 text-left">Modified</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {templates.map(tpl => {
              const allItems    = tpl.sections.flatMap(s => s.items)
              const totalQ      = allItems.length
              const photoCount  = allItems.filter(i => i.photoRequirement === "required" || i.photoRequirement === "required_on_fail").length
              return (
                <React.Fragment key={tpl.id}>
                  <tr className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-indigo-500 shrink-0" />
                        <div>
                          <p className="font-medium">{tpl.name || <span className="italic text-muted-foreground">Untitled</span>}</p>
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
                    <td className="px-4 py-3 text-center">
                      {photoCount > 0
                        ? <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600"><Camera className="h-3 w-3" />{photoCount}</span>
                        : <span className="text-muted-foreground/40 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {tpl.assignedVehicles.length > 0
                        ? <div className="flex flex-wrap gap-1">{tpl.assignedVehicles.map(r => <span key={r} className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">{r}</span>)}</div>
                        : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{tpl.updatedAt}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setExpandedAssign(expandedAssign === tpl.id ? null : tpl.id)}
                          className="inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-xs hover:bg-muted"><Truck className="h-3 w-3" /> Assign</button>
                        <button onClick={() => setEditingId(tpl.id)}
                          className="inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-xs hover:bg-muted"><Pencil className="h-3 w-3" /> Edit</button>
                        <button onClick={() => copyTemplate(tpl)}
                          className="inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-xs hover:bg-muted"><Copy className="h-3 w-3" /> Copy</button>
                        {deleteConfirm === tpl.id ? (
                          <>
                            <button onClick={() => handleDelete(tpl.id)}
                              className="inline-flex h-7 items-center gap-1 rounded-lg bg-red-600 px-2 text-xs font-medium text-white hover:bg-red-700">Confirm</button>
                            <button onClick={() => setDeleteConfirm(null)}
                              className="inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-xs hover:bg-muted">Cancel</button>
                          </>
                        ) : (
                          <button onClick={() => setDeleteConfirm(tpl.id)} disabled={tpl.isDefault}
                            className="inline-flex h-7 items-center gap-1 rounded-lg border border-red-200 px-2 text-xs text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 disabled:opacity-30 disabled:cursor-not-allowed"
                            title={tpl.isDefault ? "Cannot delete default template" : "Delete"}>
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedAssign === tpl.id && (
                    <tr>
                      <td colSpan={7} className="px-4 pb-4 bg-muted/10">
                        <div className="pt-3">
                          <VehicleAssignmentPanel template={tpl} allTemplates={templates} onChange={veh => updateAssignment(tpl.id, veh)} />
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Vehicle → Template map */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="border-b bg-muted/40 px-4 py-2.5">
          <p className="text-xs font-semibold">Vehicle → Template Map</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2 text-left">Vehicle</th>
              <th className="px-4 py-2 text-left">Template</th>
              <th className="px-4 py-2 text-center">Checks</th>
              <th className="px-4 py-2 text-center" title="Photo-mandatory checks"><Camera className="h-3.5 w-3.5 inline" /></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {ALL_VEHICLES.map(reg => {
              const tpl      = templates.find(t => t.assignedVehicles.includes(reg)) ?? templates.find(t => t.isDefault) ?? templates[0] ?? null
              const allItems = tpl ? tpl.sections.flatMap(s => s.items) : []
              const photos   = allItems.filter(i => i.photoRequirement === "required" || i.photoRequirement === "required_on_fail").length
              const fallback = tpl && !templates.find(t => t.assignedVehicles.includes(reg))
              return (
                <tr key={reg} className="hover:bg-muted/20">
                  <td className="px-4 py-2 font-mono font-semibold text-xs">{reg}</td>
                  <td className="px-4 py-2 text-xs">
                    {tpl ? <>{tpl.name}{fallback && <span className="ml-1 text-[10px] text-muted-foreground">(default)</span>}</>
                      : <span className="text-red-600">⚠ No template</span>}
                  </td>
                  <td className="px-4 py-2 text-center text-xs text-muted-foreground">{allItems.length}</td>
                  <td className="px-4 py-2 text-center text-xs text-muted-foreground">{photos || "—"}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── EXPORT HELPERS ───────────────────────────────────────────────────────────

export function resolveTemplate(reg: string, templates: WalkaroundTemplate[]): WalkaroundTemplate | null {
  return templates.find(t => t.assignedVehicles.includes(reg))
    ?? templates.find(t => t.isDefault)
    ?? templates[0]
    ?? null
}
