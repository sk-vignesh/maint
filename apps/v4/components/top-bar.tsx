"use client"
import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { Sun, Moon, Monitor, LogOut, User, Settings, ChevronDown, Eye, EyeOff } from "lucide-react"
import { useLang } from "@/components/lang-context"
import { useNavVisibility } from "@/components/nav-visibility-context"
import { cn } from "@/lib/utils"
import { clearToken } from "@/lib/ontrack-api"

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

// ─── TOP BAR ──────────────────────────────────────────────────────────────────

const MOCK_USER = { name: "Gareth Williams", email: "gareth.williams@fleetyes.co.uk", role: "Transport Manager" }

// Derive a human-readable page name from the current URL path
const PATH_LABELS: Record<string, string> = {
  "/trips":             "Trips",
  "/drivers":           "Drivers",
  "/fleet-management":  "Fleet",
  "/vehicles":          "Vehicles",
  "/compliance":        "Compliance",
  "/maintenance":       "Maintenance",
  "/fuel-receipts":     "Fuel",
  "/toll-receipts":     "Tolls",
  "/parking":           "Parking",
  "/inventory":         "Inventory",
  "/settings":          "Settings",
  "/help":              "Help",
  "/": "Dashboard",
}

function usePageLabel() {
  const pathname = usePathname()
  // Match longest prefix
  const key = Object.keys(PATH_LABELS)
    .filter(k => pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0]
  return key ? PATH_LABELS[key] : ""
}

export function TopBar() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { lang, setLang, t } = useLang()
  const { showHidden, toggleHidden } = useNavVisibility()
  const [profileOpen, setProfileOpen] = React.useState(false)
  const profileRef = React.useRef<HTMLDivElement>(null)
  const pageLabel = usePageLabel()

  function handleLogout() {
    clearToken()
    router.push("/login")
  }

  // Close on outside click
  React.useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  const initials = MOCK_USER.name.split(" ").map(n => n[0]).join("").toUpperCase()

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-1.5 border-b bg-background/80 px-4 backdrop-blur-md">

      {/* ── Page title (left) ────────────────────────────────────────────── */}
      {pageLabel && (
        <h1 className="text-base font-semibold tracking-tight">{pageLabel}</h1>
      )}

      {/* ── Right-side controls ──────────────────────────────────────────── */}
      <div className="ml-auto flex items-center gap-1.5">

      {/* ── Hidden pages toggle ─────────────────────────────────────────── */}
      <button
        onClick={toggleHidden}
        title={showHidden ? "Hide staging pages" : "Show staging pages"}
        className={cn(
          "flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors",
          showHidden
            ? "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-700"
            : "bg-muted/40 text-muted-foreground hover:text-foreground"
        )}
      >
        {showHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        <span className="hidden sm:inline">Staging</span>
      </button>

      {/* ── Language toggle ─────────────────────────────────────────────── */}
      <div className="flex items-center rounded-lg border bg-muted/40 p-0.5">
        <button
          onClick={() => setLang("en")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            lang === "en" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
          title="English"
        >
          <FlagGB className="h-3 w-5 rounded-[2px] shadow-sm" />
          EN
        </button>
        <button
          onClick={() => setLang("de")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            lang === "de" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
          title="Deutsch"
        >
          <FlagDE className="h-3 w-5 rounded-[2px] shadow-sm" />
          DE
        </button>
      </div>

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
          {/* Avatar */}
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white">
            {initials}
          </span>
          <span className="hidden text-xs font-medium sm:block max-w-[120px] truncate">
            {MOCK_USER.name}
          </span>
          <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", profileOpen && "rotate-180")} />
        </button>

        {/* Dropdown */}
        {profileOpen && (
          <div className="absolute right-0 top-full mt-1.5 w-60 rounded-xl border bg-popover shadow-lg ring-1 ring-black/5 dark:ring-white/10 overflow-hidden z-50">
            {/* User info */}
            <div className="border-b px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-sm font-bold text-white">
                  {initials}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{MOCK_USER.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{MOCK_USER.email}</p>
                  <p className="text-[10px] text-muted-foreground">{MOCK_USER.role}</p>
                </div>
              </div>
            </div>

            {/* Menu items */}
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
    </header>
  )
}
