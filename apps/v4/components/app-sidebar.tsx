"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, PanelLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { useLang } from "@/components/lang-context"
import { useNavVisibility } from "@/components/nav-visibility-context"

// ─── Colorful SVG icon set ────────────────────────────────────────────────────
// Each icon uses explicit fill/stroke with a vibrant color palette

function IconRota() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0">
      <rect x="3" y="3" width="14" height="14" rx="2.5" fill="rgba(99,102,241,0.12)" stroke="#6366f1" strokeWidth="1.5"/>
      <path d="M3 7 L17 7" stroke="#6366f1" strokeWidth="1.5"/>
      <path d="M7 3 L7 7" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M13 3 L13 7" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M6 11 L9 11 M6 14 L12 14" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function IconTrips() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0">
      <path d="M3 10 Q3 4 10 4 Q17 4 17 10 Q17 16 10 16 Q3 16 3 10Z" stroke="#6366f1" strokeWidth="1.5" fill="rgba(99,102,241,0.12)"/>
      <path d="M7 10 L13 10 M10 7 L13 10 L10 13" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconImportHub() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0">
      <rect x="3" y="3" width="14" height="14" rx="3" fill="rgba(139,92,246,0.12)" stroke="#8b5cf6" strokeWidth="1.5"/>
      <path d="M10 7 L10 13 M7 11 L10 14 L13 11" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 6.5 L13 6.5" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0">
      <rect x="3" y="5" width="14" height="12" rx="2.5" fill="rgba(59,130,246,0.12)" stroke="#3b82f6" strokeWidth="1.5"/>
      <path d="M3 9 L17 9" stroke="#3b82f6" strokeWidth="1.5"/>
      <path d="M7 3 L7 7 M13 3 L13 7" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="7" cy="13" r="1" fill="#3b82f6"/>
      <circle cx="10" cy="13" r="1" fill="#3b82f6"/>
      <circle cx="13" cy="13" r="1" fill="#3b82f6"/>
    </svg>
  )
}

function IconDrivers() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0">
      <circle cx="10" cy="7" r="3" fill="rgba(14,165,233,0.15)" stroke="#0ea5e9" strokeWidth="1.5"/>
      <path d="M4 17 C4 13.5 6.5 11 10 11 C13.5 11 16 13.5 16 17" stroke="#0ea5e9" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M14 5 L16 3 M10 4 L10 1.5" stroke="#0ea5e9" strokeWidth="1 " strokeLinecap="round" opacity="0.5"/>
    </svg>
  )
}

function IconPlaces() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0">
      <path d="M10 3 C7 3 5 5.5 5 8 C5 12 10 17 10 17 C10 17 15 12 15 8 C15 5.5 13 3 10 3Z" fill="rgba(16,185,129,0.15)" stroke="#10b981" strokeWidth="1.5"/>
      <circle cx="10" cy="8" r="2" fill="#10b981"/>
    </svg>
  )
}

function IconSettings() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0">
      <circle cx="10" cy="10" r="2.5" fill="rgba(107,114,128,0.15)" stroke="#6b7280" strokeWidth="1.5"/>
      <path d="M10 3.5 L10 5 M10 15 L10 16.5 M3.5 10 L5 10 M15 10 L16.5 10 M5.6 5.6 L6.7 6.7 M13.3 13.3 L14.4 14.4 M14.4 5.6 L13.3 6.7 M6.7 13.3 L5.6 14.4" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function IconCompliance() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0">
      <path d="M10 2 L16 5 L16 10 C16 13.5 13.5 16.5 10 18 C6.5 16.5 4 13.5 4 10 L4 5 Z" fill="rgba(239,68,68,0.12)" stroke="#ef4444" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M7.5 10 L9.5 12 L12.5 8" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconFleetManagement() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0">
      <rect x="2" y="9" width="8" height="5" rx="1" fill="rgba(99,102,241,0.15)" stroke="#6366f1" strokeWidth="1.5"/>
      <rect x="11" y="6" width="7" height="8" rx="1" fill="rgba(99,102,241,0.15)" stroke="#6366f1" strokeWidth="1.5"/>
      <circle cx="5.5" cy="15.5" r="1.5" fill="#6366f1"/>
      <circle cx="14.5" cy="15.5" r="1.5" fill="#6366f1"/>
      <path d="M10 12 L10 4 L13 4" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
    </svg>
  )
}

function IconMaintenance() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0">
      <path d="M12.5 4 C14 4 15.5 5 16 6.5 L14.5 8 L12 5.5 Z" fill="rgba(245,158,11,0.2)" stroke="#f59e0b" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M12 5.5 L7 10.5 L6 14 L9.5 13 L14.5 8 Z" fill="rgba(245,158,11,0.12)" stroke="#f59e0b" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M7 10.5 L9.5 13" stroke="#f59e0b" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  )
}

