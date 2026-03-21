/**
 * Seed Data Configuration
 *
 * Portable data definitions for seeding the OnTrack API.
 * This file contains ONLY data — no API calls, no credentials.
 * Import this config in any runner script for any environment.
 *
 * Usage:
 *   import { seedConfig } from "./seed-config"
 *   // Use seedConfig.templates, seedConfig.checks, etc.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS — random pick, date generation, UK-style data
// ═══════════════════════════════════════════════════════════════════════════════

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomDate(daysBack: number): string {
  const d = new Date()
  d.setDate(d.getDate() - randomInt(0, daysBack))
  return d.toISOString().slice(0, 10)
}

function randomTime(): string {
  return `${String(randomInt(5, 20)).padStart(2, "0")}:${String(randomInt(0, 59)).padStart(2, "0")}`
}

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16)
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// REFERENCE DATA — UK fleet industry realistic values
// ═══════════════════════════════════════════════════════════════════════════════

const UK_REG_PREFIXES = [
  "AB", "BC", "CD", "DE", "EF", "FG", "GH", "HJ", "KL", "LM",
  "MN", "NP", "PQ", "RS", "ST", "TU", "UV", "VW", "WX", "YZ",
]
const UK_REG_SUFFIXES = ["AAA", "BBB", "CCC", "DDD", "EEE", "FFF", "GGG", "HHH", "JJJ", "KKK", "LLL", "MMM", "NNN", "PPP", "RRR", "SSS", "TTT", "UUU", "VVV", "WWW", "XYZ"]
const UK_REG_YEARS = ["19", "20", "21", "22", "23", "24", "25", "26", "69", "70", "71", "72", "73", "74", "75"]

function randomReg(): string {
  return `${pick(UK_REG_PREFIXES)}${pick(UK_REG_YEARS)} ${pick(UK_REG_SUFFIXES)}`
}

const FIRST_NAMES = [
  "James", "John", "Robert", "Michael", "David", "Richard", "Thomas", "Daniel",
  "Matthew", "Andrew", "Christopher", "Joseph", "Mark", "Paul", "Steven",
  "Sarah", "Emma", "Laura", "Rachel", "Helen", "Karen", "Lisa", "Anna",
  "Maria", "Sophie", "Charlotte", "Jessica", "Amy", "Rebecca", "Claire",
]

const LAST_NAMES = [
  "Smith", "Jones", "Williams", "Brown", "Taylor", "Davies", "Wilson", "Evans",
  "Thomas", "Johnson", "Roberts", "Walker", "Robinson", "Thompson", "Wright",
  "White", "Hughes", "Edwards", "Green", "Lewis", "Harris", "Clarke", "Patel",
  "Jackson", "Wood", "Turner", "Martin", "Cooper", "Hill", "Ward",
]

function randomName(): string {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`
}

const VEHICLE_MAKES = [
  "Scania", "Volvo", "DAF", "MAN", "Mercedes-Benz", "Iveco", "Renault",
  "Ford", "Vauxhall", "Peugeot", "Citroën", "Volkswagen", "Toyota", "Isuzu",
]

const VEHICLE_MODELS: Record<string, string[]> = {
  Scania:          ["R 450", "S 500", "P 280", "G 410", "R 520"],
  Volvo:           ["FH 460", "FM 380", "FE 280", "FL 240", "FH 500"],
  DAF:             ["XF 480", "CF 370", "LF 230", "XG+ 530", "XD 450"],
  MAN:             ["TGX 18.510", "TGS 26.400", "TGL 12.250", "TGE 5.180"],
  "Mercedes-Benz": ["Actros 2545", "Arocs 3240", "Atego 1230", "Sprinter 516"],
  Iveco:           ["S-Way 480", "Eurocargo 140E", "Daily 50C", "T-Way 410"],
  Renault:         ["T 480", "D 320", "C 430", "Master ZE"],
  Ford:            ["Transit 350", "Transit Custom", "Ranger", "E-Transit"],
  Vauxhall:        ["Movano", "Vivaro", "Combo"],
  Peugeot:         ["Boxer", "Expert", "Partner"],
  "Citroën":       ["Relay", "Dispatch", "Berlingo"],
  Volkswagen:      ["Crafter", "Transporter", "Caddy"],
  Toyota:          ["Hilux", "Proace", "Land Cruiser"],
  Isuzu:           ["N75.190", "N35.125", "D-Max"],
}

function randomVehicle(): { make: string; model: string; reg: string } {
  const make = pick(VEHICLE_MAKES)
  const model = pick(VEHICLE_MODELS[make] ?? ["Unknown"])
  return { make, model, reg: randomReg() }
}

// ═══════════════════════════════════════════════════════════════════════════════
// WALKAROUND TEMPLATE SECTIONS — realistic UK HGV/LGV check items
// ═══════════════════════════════════════════════════════════════════════════════

const TEMPLATE_SECTIONS = [
  {
    name: "Cab Exterior",
    items: ["Windscreen condition", "Wiper blades & washers", "Mirror condition (all)", "Cab body damage", "Number plates visible & legible", "Cab steps & grab handles"],
  },
  {
    name: "Lights & Reflectors",
    items: ["Headlights (dipped & main beam)", "Sidelights & DRLs", "Indicators (front & rear)", "Brake lights", "Rear fog light", "Marker lights", "Number plate light", "Reflectors & conspicuity markings"],
  },
  {
    name: "Cab Interior",
    items: ["Seat & seatbelt condition", "Dashboard warning lights", "Horn operation", "Steering wheel play", "Pedal condition", "Heater & demister", "Tachograph unit", "First aid kit", "Fire extinguisher", "Hi-vis vest"],
  },
  {
    name: "Engine & Fluids",
    items: ["Oil level", "Coolant level", "Power steering fluid", "Washer fluid level", "AdBlue level", "Visible leaks under vehicle", "Fan belt condition", "Battery condition"],
  },
  {
    name: "Wheels & Tyres",
    items: ["Tyre tread depth (all axles)", "Tyre pressure (visual check)", "Tyre sidewall damage", "Wheel nut indicators", "Spare wheel (if applicable)", "Mud flaps & spray suppression"],
  },
  {
    name: "Brakes",
    items: ["Service brake operation", "Handbrake / park brake hold", "Air pressure build-up", "Brake pad / shoe wear indicator", "ABS warning light", "Air line connections (trailer)"],
  },
  {
    name: "Trailer / Body",
    items: ["Coupling security (fifth wheel / drawbar)", "Trailer lights connection", "Load security & curtains", "Tail lift operation", "Rear doors & hinges", "Body condition / damage"],
  },
  {
    name: "Safety Equipment",
    items: ["Warning triangle", "Wheel chocks", "Load restraint straps", "PPE as required", "Spill kit (ADR if applicable)"],
  },
]

const TEMPLATE_NAMES = [
  "Standard HGV Daily Check",
  "LGV Pre-Trip Inspection",
  "Rigid Vehicle Walkaround",
  "Artic Unit + Trailer Check",
  "Van / 3.5t Daily Inspection",
  "Refrigerated Vehicle Check",
  "Tipper / Grab Lorry Check",
  "Curtainsider Full Inspection",
  "Skip Loader Daily Check",
  "Car Transporter Walkaround",
  "Flatbed / Crane Vehicle Check",
  "Hazmat / ADR Vehicle Check",
  "Coach / PSV Daily Inspection",
  "Minibus Pre-Journey Check",
  "Electric Vehicle Daily Check",
]

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK RESULT PATTERNS — realistic outcomes
// ═══════════════════════════════════════════════════════════════════════════════

const DEFECT_NOTES = [
  "Slight chip in windscreen – monitoring",
  "Nearside wiper blade streaking – needs replacement",
  "Offside mirror cracked – ordered replacement",
  "Minor dent on N/S panel – cosmetic only",
  "Brake pad wear indicator showing – schedule workshop",
  "Tyre tread at 2mm N/S front – replace before next check",
  "Oil leak from sump gasket – slow seep, monitoring",
  "Tail light lens cracked – temporary repair applied",
  "Coolant level low – topped up, check for leak",
  "ABS warning light intermittent – booked for diagnostic",
  "Curtain rope frayed – replaced on site",
  "Rear door hinge stiff – lubricated",
  "Fire extinguisher expired – replaced",
  "Tachograph display dim – logged for workshop",
  "Load strap webbing worn – taken out of service",
]

const ADVISORY_NOTES = [
  "Recommend full brake inspection at next PMI",
  "Battery terminals showing corrosion – clean at workshop",
  "Windscreen stone chip – monitor for spreading",
  "Paint bubbling near wheel arch – potential rust",
  "Spare tyre pressure low – inflate at depot",
]

// ═══════════════════════════════════════════════════════════════════════════════
// COMPLIANCE SETTINGS — expiry alert types
// ═══════════════════════════════════════════════════════════════════════════════

const DOCUMENT_TYPES = {
  vehicle: [
    "MOT Expiry",
    "Tachograph Calibration",
    "LOLER Certificate",
    "Road Tax",
    "Insurance",
    "Speed Limiter Certificate",
    "Operator's Licence Disc",
  ],
  driver: [
    "Driving Licence",
    "Tachograph Card",
    "DQC/CPC Deadline",
    "ADR Certificate",
    "D4 Medical",
    "Right to Work (Visa)",
    "DVLA Check",
    "DBS Certificate",
  ],
}

const EVENT_TYPES = [
  { category: "PMI & Maintenance", type: "PMI Overdue" },
  { category: "Walkaround Checks", type: "Missing Daily Check (CoB)" },
  { category: "Walkaround Checks", type: "Defect Reported" },
  { category: "Walkaround Checks", type: "VOR Raised" },
  { category: "O-Licence", type: "Approaching Limit (90%)" },
  { category: "O-Licence", type: "Vehicle Limit Breached" },
  { category: "Tachograph & WTD", type: "Infringement Logged" },
  { category: "Tachograph & WTD", type: "Download Overdue (3 days)" },
]

// ═══════════════════════════════════════════════════════════════════════════════
// GENERATOR FUNCTIONS — produce seed records
// ═══════════════════════════════════════════════════════════════════════════════

export interface SeedTemplate {
  name: string
  is_default: boolean
  sections: { name: string; items: string[] }[]
}

export function generateTemplate(index: number): SeedTemplate {
  const baseName = index < TEMPLATE_NAMES.length
    ? TEMPLATE_NAMES[index]
    : `Custom Template #${index + 1}`
  const sectionCount = randomInt(3, TEMPLATE_SECTIONS.length)
  const sections = pickN(TEMPLATE_SECTIONS, sectionCount)

  return {
    name: baseName,
    is_default: index === 0,
    sections: sections.map(s => ({
      name: s.name,
      items: pickN(s.items, randomInt(2, s.items.length)),
    })),
  }
}

export interface SeedCheck {
  vehicle: { make: string; model: string; reg: string }
  driver_name: string
  date: string
  time: string
  status: "clear" | "defect"
  sections: {
    name: string
    items: { name: string; result: "ok" | "advisory" | "fail"; note: string }[]
  }[]
}

export function generateCheck(index: number, templatePool: SeedTemplate[]): SeedCheck {
  const template = pick(templatePool.length > 0 ? templatePool : [generateTemplate(0)])
  const vehicle = randomVehicle()
  const driver = randomName()
  const date = randomDate(90)
  const time = randomTime()

  // 80% clear, 15% advisory, 5% fail
  const roll = Math.random()
  const hasFail = roll > 0.95
  const hasAdvisory = roll > 0.80

  const sections = template.sections.map(sec => ({
    name: sec.name,
    items: sec.items.map(item => {
      // For fail/advisory checks, randomly assign defects to 1-3 items
      if (hasFail && Math.random() > 0.85) {
        return { name: item, result: "fail" as const, note: pick(DEFECT_NOTES) }
      }
      if (hasAdvisory && Math.random() > 0.90) {
        return { name: item, result: "advisory" as const, note: pick(ADVISORY_NOTES) }
      }
      return { name: item, result: "ok" as const, note: "" }
    }),
  }))

  const anyFail = sections.some(s => s.items.some(i => i.result === "fail"))

  return {
    vehicle,
    driver_name: driver,
    date,
    time,
    status: anyFail ? "defect" : "clear",
    sections,
  }
}

export interface SeedExpiryAlert {
  document_category: string
  document_type: string
  early_warning_days: number
  reminder_days: number
  seven_day_enabled: number
  email_enabled: number
  mobile_enabled: number
}

export function generateExpiryAlerts(): SeedExpiryAlert[] {
  const alerts: SeedExpiryAlert[] = []
  for (const [category, types] of Object.entries(DOCUMENT_TYPES)) {
    for (const docType of types) {
      alerts.push({
        document_category: category,
        document_type: docType,
        early_warning_days: pick([60, 90]),
        reminder_days: pick([14, 21, 30]),
        seven_day_enabled: 1,
        email_enabled: 1,
        mobile_enabled: randomInt(0, 1),
      })
    }
  }
  return alerts
}

export interface SeedEventAlert {
  event_category: string
  event_type: string
  when_type: string
  email_enabled: number
  mobile_enabled: number
}

export function generateEventAlerts(): SeedEventAlert[] {
  return EVENT_TYPES.map(et => ({
    event_category: et.category,
    event_type: et.type,
    when_type: "Instant",
    email_enabled: 1,
    mobile_enabled: 1,
  }))
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONFIG EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const seedConfig = {
  /** How many walkaround templates to create */
  templateCount: 15,

  /** How many walkaround checks to create */
  checkCount: 1000,

  /** How many requests to run concurrently */
  concurrency: 10,

  /** Delay (ms) between batches to avoid rate limiting */
  batchDelayMs: 200,

  /** Generator functions */
  generateTemplate,
  generateCheck,
  generateExpiryAlerts,
  generateEventAlerts,

  /** Raw reference data (for custom use) */
  referenceData: {
    firstNames: FIRST_NAMES,
    lastNames: LAST_NAMES,
    vehicleMakes: VEHICLE_MAKES,
    vehicleModels: VEHICLE_MODELS,
    templateSections: TEMPLATE_SECTIONS,
    templateNames: TEMPLATE_NAMES,
    defectNotes: DEFECT_NOTES,
    advisoryNotes: ADVISORY_NOTES,
    documentTypes: DOCUMENT_TYPES,
    eventTypes: EVENT_TYPES,
  },
}

export default seedConfig
