"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Map,
  CalendarCheck,
  TableProperties,
  Truck,
  Container,
  MapPin,
  Fuel,
  ParkingSquare,
  Banknote,
  FileText,
  Receipt,
  ClipboardList,
  UserX,
  CalendarOff,
  Wrench,
  Settings2,
  ShieldCheck,
  Package,
  PanelLeft,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"

type NavItem = {
  title: string
  href: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { title: "Trips", href: "/trips", icon: Map },
  { title: "Calendar", href: "/calendar", icon: CalendarCheck },
  { title: "Drivers", href: "/drivers", icon: TableProperties },
  { title: "Vehicles", href: "/vehicles", icon: Truck },
  { title: "Fleets", href: "/fleets", icon: Container },
  { title: "Places", href: "/places", icon: MapPin },
  { title: "Fuel Tracking", href: "/fuel-tracking", icon: Fuel },
  { title: "Parking Monitoring", href: "/parking", icon: ParkingSquare },
  { title: "Toll Expenses", href: "/toll-expenses", icon: Banknote },
  { title: "Toll Receipts", href: "/toll-receipts", icon: FileText },
  { title: "Fuel Receipts", href: "/fuel-receipts", icon: Receipt },

  { title: "Holidays", href: "/holidays", icon: UserX },
  { title: "Off-shift", href: "/off-shift", icon: CalendarOff },
  { title: "Maintenance", href: "/maintenance", icon: Wrench },
  { title: "Compliance", href: "/compliance", icon: ShieldCheck },
  { title: "Inventory", href: "/inventory", icon: Package },
  { title: "Allocation Settings", href: "/settings", icon: Settings2 },
]

export function AppSidebar() {
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const [collapsed, setCollapsed] = React.useState(false)
  const [mobileOpen, setMobileOpen] = React.useState(false)

  // Close mobile sidebar on route change
  React.useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Keyboard shortcut to toggle sidebar
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "b" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        if (isMobile) {
          setMobileOpen((prev) => !prev)
        } else {
          setCollapsed((prev) => !prev)
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isMobile])

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
          collapsed && !isMobile ? "w-[3.5rem]" : "w-64",
          isMobile && !mobileOpen && "-translate-x-full",
          isMobile && mobileOpen && "translate-x-0"
        )}
      >
        {/* Header */}
        <div className="flex h-14 items-center border-b px-4">
          <Link href="/" className="flex items-center gap-2 overflow-hidden">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Truck className="h-4 w-4" />
            </div>
            {(!collapsed || isMobile) && (
              <span className="text-sm font-semibold tracking-tight">
                FleetYes
              </span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <ul className="flex flex-col gap-0.5">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/")

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                    )}
                    title={collapsed && !isMobile ? item.title : undefined}
                  >
                    <item.icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        isActive
                          ? "text-sidebar-primary"
                          : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/70"
                      )}
                    />
                    {(!collapsed || isMobile) && (
                      <span className="truncate">{item.title}</span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer — collapse toggle (desktop only) */}
        {!isMobile && (
          <div className="border-t p-2">
            <button
              onClick={() => setCollapsed((prev) => !prev)}
              className="flex w-full items-center justify-center rounded-md px-3 py-2 text-sm text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <PanelLeft
                className={cn(
                  "h-4 w-4 transition-transform",
                  collapsed && "rotate-180"
                )}
              />
            </button>
          </div>
        )}
      </aside>

      {/* Spacer for desktop layout */}
      <div
        className={cn(
          "hidden shrink-0 transition-all duration-300 ease-in-out md:block",
          collapsed ? "w-[3.5rem]" : "w-64"
        )}
      />
    </>
  )
}