function IconInventory() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0">
      <path d="M10 2 L17 6 L17 11 L10 15 L3 11 L3 6 Z" fill="rgba(20,184,166,0.12)" stroke="#14b8a6" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M10 2 L10 15 M3 6 L10 10 L17 6" stroke="#14b8a6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconFuelTracking() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0">
      <rect x="4" y="4" width="9" height="13" rx="2" fill="rgba(34,197,94,0.12)" stroke="#22c55e" strokeWidth="1.5"/>
      <path d="M13 7 L15 7 C15.8 7 16.5 7.5 16.5 9 L16.5 14 C16.5 14.8 16 15 15.5 15 L13 15" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M6 8 L11 8 M6 11 L9 11" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function IconParking() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0">
      <rect x="3" y="3" width="14" height="14" rx="3" fill="rgba(59,130,246,0.12)" stroke="#3b82f6" strokeWidth="1.5"/>
      <path d="M8 14 L8 6 L11 6 C12.7 6 13.5 7 13.5 8.5 C13.5 10 12.7 11 11 11 L8 11" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconTollExpenses() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0">
      <rect x="2" y="6" width="16" height="10" rx="2" fill="rgba(245,158,11,0.12)" stroke="#f59e0b" strokeWidth="1.5"/>
      <path d="M2 10 L18 10" stroke="#f59e0b" strokeWidth="1" opacity="0.5"/>
      <path d="M6 13.5 L6 13.5" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
      <path d="M9.5 13 L12.5 13" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M5 6 L7 3.5 L13 3.5 L15 6" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconTollReceipts() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0">
      <path d="M5 3 L15 3 L15 16 L13 14.5 L11 16 L9 14.5 L7 16 L5 14.5 Z" fill="rgba(234,179,8,0.12)" stroke="#eab308" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M8 7 L12 7 M8 10 L11 10" stroke="#eab308" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function IconFuelReceipts() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0">
      <path d="M5 3 L13 3 L13 16 L11 14.5 L9 16 L7 14.5 L5 16 Z" fill="rgba(16,185,129,0.12)" stroke="#10b981" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M7.5 7.5 C7.5 6.7 8.2 6 9 6 C9.8 6 10.5 6.7 10.5 7.5 C10.5 8.3 9 9.5 9 9.5 C9 9.5 7.5 8.3 7.5 7.5Z" stroke="#10b981" strokeWidth="1.2" fill="rgba(16,185,129,0.2)"/>
      <path d="M8 11.5 L10 11.5" stroke="#10b981" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

function IconHolidays() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0">
      <circle cx="10" cy="10" r="7" fill="rgba(249,115,22,0.12)" stroke="#f97316" strokeWidth="1.5"/>
      <path d="M6.5 13 C7 11 8 9.5 10 9 C12 8.5 13 10 13 10" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="10" cy="7" r="1" fill="#f97316"/>
    </svg>
  )
}

function IconOffShift() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0">
      <circle cx="10" cy="10" r="7" fill="rgba(168,85,247,0.12)" stroke="#a855f7" strokeWidth="1.5"/>
      <path d="M10 6 L10 10 L13 12" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 4 L16 2 M17 7 L19 6" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
    </svg>
  )
}

function IconVehicles() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0">
      <rect x="2" y="9" width="16" height="5" rx="1.5" fill="rgba(99,102,241,0.12)" stroke="#6366f1" strokeWidth="1.5"/>
      <path d="M2 11 L5 7 L15 7 L18 11" stroke="#6366f1" strokeWidth="1.5" strokeLinejoin="round"/>
      <circle cx="5.5" cy="15" r="1.5" fill="rgba(99,102,241,0.2)" stroke="#6366f1" strokeWidth="1.2"/>
      <circle cx="14.5" cy="15" r="1.5" fill="rgba(99,102,241,0.2)" stroke="#6366f1" strokeWidth="1.2"/>
    </svg>
  )
}

function IconFleets() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0">
      <rect x="1" y="10" width="8" height="5" rx="1" fill="rgba(99,102,241,0.15)" stroke="#6366f1" strokeWidth="1.4"/>
      <rect x="11" y="7" width="8" height="8" rx="1" fill="rgba(99,102,241,0.15)" stroke="#6366f1" strokeWidth="1.4"/>
      <circle cx="3.5" cy="16" r="1" fill="#6366f1"/>
      <circle cx="6.5" cy="16" r="1" fill="#6366f1"/>
      <circle cx="13.5" cy="16" r="1" fill="#6366f1"/>
      <circle cx="16.5" cy="16" r="1" fill="#6366f1"/>
    </svg>
  )
}

// ─── Navigation structure ─────────────────────────────────────────────────────

