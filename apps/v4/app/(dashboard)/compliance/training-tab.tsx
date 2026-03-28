"use client"
import * as React from "react"
import {
  BookOpen, Plus, ChevronRight, CheckCircle2, XCircle, AlertCircle,
  Upload, Trash2, GripVertical, Video, FileText, Presentation,
  Users, Clock, Award, ArrowLeft, Pencil, Eye, Archive,
  BarChart3, ClipboardCheck, Search, Filter, X, ChevronUp, ChevronDown, Save,
} from "lucide-react"

// â”€â”€â”€ TYPES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface CourseMaterial {
  id: string; type: "video" | "pdf" | "ppt"; title: string
  url: string; durationSec?: number; pageCount?: number; sortOrder: number
}

interface CourseQuestion {
  id: string; type: "mcq" | "mcq_multi" | "true_false" | "free_text"
  text: string; options?: string[]; correctIndex?: number
  correctIndices?: number[]; correctAnswer?: boolean
  sampleAnswer?: string; maxScore: number; sortOrder: number
}

interface Enrolment {
  id: string; courseId: string; driverId: string; driverName: string
  status: "assigned" | "in_progress" | "quiz_passed" | "awaiting_approval" | "approved" | "rejected"
  bestScore: number | null; attemptCount: number
  driverSignedAt: string | null; operatorSignedAt: string | null
  submittedAt: string | null
}

interface Course {
  id: string; title: string; description: string
  category: string; passMarkPercent: number; autoApproveOnPass: boolean
  status: "draft" | "published" | "archived"
  materials: CourseMaterial[]; questions: CourseQuestion[]
  enrolments: Enrolment[]; assignedTo: string[]; deadline: string | null
  createdAt: string; createdBy: string
}

