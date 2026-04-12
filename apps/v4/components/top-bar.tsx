"use client"
import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { Sun, Moon, Monitor, LogOut, User, Settings, ChevronDown, Globe } from "lucide-react"
import { useLang, type Lang } from "@/components/lang-context"
import { useNavVisibility } from "@/components/nav-visibility-context"
import { cn } from "@/lib/utils"
import { clearToken, getCurrentUser } from "@/lib/ontrack-api"

// ─── FLAG SVGs (inline, zero-dependency) ─────────────────────────────────────

function FlagGB({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 30" className={className} aria-hidden="true">
      <clipPath id="gb-s"><path d="M0,0 v30 h60 v-30 z"/></clipPath>
      <clipPath id="gb-t"><path d="M30,15 h30 v15 z M30,15 h-30 v-15 z"/></clipPath>
      <g clipPath="url(#gb-s)">
        <path d="M0,0 v30 h60 v-30 z" fill="#012169"/>
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4" clipPath="url(#gb-t)"/>
        <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10"/>
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6"/>
      </g>
    </svg>
  )
}

function FlagDE({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 5 3" className={className} aria-hidden="true">
      <rect width="5" height="3" fill="#000"/>
      <rect width="5" height="2" y="1" fill="#D00"/>
      <rect width="5" height="1" y="2" fill="#FFCE00"/>
    </svg>
  )
}

function FlagFR({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 3 2" className={className} aria-hidden="true">
      <rect width="3" height="2" fill="#ED2939"/>
      <rect width="2" height="2" fill="#fff"/>
      <rect width="1" height="2" fill="#002395"/>
    </svg>
  )
}

function FlagES({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 3 2" className={className} aria-hidden="true">
      <rect width="3" height="2" fill="#c60b1e"/>
      <rect width="3" height="1" y="0.5" fill="#ffc400"/>
    </svg>
  )
}

function FlagIT({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 3 2" className={className} aria-hidden="true">
      <rect width="3" height="2" fill="#CE2B37"/>
      <rect width="2" height="2" fill="#fff"/>
      <rect width="1" height="2" fill="#009246"/>
    </svg>
  )
}

function FlagPL({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 10" className={className} aria-hidden="true">
      <rect width="16" height="10" fill="#fff"/>
      <rect y="5" width="16" height="5" fill="#DC143C"/>
    </svg>
  )
}

// ─── Language config ─────────────────────────────────────────────────────────

const LANG_OPTIONS: { code: Lang; label: string; Flag: React.FC<{ className?: string }> }[] = [
  { code: "en", label: "English",    Flag: FlagGB },
  { code: "de", label: "Deutsch",    Flag: FlagDE },
  { code: "fr", label: "Français",   Flag: FlagFR },
  { code: "es", label: "Español",    Flag: FlagES },
  { code: "it", label: "Italiano",   Flag: FlagIT },
  { code: "pl", label: "Polski",     Flag: FlagPL },
]

// ─── Language dropdown ────────────────────────────────────────────────────────

function LangDropdown() {
  const { lang, setLang, t } = useLang()
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  const current = LANG_OPTIONS.find(l => l.code === lang) ?? LANG_OPTIONS[0]

  React.useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onOutside)
    return () => document.removeEventListener("mousedown", onOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        title={t.topbar.language}
        className={cn(
          "flex h-8 items-center gap-1.5 rounded-lg border bg-muted/40 px-2.5 text-xs font-medium transition-colors hover:bg-muted",
          open && "ring-2 ring-ring"
        )}
      >
        <current.Flag className="h-3 w-5 rounded-[2px] shadow-sm" />
        <span className="hidden sm:inline">{current.code.toUpperCase()}</span>
        <Globe className="h-3 w-3 text-muted-foreground sm:hidden" />
        <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-36 rounded-xl border bg-popover shadow-lg ring-1 ring-black/5 dark:ring-white/10 overflow-hidden">
          {LANG_OPTIONS.map(({ code, label, Flag }) => (
            <button
              key={code}
              onClick={() => { setLang(code); setOpen(false) }}
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-muted",
                lang === code ? "font-semibold text-foreground bg-muted/50" : "text-muted-foreground"
              )}
            >
              <Flag className="h-3 w-5 shrink-0 rounded-[2px] shadow-sm" />
              {label}
              {lang === code && <span className="ml-auto text-[10px] text-primary">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Top bar path labels (use t.nav from translations) ───────────────────────

const PATH_KEYS: Record<string, keyof ReturnType<typeof useLang>["t"]["nav"] | null> = {
  "/calendar":         "calendar",
  "/trips":            "trips",
  "/rota":             null,          // special: uses t.pages.rota.title
  "/vehicles":         null,          // special: uses t.pages.vehicles.title
  "/fleets":           null,          // special: uses t.pages.fleets.title
  "/places":           "places",
  "/drivers":          "drivers",
  "/fleet-management": "fleetManagement",
  "/compliance":       "compliance",
  "/maintenance-trips":"maintenanceTrips",
  "/maintenance":      "maintenance",
  "/fuel-receipts":    "fuelReceipts",
  "/fuel-tracking":    "fuelTracking",
  "/toll-expenses":    "tollExpenses",
  "/toll-receipts":    "tollReceipts",
  "/parking":          "parkingMonitoring",
  "/inventory":        "inventory",
  "/holidays":         "holidays",
  "/import-hub":       "importHub",
  "/issues":           "issues",
  "/off-shift":        "offShift",
  "/settings":         "allocationSettings",
  "/":                 "dashboard",
}

// Stable fallbacks for paths with null nav keys (pages namespace used instead)
const PATH_PAGE_KEYS: Record<string, keyof ReturnType<typeof useLang>["t"]["pages"]> = {
  "/rota":      "rota",
  "/vehicles":  "vehicles",
  "/fleets":    "fleets",
}

function usePageLabel() {
  const pathname = usePathname()
  const { t } = useLang()
  const key = Object.keys(PATH_KEYS)
    .filter(k => pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0]
  if (!key) return ""
  const navKey = PATH_KEYS[key]
  if (navKey) return t.nav[navKey]
  const pageKey = PATH_PAGE_KEYS[key]
  return pageKey ? t.pages[pageKey].title : ""
}

// ─── TOP BAR ──────────────────────────────────────────────────────────────────

const FALLBACK_USER = { name: "User", email: "", role: "" }

export function TopBar() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { t } = useLang()
  const { showHidden, toggleHidden } = useNavVisibility()
  const [profileOpen, setProfileOpen] = React.useState(false)
  const profileRef = React.useRef<HTMLDivElement>(null)
  const pageLabel = usePageLabel()

  // Read the real user from localStorage (populated at login)
  const [currentUser, setUser] = React.useState(FALLBACK_USER)
  React.useEffect(() => {
    const u = getCurrentUser()
    if (u) setUser(u)
  }, [])

  function handleLogout() {
    clearToken()
    router.push("/login")
  }

  React.useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  const initials = currentUser.name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U"

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-1.5 border-b bg-background/80 px-4 backdrop-blur-md">

      {/* ── Page title (left) ────────────────────────────────────────────── */}
      {pageLabel && (
        <h1 className="text-base font-semibold tracking-tight">{pageLabel}</h1>
      )}

      {/* ── Right-side controls ──────────────────────────────────────────── */}
      <div className="ml-auto flex items-center gap-1.5">

      {/* ── Language dropdown (6 langs) ─────────────────────────────────── */}
      <LangDropdown />

      {/* ── Theme picker ────────────────────────────────────────────────── */}
      <div className="flex items-center rounded-lg border bg-muted/40 p-0.5">
        {(["light","system","dark"] as const).map(m => {
          const Icon = m === "light" ? Sun : m === "dark" ? Moon : Monitor
          const label = m === "light" ? t.topbar.lightMode : m === "dark" ? t.topbar.darkMode : t.topbar.systemMode
          return (
            <button
              key={m}
              onClick={() => setTheme(m)}
              title={label}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                theme === m ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          )
        })}
      </div>

      {/* ── Profile dropdown ────────────────────────────────────────────── */}
      <div ref={profileRef} className="relative">
        <button
          onClick={() => setProfileOpen(v => !v)}
          className="flex h-8 items-center gap-2 rounded-lg border bg-muted/40 pl-1.5 pr-2.5 transition-colors hover:bg-muted"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white">
            {initials}
          </span>
          <span className="hidden text-xs font-medium sm:block max-w-[120px] truncate">
            {currentUser.name}
          </span>
          <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", profileOpen && "rotate-180")} />
        </button>

        {profileOpen && (
          <div className="absolute right-0 top-full mt-1.5 w-60 rounded-xl border bg-popover shadow-lg ring-1 ring-black/5 dark:ring-white/10 overflow-hidden z-50">
            <div className="border-b px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-sm font-bold text-white">
                  {initials}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{currentUser.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{currentUser.email}</p>
                  {currentUser.role && (
                    <p className="text-[10px] text-muted-foreground">{currentUser.role}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-1">
              <button
                onClick={() => setProfileOpen(false)}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                <User className="h-4 w-4 text-muted-foreground" />
                {t.topbar.profile}
              </button>
              <button
                onClick={() => setProfileOpen(false)}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                {t.topbar.settings}
              </button>
            </div>

            <div className="border-t p-1">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                {t.topbar.logout}
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </header>
  )
}