type NavLeaf = {
  label: string
  href: string
  icon: React.FC
  iconColor: string
  hidden?: true   // hidden from nav unless showHidden is on
}

type NavGroup = {
  groupLabel: string
  groupColor: string     // accent colour for the group header
  groupIcon: React.FC
  items: NavLeaf[]
}

type NavStandalone = {
  label: string
  href: string
  icon: React.FC
  iconColor: string
  standalone: true
  hidden?: true
}

type NavEntry = NavGroup | NavStandalone

function isStandalone(e: NavEntry): e is NavStandalone {
  return "standalone" in e && e.standalone
}

// ─── NAV DATA ──────────────────────────────────────────────────────────────────

function GroupHeaderIcon({ color }: { color: string }) {
  return <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: color }} />
}

const NAV: NavEntry[] = [
  // 1 — Transport Management
  {
    groupLabel: "Transport",
    groupColor: "#6366f1",
    groupIcon: IconTrips,
    items: [
      { label: "Trips",      href: "/trips",      icon: IconTrips,     iconColor: "#6366f1" },
      { label: "Rota",       href: "/rota",       icon: IconRota,      iconColor: "#6366f1" },
      { label: "Calendar",   href: "/calendar",   icon: IconCalendar,  iconColor: "#3b82f6" },
      { label: "Import Hub", href: "/import-hub", icon: IconImportHub, iconColor: "#8b5cf6", hidden: true },
    ],
  },
  // 2 — Compliance (hidden — staging only)
  { label: "Compliance",  href: "/compliance",  icon: IconCompliance,  iconColor: "#ef4444", standalone: true, hidden: true },
  // 3 — Maintenance (hidden — staging only)
  { label: "Maintenance", href: "/maintenance", icon: IconMaintenance, iconColor: "#f59e0b", standalone: true, hidden: true },
  // 4 — Inventory (hidden — staging only)
  { label: "Inventory",   href: "/inventory",   icon: IconInventory,   iconColor: "#14b8a6", standalone: true, hidden: true },
  // 5 — Expense Management
  {
    groupLabel: "Expenses",
    groupColor: "#f59e0b",
    groupIcon: IconTollExpenses,
    items: [
      { label: "Fuel Tracking", href: "/fuel-tracking", icon: IconFuelTracking, iconColor: "#22c55e" },
      { label: "Fuel Receipts", href: "/fuel-receipts", icon: IconFuelReceipts, iconColor: "#10b981" },
      { label: "Parking",       href: "/parking",       icon: IconParking,      iconColor: "#3b82f6" },
      { label: "Toll Expenses", href: "/toll-expenses", icon: IconTollExpenses, iconColor: "#f59e0b" },
      { label: "Toll Receipts", href: "/toll-receipts", icon: IconTollReceipts, iconColor: "#eab308" },
    ],
  },
  // 6 — People Management
  {
    groupLabel: "People",
    groupColor: "#a855f7",
    groupIcon: IconOffShift,
    items: [
      { label: "Holidays & Leave", href: "/holidays",  icon: IconHolidays, iconColor: "#f97316" },
      { label: "Off-Shift",        href: "/off-shift", icon: IconOffShift, iconColor: "#a855f7" },
    ],
  },
  // 7 — Settings
  {
    groupLabel: "Settings",
    groupColor: "#6b7280",
    groupIcon: IconSettings,
    items: [
      { label: "Drivers",              href: "/drivers",   icon: IconDrivers,   iconColor: "#0ea5e9" },
      { label: "Vehicles",             href: "/vehicles",  icon: IconVehicles,  iconColor: "#6366f1" },
      { label: "Fleets",               href: "/fleets",    icon: IconFleets,    iconColor: "#6366f1" },
      { label: "Places",               href: "/places",    icon: IconPlaces,    iconColor: "#10b981" },
      { label: "Allocation Settings",  href: "/settings",  icon: IconSettings,  iconColor: "#6b7280" },
    ],
  },
]

// ─── SIDEBAR COMPONENT ────────────────────────────────────────────────────────