// â”€â”€â”€ DEMO DATA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const demoCourses: Course[] = [
  {
    id: "c1", title: "Safe Loading Procedures", description: "Learn correct load securing techniques including ratchet straps, edge protectors, and weight distribution for curtainsider trailers.",
    category: "Health & Safety", passMarkPercent: 80, autoApproveOnPass: false, status: "published",
    assignedTo: ["all"], deadline: "2026-06-01", createdAt: "2026-02-15", createdBy: "G. Williams",
    materials: [
      { id: "m1", type: "video", title: "Introduction to Load Securing", url: "#", durationSec: 420, sortOrder: 0 },
      { id: "m2", type: "pdf", title: "DVSA Load Safety Guide", url: "#", pageCount: 24, sortOrder: 1 },
      { id: "m3", type: "ppt", title: "Company Loading Policy", url: "#", pageCount: 18, sortOrder: 2 },
      { id: "m4", type: "video", title: "Practical Demo â€” Curtainsider", url: "#", durationSec: 300, sortOrder: 3 },
    ],
    questions: [
      { id: "q1", type: "mcq", text: "Which strap type is preferred for heavy palletised loads?", options: ["Cam buckle strap", "Webbing sling", "Ratchet strap", "Rope"], correctIndex: 2, maxScore: 1, sortOrder: 0 },
      { id: "q2", type: "true_false", text: "Edge protectors are only required for loads over 500kg.", correctAnswer: false, maxScore: 1, sortOrder: 1 },
      { id: "q3", type: "mcq_multi", text: "Select ALL that apply: Before driving, you must check:", options: ["Load is against headboard", "Straps are tensioned", "Curtains are buckled", "Tail lift is stowed"], correctIndices: [0, 1, 2, 3], maxScore: 1, sortOrder: 2 },
      { id: "q4", type: "free_text", text: "Describe the correct procedure for securing a half-loaded curtainsider.", sampleAnswer: "Position load against headboard, use minimum 2 ratchet straps per row, apply edge protectors at strap contact points, tension straps to manufacturer spec, close and buckle curtains, check from both sides.", maxScore: 5, sortOrder: 3 },
      { id: "q5", type: "mcq", text: "What is the minimum number of straps for a single row of pallets?", options: ["1", "2", "3", "4"], correctIndex: 1, maxScore: 1, sortOrder: 4 },
    ],
    enrolments: [
      { id: "e1", courseId: "c1", driverId: "d1", driverName: "James O'Connor", status: "approved", bestScore: 92, attemptCount: 1, driverSignedAt: "2026-03-10T10:30:00Z", operatorSignedAt: "2026-03-10T14:00:00Z", submittedAt: "2026-03-10T10:25:00Z" },
      { id: "e2", courseId: "c1", driverId: "d2", driverName: "Maria Santos", status: "awaiting_approval", bestScore: 85, attemptCount: 2, driverSignedAt: "2026-03-14T09:15:00Z", operatorSignedAt: null, submittedAt: "2026-03-14T09:10:00Z" },
      { id: "e3", courseId: "c1", driverId: "d3", driverName: "Piotr Kowalski", status: "in_progress", bestScore: null, attemptCount: 0, driverSignedAt: null, operatorSignedAt: null, submittedAt: null },
      { id: "e4", courseId: "c1", driverId: "d4", driverName: "Lena Fischer", status: "approved", bestScore: 88, attemptCount: 1, driverSignedAt: "2026-03-08T11:20:00Z", operatorSignedAt: "2026-03-08T16:00:00Z", submittedAt: "2026-03-08T11:15:00Z" },
      { id: "e5", courseId: "c1", driverId: "d5", driverName: "Ahmed Hassan", status: "assigned", bestScore: null, attemptCount: 0, driverSignedAt: null, operatorSignedAt: null, submittedAt: null },
      { id: "e6", courseId: "c1", driverId: "d6", driverName: "Sophie Turner", status: "approved", bestScore: 95, attemptCount: 1, driverSignedAt: "2026-03-06T08:45:00Z", operatorSignedAt: "2026-03-06T12:30:00Z", submittedAt: "2026-03-06T08:40:00Z" },
    ],
  },
  {
    id: "c2", title: "Walkaround Check Refresher", description: "Annual refresher on the daily walkaround inspection process, defect reporting, and VOR procedures.",
    category: "Operational", passMarkPercent: 90, autoApproveOnPass: true, status: "published",
    assignedTo: ["all"], deadline: null, createdAt: "2026-01-20", createdBy: "G. Williams",
    materials: [
      { id: "m5", type: "video", title: "Walkaround Process Overview", url: "#", durationSec: 600, sortOrder: 0 },
      { id: "m6", type: "pdf", title: "Defect Reporting Guide", url: "#", pageCount: 12, sortOrder: 1 },
    ],
    questions: [
      { id: "q6", type: "mcq", text: "How many sections are in the standard walkaround check?", options: ["3", "5", "7", "9"], correctIndex: 1, maxScore: 1, sortOrder: 0 },
      { id: "q7", type: "true_false", text: "A driver can proceed with a dangerous defect if they notify the workshop.", correctAnswer: false, maxScore: 1, sortOrder: 1 },
      { id: "q8", type: "free_text", text: "What should you do if you discover brake warning lights on during start-up?", sampleAnswer: "Do not move the vehicle. Report immediately to workshop. Raise VOR flag. Log defect with photo evidence on the app.", maxScore: 3, sortOrder: 2 },
    ],
    enrolments: [
      { id: "e7", courseId: "c2", driverId: "d1", driverName: "James O'Connor", status: "approved", bestScore: 100, attemptCount: 1, driverSignedAt: "2026-02-20T07:30:00Z", operatorSignedAt: "2026-02-20T10:00:00Z", submittedAt: "2026-02-20T07:25:00Z" },
      { id: "e8", courseId: "c2", driverId: "d3", driverName: "Piotr Kowalski", status: "awaiting_approval", bestScore: 93, attemptCount: 1, driverSignedAt: "2026-03-14T11:00:00Z", operatorSignedAt: null, submittedAt: "2026-03-14T10:55:00Z" },
    ],
  },
  {
    id: "c3", title: "Driver Hours & Tachograph Rules", description: "UK and EU drivers' hours regulations, tachograph modes, rest period calculations, and infringement avoidance.",
    category: "Driver CPC", passMarkPercent: 85, autoApproveOnPass: false, status: "draft",
    assignedTo: ["d1", "d2", "d4"], deadline: "2026-07-01", createdAt: "2026-03-10", createdBy: "M. Patel",
    materials: [
      { id: "m7", type: "video", title: "EU Rules Overview", url: "#", durationSec: 900, sortOrder: 0 },
      { id: "m8", type: "ppt", title: "Rest Period Calculations", url: "#", pageCount: 30, sortOrder: 1 },
      { id: "m9", type: "pdf", title: "Common Infringements Guide", url: "#", pageCount: 16, sortOrder: 2 },
    ],
    questions: [],
    enrolments: [],
  },
  {
    id: "c4", title: "Vulnerable Road Users Awareness", description: "Understanding blind spots, cyclist and pedestrian awareness, and safe urban driving techniques.",
    category: "Driver CPC", passMarkPercent: 80, autoApproveOnPass: true, status: "archived",
    assignedTo: ["all"], deadline: null, createdAt: "2025-06-15", createdBy: "G. Williams",
    materials: [
      { id: "m10", type: "video", title: "Understanding Blind Spots", url: "#", durationSec: 480, sortOrder: 0 },
    ],
    questions: [
      { id: "q9", type: "true_false", text: "Cyclists should be given at least 1.5m clearance when overtaking.", correctAnswer: true, maxScore: 1, sortOrder: 0 },
    ],
    enrolments: [
      { id: "e9", courseId: "c4", driverId: "d1", driverName: "James O'Connor", status: "approved", bestScore: 90, attemptCount: 1, driverSignedAt: "2025-07-10T09:00:00Z", operatorSignedAt: "2025-07-10T12:00:00Z", submittedAt: "2025-07-10T08:55:00Z" },
    ],
  },
]

// â”€â”€â”€ HELPERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-foreground dark:bg-gray-800 dark:text-foreground",
  published: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  archived: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
}
const enrolStatusColors: Record<string, string> = {
  assigned: "bg-gray-100 text-foreground dark:bg-gray-800 dark:text-foreground",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  quiz_passed: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  awaiting_approval: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
}

const matIcon: Record<string, React.ElementType> = { video: Video, pdf: FileText, ppt: Presentation }
const catColors: Record<string, string> = {
  "Health & Safety": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "Operational": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "Driver CPC": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  "Custom": "bg-gray-100 text-foreground dark:bg-gray-800 dark:text-foreground",
}