export function AppSidebar() {
  const pathname   = usePathname()
  const isMobile   = useIsMobile()
  const { t }      = useLang()
  const { showHidden } = useNavVisibility()
  const [collapsed, setCollapsed]     = React.useState(false)
  const [mobileOpen, setMobileOpen]   = React.useState(false)

  // Which groups are expanded — default all open
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({
    "Transport": true,
    "Expenses":  false,
    "People":    true,
    "Settings":  false,
  })

  const toggleGroup = (label: string) =>
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }))

  // Close mobile on route change
  React.useEffect(() => { setMobileOpen(false) }, [pathname])

  // Ctrl/Cmd+B
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "b" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        if (isMobile) setMobileOpen(p => !p)
        else          setCollapsed(p => !p)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [isMobile])

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/")

  const sidebarCollapsed = collapsed && !isMobile

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile trigger */}
      {isMobile && (
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed left-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-md border bg-background text-foreground shadow-sm md:hidden"
          aria-label="Open sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "w-[3.5rem]" : "w-64",
          isMobile && !mobileOpen && "-translate-x-full",
          isMobile && mobileOpen  && "translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center border-b px-3">
          <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
            <img
              src="/logo.svg"
              alt="FleetYes"
              className="h-7 w-7 shrink-0 object-contain"
            />
            {!sidebarCollapsed && (
              <span className="text-base font-bold tracking-tight text-foreground">FleetYes</span>
            )}
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {NAV.map((entry, idx) => {
            if (isStandalone(entry)) {
              // Skip hidden standalones unless showHidden is on
              if (entry.hidden && !showHidden) return null
              const active = isActive(entry.href)
              const Icon = entry.icon
              return (
                <Link
                  key={entry.href}
                  href={entry.href}
                  title={sidebarCollapsed ? entry.label : undefined}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold transition-all",
                    entry.hidden
                      ? "border border-dashed border-amber-300/60 text-amber-600/70 dark:text-amber-500/60 hover:bg-amber-50/50 dark:hover:bg-amber-950/20"
                      : active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon />
                  {!sidebarCollapsed && (
                    <span className="truncate">{entry.label}</span>
                  )}
                  {active && !sidebarCollapsed && !entry.hidden && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full shrink-0" style={{ background: entry.iconColor }} />
                  )}
                  {entry.hidden && !sidebarCollapsed && (
                    <span className="ml-auto rounded px-1 text-[9px] font-bold uppercase text-amber-500/70 dark:text-amber-400/60">wip</span>
                  )}
                </Link>
              )
            }

            // ── Group ──
            const group = entry as NavGroup
            const isOpen = openGroups[group.groupLabel] ?? false
            const anyActive = group.items.some(i => isActive(i.href))

            return (
              <div key={group.groupLabel}>
                {/* Group header button */}
                {sidebarCollapsed ? (
                  // In collapsed mode show a coloured dot as separator
                  <div className="flex justify-center py-2">
                    <span className="h-px w-6 rounded" style={{ background: group.groupColor + "60" }} />
                  </div>
                ) : (
                  <button
                    onClick={() => toggleGroup(group.groupLabel)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-bold transition-colors",
                      anyActive ? "text-foreground" : "text-muted-foreground/70 hover:text-foreground"
                    )}
                  >
                    <GroupHeaderIcon color={group.groupColor} />
                    <span className="flex-1 text-left">{group.groupLabel}</span>
                    <ChevronDown
                      className={cn("h-3 w-3 transition-transform opacity-50", isOpen && "rotate-180")}
                    />
                  </button>
                )}

                {/* Sub-items */}
                {(isOpen || sidebarCollapsed) && (
                  <div className={cn("flex flex-col gap-0.5", !sidebarCollapsed && "pl-2 mt-0.5")}>
                    {group.items
                      .filter(item => !item.hidden || showHidden)
                      .map(item => {
                      const active = isActive(item.href)
                      const Icon = item.icon
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          title={sidebarCollapsed ? item.label : undefined}
                          className={cn(
                            "group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-all",
                            item.hidden
                              ? "border border-dashed border-amber-300/60 text-amber-600/70 dark:text-amber-500/60 hover:bg-amber-50/50 dark:hover:bg-amber-950/20"
                              : active
                              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm"
                              : "text-sidebar-foreground/65 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground font-normal"
                          )}
                        >
                          <Icon />
                          {!sidebarCollapsed && (
                            <span className="truncate">{item.label}</span>
                          )}
                          {active && !sidebarCollapsed && !item.hidden && (
                            <span className="ml-auto h-1.5 w-1.5 rounded-full shrink-0" style={{ background: item.iconColor }} />
                          )}
                          {item.hidden && !sidebarCollapsed && (
                            <span className="ml-auto rounded px-1 text-[9px] font-bold uppercase text-amber-500/70 dark:text-amber-400/60">wip</span>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                )}

                {/* Spacer after group */}
                {!sidebarCollapsed && <div className="h-1" />}
              </div>
            )
          })}
        </nav>

        {/* Footer — collapse toggle */}
        {!isMobile && (
          <div className="border-t p-2">
            <button
              onClick={() => setCollapsed(p => !p)}
              className="flex w-full items-center justify-center rounded-md px-3 py-2 text-sm text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <PanelLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
            </button>
          </div>
        )}
      </aside>

      {/* Desktop spacer */}
      <div
        className={cn(
          "hidden shrink-0 transition-all duration-300 ease-in-out md:block",
          collapsed ? "w-[3.5rem]" : "w-64"
        )}
      />
    </>
  )
}