function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60)
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`
}
function fmtDate(d: string) { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) }
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const days = Math.floor(diff / 86400000)
  if (days > 30) return fmtDate(d)
  if (days > 0) return `${days}d ago`
  const hours = Math.floor(diff / 3600000)
  return hours > 0 ? `${hours}h ago` : "Just now"
}

// â”€â”€â”€ COURSE LIST VIEW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function CourseListView({ courses, onSelect, onNew }: {
  courses: Course[]; onSelect: (c: Course) => void; onNew: () => void
}) {
  const [filter, setFilter] = React.useState<"all" | "draft" | "published" | "archived">("all")
  const [search, setSearch] = React.useState("")

  const pendingApprovals = courses.flatMap(c => c.enrolments).filter(e => e.status === "awaiting_approval").length
  const totalEnrolled = courses.flatMap(c => c.enrolments).length
  const totalCompleted = courses.flatMap(c => c.enrolments).filter(e => e.status === "approved").length

  const filtered = courses
    .filter(c => filter === "all" || c.status === filter)
    .filter(c => !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.category.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="flex flex-col gap-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500"><BookOpen className="h-5 w-5 text-white" /></div>
          <div><p className="text-2xl font-bold leading-none">{courses.length}</p><p className="mt-0.5 text-xs font-medium text-muted-foreground">Total Courses</p></div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500"><CheckCircle2 className="h-5 w-5 text-white" /></div>
          <div><p className="text-2xl font-bold leading-none">{totalCompleted}</p><p className="mt-0.5 text-xs font-medium text-muted-foreground">Completed</p></div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500"><Clock className="h-5 w-5 text-white" /></div>
          <div><p className="text-2xl font-bold leading-none">{pendingApprovals}</p><p className="mt-0.5 text-xs font-medium text-muted-foreground">Awaiting Approval</p></div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500"><Users className="h-5 w-5 text-white" /></div>
          <div><p className="text-2xl font-bold leading-none">{totalEnrolled}</p><p className="mt-0.5 text-xs font-medium text-muted-foreground">Total Enrolments</p></div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search courses..." className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="flex gap-1 rounded-lg border bg-muted/30 p-0.5">
          {(["all", "published", "draft", "archived"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${filter === f ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >{f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}</button>
          ))}
        </div>
        <button onClick={onNew} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="h-3.5 w-3.5" /> New Course
        </button>
      </div>

      {/* Course Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(course => {
          const approved = course.enrolments.filter(e => e.status === "approved").length
          const total = course.enrolments.length
          const pending = course.enrolments.filter(e => e.status === "awaiting_approval").length
          return (
            <button key={course.id} onClick={() => onSelect(course)}
              className="flex flex-col rounded-xl border bg-card shadow-sm text-left transition-all hover:shadow-md hover:border-primary/30 group"
            >
              <div className="flex items-start justify-between p-4 pb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${statusColors[course.status]}`}>{course.status}</span>
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${catColors[course.category] || catColors.Custom}`}>{course.category}</span>
                  </div>
                  <h3 className="text-sm font-bold leading-tight group-hover:text-primary transition-colors">{course.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{course.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground mt-1 shrink-0 group-hover:text-primary transition-colors" />
              </div>
              <div className="mt-auto border-t px-4 py-3 flex items-center gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{course.materials.length} items</span>
                <span className="flex items-center gap-1"><ClipboardCheck className="h-3 w-3" />{course.questions.length} questions</span>
                <span className="flex items-center gap-1"><Award className="h-3 w-3" />{course.passMarkPercent}% pass</span>
              </div>
              <div className="border-t px-4 py-2.5 flex items-center gap-3">
                {total > 0 ? (
                  <>
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${total > 0 ? (approved / total) * 100 : 0}%` }} />
                    </div>
                    <span className="text-[11px] font-medium">{approved}/{total} passed</span>
                    {pending > 0 && <span className="rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 text-[9px] font-bold">{pending} pending</span>}
                  </>
                ) : (
                  <span className="text-[11px] text-muted-foreground">No enrolments yet</span>
                )}
              </div>
            </button>
          )
        })}
        {filtered.length === 0 && (
          <div className="col-span-full flex flex-col items-center gap-3 py-16 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">{search ? "No courses match your search" : "No courses yet"}</p>
            <button onClick={onNew} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="h-3.5 w-3.5" /> Create First Course
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// â”€â”€â”€ COURSE DETAIL / BUILDER VIEW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function CourseDetailView({ course: initial, onBack, onUpdate }: { course: Course; onBack: () => void; onUpdate: (c: Course) => void }) {
  const [course, setCourse] = React.useState(initial)
  const [section, setSection] = React.useState<"details" | "materials" | "questions" | "enrolments">("details")
  const [reviewItem, setReviewItem] = React.useState<Enrolment | null>(null)
  const [showAddMat, setShowAddMat] = React.useState(false)
  const [showAddQ, setShowAddQ] = React.useState(false)
  const [editingDetails, setEditingDetails] = React.useState(initial.title === "New Course")
  // Material form
  const [matTitle, setMatTitle] = React.useState("")
  const [matType, setMatType] = React.useState<"video" | "pdf" | "ppt">("video")
  const [matUrl, setMatUrl] = React.useState("")
  const [matPages, setMatPages] = React.useState("")
  // Question form
  const [qType, setQType] = React.useState<CourseQuestion["type"]>("mcq")
  const [qText, setQText] = React.useState("")
  const [qOptions, setQOptions] = React.useState(["", "", "", ""])
  const [qCorrectIdx, setQCorrectIdx] = React.useState(0)
  const [qCorrectMulti, setQCorrectMulti] = React.useState<number[]>([])
  const [qTFAnswer, setQTFAnswer] = React.useState(true)
  const [qSampleAnswer, setQSampleAnswer] = React.useState("")
  const [qMaxScore, setQMaxScore] = React.useState(1)
  // Edit details
  const [editTitle, setEditTitle] = React.useState(course.title)
  const [editDesc, setEditDesc] = React.useState(course.description)
  const [editCat, setEditCat] = React.useState(course.category)
  const [editPass, setEditPass] = React.useState(course.passMarkPercent)
  const [editDeadline, setEditDeadline] = React.useState(course.deadline || "")
  const [editAssign, setEditAssign] = React.useState(course.assignedTo.includes("all") ? "all" : "specific")
  const [editAutoApprove, setEditAutoApprove] = React.useState(course.autoApproveOnPass)
  // Edit question
  const [editingQ, setEditingQ] = React.useState<string | null>(null)

  const pending = course.enrolments.filter(e => e.status === "awaiting_approval")

  function update(patch: Partial<Course>) {
    const updated = { ...course, ...patch }
    setCourse(updated)
    onUpdate(updated)
  }

  function addMaterial() {
    if (!matTitle.trim()) return
    const mat: CourseMaterial = {
      id: `m${Date.now()}`, type: matType, title: matTitle.trim(),
      url: matType === "video" ? matUrl.trim() || "#" : "#",
      sortOrder: course.materials.length,
      ...(matType !== "video" && matPages ? { pageCount: parseInt(matPages) } : {}),
    }
    update({ materials: [...course.materials, mat] })
    setMatTitle(""); setMatUrl(""); setMatPages(""); setShowAddMat(false)
  }

  function deleteMaterial(id: string) {
    update({ materials: course.materials.filter(m => m.id !== id).map((m, i) => ({ ...m, sortOrder: i })) })
  }

  function moveMaterial(id: string, dir: -1 | 1) {
    const mats = [...course.materials].sort((a, b) => a.sortOrder - b.sortOrder)
    const idx = mats.findIndex(m => m.id === id)
    if (idx + dir < 0 || idx + dir >= mats.length) return
    const tmp = mats[idx]; mats[idx] = mats[idx + dir]; mats[idx + dir] = tmp
    update({ materials: mats.map((m, i) => ({ ...m, sortOrder: i })) })
  }

  function addQuestion() {
    if (!qText.trim()) return
    const q: CourseQuestion = {
      id: `q${Date.now()}`, type: qType, text: qText.trim(), maxScore: qMaxScore,
      sortOrder: course.questions.length,
      ...(qType === "mcq" ? { options: qOptions.filter(o => o.trim()), correctIndex: qCorrectIdx } : {}),
      ...(qType === "mcq_multi" ? { options: qOptions.filter(o => o.trim()), correctIndices: qCorrectMulti } : {}),
      ...(qType === "true_false" ? { correctAnswer: qTFAnswer } : {}),
      ...(qType === "free_text" ? { sampleAnswer: qSampleAnswer } : {}),
    }
    update({ questions: [...course.questions, q] })
    resetQForm(); setShowAddQ(false)
  }

  function resetQForm() { setQText(""); setQOptions(["", "", "", ""]); setQCorrectIdx(0); setQCorrectMulti([]); setQTFAnswer(true); setQSampleAnswer(""); setQMaxScore(1); setQType("mcq") }

  function deleteQuestion(id: string) {
    update({ questions: course.questions.filter(q => q.id !== id).map((q, i) => ({ ...q, sortOrder: i })) })
  }

  function saveDetails() {
    update({ title: editTitle, description: editDesc, category: editCat, passMarkPercent: editPass, autoApproveOnPass: editAutoApprove, deadline: editDeadline || null, assignedTo: editAssign === "all" ? ["all"] : course.assignedTo.filter(a => a !== "all") })
    setEditingDetails(false)
  }

  function toggleStatus() {
    if (course.status === "draft") update({ status: "published" })
    else if (course.status === "published") update({ status: "archived" })
    else if (course.status === "archived") update({ status: "published" })
  }

  if (reviewItem) return <ReviewPanel enrolment={reviewItem} course={course} onBack={() => setReviewItem(null)} />

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs hover:bg-muted"><ArrowLeft className="h-3 w-3" /> Back</button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${statusColors[course.status]}`}>{course.status}</span>
            <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${catColors[course.category] || catColors.Custom}`}>{course.category}</span>
          </div>
          <h2 className="text-lg font-bold mt-1">{course.title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {course.status === "draft" && (
            <button onClick={toggleStatus} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-green-600 px-3 text-xs font-medium text-white hover:bg-green-700"><Eye className="h-3 w-3" /> Publish</button>
          )}
          {course.status === "published" && (
            <button onClick={toggleStatus} className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs hover:bg-muted"><Archive className="h-3 w-3" /> Archive</button>
          )}
          {course.status === "archived" && (
            <button onClick={toggleStatus} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-green-600 px-3 text-xs font-medium text-white hover:bg-green-700"><Eye className="h-3 w-3" /> Re-publish</button>
          )}
          <button onClick={() => { setEditingDetails(true); setSection("details") }} className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs hover:bg-muted"><Pencil className="h-3 w-3" /> Edit</button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 rounded-lg border bg-muted/30 p-0.5">
        {([
          { id: "details" as const, label: "Details", icon: BookOpen },
          { id: "materials" as const, label: `Materials (${course.materials.length})`, icon: FileText },
          { id: "questions" as const, label: `Questions (${course.questions.length})`, icon: ClipboardCheck },
          { id: "enrolments" as const, label: `Enrolments (${course.enrolments.length})`, icon: Users },
        ]).map(t => (
          <button key={t.id} onClick={() => setSection(t.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition-colors ${section === t.id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          ><t.icon className="h-3.5 w-3.5" />{t.label}
            {t.id === "enrolments" && pending.length > 0 && (
              <span className="ml-1 rounded-full bg-amber-500 text-white px-1.5 py-0.5 text-[9px] font-bold">{pending.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* â”€â”€ Details â”€â”€ */}
      {section === "details" && !editingDetails && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-bold mb-3">Course Information</h3>
            <div className="space-y-3">
              {[
                { label: "Description", value: course.description || "â€”" },
                { label: "Category", value: course.category },
                { label: "Pass Mark", value: `${course.passMarkPercent}%` },
                { label: "Deadline", value: course.deadline ? fmtDate(course.deadline) : "No deadline" },
                { label: "Created", value: `${fmtDate(course.createdAt)} by ${course.createdBy}` },
                { label: "Assigned To", value: course.assignedTo.includes("all") ? "All drivers" : `${course.assignedTo.length} specific drivers` },
              ].map(r => (
                <div key={r.label}><p className="text-[10px] font-medium text-muted-foreground uppercase">{r.label}</p><p className="text-sm">{r.value}</p></div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-bold mb-3">Completion Summary</h3>
            <div className="space-y-3">
              {[
                { label: "Total Enrolments", val: course.enrolments.length, color: "text-foreground" },
                { label: "Passed & Signed", val: course.enrolments.filter(e => e.status === "approved").length, color: "text-green-600" },
                { label: "Awaiting Approval", val: pending.length, color: "text-amber-600" },
                { label: "In Progress", val: course.enrolments.filter(e => e.status === "in_progress").length, color: "text-blue-600" },
                { label: "Not Started", val: course.enrolments.filter(e => e.status === "assigned").length, color: "text-foreground" },
                { label: "Rejected (retaking)", val: course.enrolments.filter(e => e.status === "rejected").length, color: "text-red-600" },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{r.label}</span>
                  <span className={`text-sm font-bold ${r.color}`}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ Edit Details Form â”€â”€ */}
      {section === "details" && editingDetails && (
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-bold mb-4">Edit Course Details</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Title</label>
              <input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Course title" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Description</label>
              <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3} className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" placeholder="What will drivers learn?" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Category</label>
              <select value={editCat} onChange={e => setEditCat(e.target.value)} className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
                <option>Health &amp; Safety</option><option>Operational</option><option>Driver CPC</option><option>Custom</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Pass Mark (%)</label>
              <input type="number" min={1} max={100} value={editPass} onChange={e => setEditPass(Number(e.target.value))} className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Deadline</label>
              <input type="date" value={editDeadline} onChange={e => setEditDeadline(e.target.value)} className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Assign To</label>
              <select value={editAssign} onChange={e => setEditAssign(e.target.value)} className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
                <option value="all">All Drivers</option><option value="specific">Specific Drivers</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editAutoApprove} onChange={e => setEditAutoApprove(e.target.checked)} className="h-4 w-4 rounded border accent-green-600" />
                <span className="text-sm font-medium">Auto-approve when driver passes</span>
                <span className="text-[10px] text-muted-foreground">(Skip manual operator review if score ≥ pass mark and no free-text questions need grading)</span>
              </label>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 pt-4 border-t">
            <button onClick={saveDetails} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90"><Save className="h-3 w-3" /> Save Details</button>
            <button onClick={() => setEditingDetails(false)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs hover:bg-muted">Cancel</button>
          </div>
        </div>
      )}

      {/* â”€â”€ Materials â”€â”€ */}
      {section === "materials" && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="border-b bg-muted/40 px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-semibold">Learning Materials</span>
            <button onClick={() => setShowAddMat(true)} className="inline-flex h-7 items-center gap-1 rounded-lg bg-primary px-3 text-[11px] font-medium text-primary-foreground hover:bg-primary/90"><Plus className="h-3 w-3" /> Add Material</button>
          </div>

          {/* Add Material Form */}
          {showAddMat && (
            <div className="border-b bg-blue-50 dark:bg-blue-900/10 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold">Add Material</span>
                <button onClick={() => setShowAddMat(false)} className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted"><X className="h-3.5 w-3.5" /></button>
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase">Title</label>
                  <input value={matTitle} onChange={e => setMatTitle(e.target.value)} placeholder="e.g. Safety Training Video" className="h-8 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase">Type</label>
                  <select value={matType} onChange={e => setMatType(e.target.value as typeof matType)} className="h-8 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
                    <option value="video">Video</option><option value="pdf">PDF Document</option><option value="ppt">Presentation</option>
                  </select>
                </div>
                {matType === "video" ? (
                  <div>
                    <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase">Video URL</label>
                    <input value={matUrl} onChange={e => setMatUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="h-8 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                ) : (
                  <div>
                    <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase">Pages</label>
                    <input type="number" min={1} value={matPages} onChange={e => setMatPages(e.target.value)} placeholder="e.g. 24" className="h-8 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={addMaterial} disabled={!matTitle.trim()} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"><Plus className="h-3 w-3" /> Add Material</button>
                {matType !== "video" && <p className="text-[10px] text-muted-foreground self-center ml-2">File upload will be available when connected to backend</p>}
              </div>
            </div>
          )}

          {course.materials.length === 0 && !showAddMat ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Upload className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No materials yet.</p>
              <button onClick={() => setShowAddMat(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"><Plus className="h-3.5 w-3.5" /> Add First Material</button>
            </div>
          ) : (
            <div className="divide-y">
              {course.materials.sort((a, b) => a.sortOrder - b.sortOrder).map((mat, i) => {
                const MIcon = matIcon[mat.type] || FileText
                return (
                  <div key={mat.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/10 transition-colors group">
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => moveMaterial(mat.id, -1)} disabled={i === 0} className="h-4 w-4 flex items-center justify-center rounded hover:bg-muted disabled:opacity-20"><ChevronUp className="h-3 w-3" /></button>
                      <button onClick={() => moveMaterial(mat.id, 1)} disabled={i === course.materials.length - 1} className="h-4 w-4 flex items-center justify-center rounded hover:bg-muted disabled:opacity-20"><ChevronDown className="h-3 w-3" /></button>
                    </div>
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-muted text-[10px] font-bold text-muted-foreground">{i + 1}</span>
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${mat.type === "video" ? "bg-red-100 dark:bg-red-900/20" : mat.type === "pdf" ? "bg-blue-100 dark:bg-blue-900/20" : "bg-amber-100 dark:bg-amber-900/20"}`}>
                      <MIcon className={`h-4 w-4 ${mat.type === "video" ? "text-red-600" : mat.type === "pdf" ? "text-blue-600" : "text-amber-600"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{mat.title}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{mat.type}{mat.durationSec ? ` Â· ${fmtDuration(mat.durationSec)}` : ""}{mat.pageCount ? ` Â· ${mat.pageCount} pages` : ""}</p>
                    </div>
                    <button onClick={() => deleteMaterial(mat.id)} className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 flex items-center justify-center rounded-lg border hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-900/20">
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* â”€â”€ Questions â”€â”€ */}
      {section === "questions" && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="border-b bg-muted/40 px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-semibold">Quiz Questions</span>
            <button onClick={() => { resetQForm(); setShowAddQ(true) }} className="inline-flex h-7 items-center gap-1 rounded-lg bg-primary px-3 text-[11px] font-medium text-primary-foreground hover:bg-primary/90"><Plus className="h-3 w-3" /> Add Question</button>
          </div>

          {/* Add Question Form */}
          {showAddQ && (
            <div className="border-b bg-indigo-50 dark:bg-indigo-900/10 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold">Add Question</span>
                <button onClick={() => setShowAddQ(false)} className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted"><X className="h-3.5 w-3.5" /></button>
              </div>
              <div className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase">Question Type</label>
                    <select value={qType} onChange={e => { setQType(e.target.value as typeof qType); setQCorrectIdx(0); setQCorrectMulti([]) }} className="h-8 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
                      <option value="mcq">Multiple Choice (single answer)</option>
                      <option value="mcq_multi">Multiple Choice (multiple answers)</option>
                      <option value="true_false">True / False</option>
                      <option value="free_text">Free Text (manual grading)</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase">Score (points)</label>
                    <input type="number" min={1} max={10} value={qMaxScore} onChange={e => setQMaxScore(Number(e.target.value))} className="h-8 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase">Question Text</label>
                  <textarea value={qText} onChange={e => setQText(e.target.value)} rows={2} className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" placeholder="Enter your question..." />
                </div>
                {(qType === "mcq" || qType === "mcq_multi") && (
                  <div>
                    <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase">Options {qType === "mcq" ? "(click radio to set correct)" : "(check all correct)"}</label>
                    <div className="grid gap-2">
                      {qOptions.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2">
                          {qType === "mcq" ? (
                            <input type="radio" name="correct" checked={qCorrectIdx === i} onChange={() => setQCorrectIdx(i)} className="accent-green-600" />
                          ) : (
                            <input type="checkbox" checked={qCorrectMulti.includes(i)} onChange={e => setQCorrectMulti(e.target.checked ? [...qCorrectMulti, i] : qCorrectMulti.filter(x => x !== i))} className="accent-green-600" />
                          )}
                          <input value={opt} onChange={e => { const o = [...qOptions]; o[i] = e.target.value; setQOptions(o) }} placeholder={`Option ${i + 1}`} className="h-7 flex-1 rounded border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                          {qOptions.length > 2 && (
                            <button onClick={() => setQOptions(qOptions.filter((_, j) => j !== i))} className="h-6 w-6 flex items-center justify-center rounded hover:bg-red-50"><Trash2 className="h-3 w-3 text-red-400" /></button>
                          )}
                        </div>
                      ))}
                      {qOptions.length < 6 && (
                        <button onClick={() => setQOptions([...qOptions, ""])} className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"><Plus className="h-3 w-3" /> Add option</button>
                      )}
                    </div>
                  </div>
                )}
                {qType === "true_false" && (
                  <div>
                    <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase">Correct Answer</label>
                    <div className="flex gap-3">
                      <button onClick={() => setQTFAnswer(true)} className={`rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors ${qTFAnswer ? "bg-green-500 text-white border-green-500" : "hover:bg-muted"}`}>True</button>
                      <button onClick={() => setQTFAnswer(false)} className={`rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors ${!qTFAnswer ? "bg-red-500 text-white border-red-500" : "hover:bg-muted"}`}>False</button>
                    </div>
                  </div>
                )}
                {qType === "free_text" && (
                  <div>
                    <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase">Sample Answer (for operator reference)</label>
                    <textarea value={qSampleAnswer} onChange={e => setQSampleAnswer(e.target.value)} rows={2} className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" placeholder="Reference answer for the operator to compare against..." />
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={addQuestion} disabled={!qText.trim() || ((qType === "mcq" || qType === "mcq_multi") && qOptions.filter(o => o.trim()).length < 2)} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"><Plus className="h-3 w-3" /> Add Question</button>
              </div>
            </div>
          )}

          <div className="p-3 grid gap-3">
            {course.questions.sort((a, b) => a.sortOrder - b.sortOrder).map((q, i) => (
              <div key={q.id} className="rounded-lg border p-4 hover:border-primary/30 transition-colors group">
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 mt-0.5 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                        q.type === "mcq" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                        q.type === "mcq_multi" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" :
                        q.type === "true_false" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      }`}>{q.type.replace("_", "/")}</span>
                      <span className="text-[10px] text-muted-foreground">{q.maxScore} pt{q.maxScore > 1 ? "s" : ""}</span>
                      {q.type === "free_text" && <span className="text-[10px] text-amber-600 font-medium">manual grading</span>}
                    </div>
                    <p className="text-sm">{q.text}</p>
                    {q.options && (
                      <div className="mt-2 grid gap-1">
                        {q.options.map((opt, oi) => (
                          <div key={oi} className={`flex items-center gap-2 rounded px-2 py-1 text-xs ${
                            (q.type === "mcq" && q.correctIndex === oi) || (q.type === "mcq_multi" && q.correctIndices?.includes(oi))
                              ? "bg-green-50 text-green-700 font-medium dark:bg-green-900/10 dark:text-green-400"
                              : "text-muted-foreground"
                          }`}>
                            {(q.type === "mcq" && q.correctIndex === oi) || (q.type === "mcq_multi" && q.correctIndices?.includes(oi))
                              ? <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" />
                              : <XCircle className="h-3 w-3 text-muted-foreground/30 shrink-0" />
                            }
                            {opt}
                          </div>
                        ))}
                      </div>
                    )}
                    {q.type === "true_false" && (
                      <p className="mt-1.5 text-xs"><span className="font-medium">Answer:</span> <span className={q.correctAnswer ? "text-green-600" : "text-red-600"}>{q.correctAnswer ? "True" : "False"}</span></p>
                    )}
                    {q.type === "free_text" && q.sampleAnswer && (
                      <div className="mt-2 rounded-lg bg-muted/30 p-2">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase mb-0.5">Sample Answer</p>
                        <p className="text-xs text-muted-foreground">{q.sampleAnswer}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => deleteQuestion(q.id)} className="h-7 w-7 flex items-center justify-center rounded-lg border hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-900/20"><Trash2 className="h-3 w-3 text-red-500" /></button>
                  </div>
                </div>
              </div>
            ))}
            {course.questions.length === 0 && !showAddQ && (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <ClipboardCheck className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No questions yet.</p>
                <button onClick={() => { resetQForm(); setShowAddQ(true) }} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"><Plus className="h-3.5 w-3.5" /> Add First Question</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* â”€â”€ Enrolments â”€â”€ */}
      {section === "enrolments" && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="border-b bg-muted/40 px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-semibold">Driver Enrolments</span>
            {pending.length > 0 && <span className="rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 text-[10px] font-bold">{pending.length} awaiting approval</span>}
          </div>
          {course.enrolments.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Users className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No drivers enrolled yet. Publish the course and assign drivers.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead><tr className="border-b bg-muted/20 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2 text-left">Driver</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-center">Attempts</th>
                <th className="px-4 py-2 text-center">Best Score</th>
                <th className="px-4 py-2 text-center">Driver Signed</th>
                <th className="px-4 py-2 text-center">Operator Signed</th>
                <th className="px-4 py-2 text-right">Action</th>
              </tr></thead>
              <tbody className="divide-y">
                {course.enrolments.map(enr => (
                  <tr key={enr.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-2.5 text-sm font-medium">{enr.driverName}</td>
                    <td className="px-4 py-2.5"><span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${enrolStatusColors[enr.status]}`}>{enr.status.replace(/_/g, " ")}</span></td>
                    <td className="px-4 py-2.5 text-center text-sm">{enr.attemptCount}</td>
                    <td className="px-4 py-2.5 text-center text-sm font-medium">{enr.bestScore !== null ? `${enr.bestScore}%` : "â€”"}</td>
                    <td className="px-4 py-2.5 text-center">{enr.driverSignedAt ? <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /> : <span className="text-xs text-muted-foreground">â€”</span>}</td>
                    <td className="px-4 py-2.5 text-center">{enr.operatorSignedAt ? <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /> : <span className="text-xs text-muted-foreground">â€”</span>}</td>
                    <td className="px-4 py-2.5 text-right">
                      {enr.status === "awaiting_approval" && (
                        <button onClick={() => setReviewItem(enr)} className="inline-flex h-7 items-center gap-1 rounded-lg bg-amber-500 px-3 text-[11px] font-medium text-white hover:bg-amber-600">
                          <Eye className="h-3 w-3" /> Review
                        </button>
                      )}
                      {enr.status === "approved" && (
                        <button className="inline-flex h-7 items-center gap-1 rounded-lg border px-3 text-[11px] hover:bg-muted">
                          <Award className="h-3 w-3" /> Certificate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}


// â”€â”€â”€ REVIEW PANEL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ReviewPanel({ enrolment, course, onBack }: { enrolment: Enrolment; course: Course; onBack: () => void }) {
  const [approved, setApproved] = React.useState(false)
  const [rejected, setRejected] = React.useState(false)

  if (approved) return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <CheckCircle2 className="h-16 w-16 text-green-500" />
      <h2 className="text-2xl font-bold">Assessment Approved</h2>
      <p className="text-muted-foreground">{enrolment.driverName} â€” {course.title}</p>
      <p className="text-sm text-muted-foreground">Certificate generated and filed in driver documents.</p>
      <button onClick={onBack} className="mt-2 rounded-lg border px-4 py-2 text-sm hover:bg-muted">â† Back to Enrolments</button>
    </div>
  )

  if (rejected) return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <XCircle className="h-16 w-16 text-red-500" />
      <h2 className="text-2xl font-bold">Assessment Rejected</h2>
      <p className="text-muted-foreground">{enrolment.driverName} has been notified to retake the quiz.</p>
      <button onClick={onBack} className="mt-2 rounded-lg border px-4 py-2 text-sm hover:bg-muted">â† Back to Enrolments</button>
    </div>
  )

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs hover:bg-muted"><ArrowLeft className="h-3 w-3" /> Back</button>
        <div className="flex-1">
          <h2 className="text-lg font-bold">Review: {enrolment.driverName}</h2>
          <p className="text-xs text-muted-foreground">{course.title} Â· Submitted {enrolment.submittedAt ? timeAgo(enrolment.submittedAt) : "â€”"}</p>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-[10px] font-medium text-muted-foreground uppercase">Score</p>
          <p className="text-2xl font-bold text-green-600">{enrolment.bestScore}%</p>
          <p className="text-xs text-muted-foreground">Pass mark: {course.passMarkPercent}%</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-[10px] font-medium text-muted-foreground uppercase">Attempts</p>
          <p className="text-2xl font-bold">{enrolment.attemptCount}</p>
          <p className="text-xs text-muted-foreground">Passed on attempt {enrolment.attemptCount}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-[10px] font-medium text-muted-foreground uppercase">Driver Signature</p>
          <div className="flex items-center gap-2 mt-1">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">Signed</span>
          </div>
          <p className="text-xs text-muted-foreground">{enrolment.driverSignedAt ? fmtDate(enrolment.driverSignedAt) : "â€”"}</p>
        </div>
      </div>

      {/* Answer Review */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="border-b bg-muted/40 px-4 py-3">
          <span className="text-sm font-semibold">Answer Review</span>
        </div>
        <div className="p-3 grid gap-3">
          {course.questions.sort((a, b) => a.sortOrder - b.sortOrder).map((q, i) => (
            <div key={q.id} className="rounded-lg border p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 mt-0.5 shrink-0">{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{q.text}</p>
                  {q.type !== "free_text" ? (
                    <div className="mt-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-xs text-green-700 font-medium">Correct â€” {q.maxScore}/{q.maxScore} pts</span>
                    </div>
                  ) : (
                    <div className="mt-2 space-y-2">
                      <div className="rounded-lg bg-blue-50 dark:bg-blue-900/10 p-3">
                        <p className="text-[10px] font-medium text-blue-700 dark:text-blue-400 uppercase mb-0.5">Driver&apos;s Answer</p>
                        <p className="text-xs">&quot;Position load against headboard, use ratchet straps, apply edge protectors, tension properly, and close curtains on both sides.&quot;</p>
                      </div>
                      <div className="rounded-lg bg-muted/30 p-3">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase mb-0.5">Sample Answer</p>
                        <p className="text-xs text-muted-foreground">{q.sampleAnswer}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-xs font-medium">Score:</label>
                        <select className="h-7 rounded-lg border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring">
                          {Array.from({ length: q.maxScore + 1 }, (_, s) => (
                            <option key={s} value={s}>{s} / {q.maxScore}</option>
                          )).reverse()}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20 p-4">
        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
        <span className="text-sm font-medium text-amber-800 dark:text-amber-300 flex-1">Review the answers above, grade any free-text questions, then approve or reject.</span>
        <button onClick={() => setRejected(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-300 bg-white px-4 text-xs font-medium text-red-700 hover:bg-red-50 dark:bg-transparent dark:hover:bg-red-900/20">
          <XCircle className="h-3.5 w-3.5" /> Reject
        </button>
        <button onClick={() => setApproved(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-green-600 px-4 text-xs font-medium text-white hover:bg-green-700">
          <CheckCircle2 className="h-3.5 w-3.5" /> Approve & Sign
        </button>
      </div>
    </div>
  )
}

// â”€â”€â”€ MAIN EXPORT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function TrainingTab() {
  const [courses, setCourses] = React.useState<Course[]>(demoCourses)
  const [view, setView] = React.useState<"list" | "detail">("list")
  const [selectedCourse, setSelectedCourse] = React.useState<Course | null>(null)

  function handleSelect(c: Course) {
    setSelectedCourse(c)
    setView("detail")
  }
  function handleBack() {
    setView("list")
    setSelectedCourse(null)
  }
  function handleUpdate(updated: Course) {
    setCourses(prev => {
      const idx = prev.findIndex(c => c.id === updated.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = updated; return next }
      return [...prev, updated]
    })
    setSelectedCourse(updated)
  }

  return (
    <div className="flex flex-col gap-0">
      {view === "list" && (
        <CourseListView courses={courses} onSelect={handleSelect} onNew={() => {
          const draft: Course = {
            id: `c${Date.now()}`, title: "New Course", description: "", category: "Custom",
            passMarkPercent: 80, autoApproveOnPass: false, status: "draft", materials: [], questions: [], enrolments: [],
            assignedTo: [], deadline: null, createdAt: new Date().toISOString(), createdBy: "Current User"
          }
          handleUpdate(draft)
          handleSelect(draft)
        }} />
      )}
      {view === "detail" && selectedCourse && (
        <CourseDetailView course={selectedCourse} onBack={handleBack} onUpdate={handleUpdate} />
      )}
    </div>
  )
}
