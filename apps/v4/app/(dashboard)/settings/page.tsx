"use client"
import * as React from "react"
import {
  Clock, CalendarDays, UserCheck, Wrench,
  Route, UserClock, CalendarCheck, Truck,
  ChevronDown, Lock,
} from "lucide-react"

function Toggle({ on, onChange, locked }: { on: boolean; onChange?: () => void; locked?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={!locked ? onChange : undefined}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${locked ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${on ? "bg-green-500" : "bg-muted border"}`}
    >
      <span className={`inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  )
}

function Panel({
  title, children, defaultOpen = true,
}: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(p => !p)}
        className="flex w-full items-center gap-3 border-b bg-muted/40 px-5 py-3.5 text-left"
      >
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`} />
        <span className="font-semibold">{title}</span>
      </button>
      {open && <div className="p-5">{children}</div>}
    </div>
  )
}

function RuleRow({
  icon: Icon, title, description, on, onChange, locked,
}: {
  icon: React.ElementType; title: string; description: string
  on: boolean; onChange?: () => void; locked?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center gap-4">
        <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">{title}</p>
            {locked && <Lock className="h-3 w-3 text-muted-foreground" />}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground max-w-xl">{description}</p>
        </div>
      </div>
      <Toggle on={on} onChange={onChange} locked={locked} />
    </div>
  )
}

export default function AllocationSettingsPage() {
  // Driver Allocation Rules are configurable
  const [maxWeeklyTrips,   setMaxWeeklyTrips]   = React.useState(true)
  const [shiftPreference,  setShiftPreference]   = React.useState(true)
  const [restDays,         setRestDays]          = React.useState(true)
  const [preferredVehicle, setPreferredVehicle]  = React.useState(true)

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8 lg:p-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Allocation Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure driver and vehicle allocation rules for automated and manual trip scheduling.
        </p>
      </div>

      {/* Section 1 – Legal & Compliance (locked) */}
      <Panel title="Legal and Compliance Rules">
        <p className="mb-4 text-sm text-muted-foreground">
          These settings ensure adherence to legal rest periods, driver availability, and vehicle
          maintenance standards, and <strong>cannot be modified</strong>.
        </p>
        <div className="flex flex-col gap-3">
          <RuleRow
            icon={Clock}
            title="Rest Compliance (Between Shifts)"
            description="Ensures a minimum of 11 hours of rest between consecutive shifts for each driver."
            on={true}
            locked
          />
          <RuleRow
            icon={CalendarDays}
            title="Rest Compliance (Weekly)"
            description="Ensures a minimum of 46 hours of continuous rest per week during auto allocation. For manual edits, up to 24 hours of continuous rest is permitted."
            on={true}
            locked
          />
          <RuleRow
            icon={UserCheck}
            title="Driver Availability"
            description="Prevents assigning shifts to drivers who are on Holiday or unavailable. Only active drivers are considered for allocation."
            on={true}
            locked
          />
          <RuleRow
            icon={Wrench}
            title="Vehicle Maintenance"
            description="Excludes vehicles that are under maintenance from allocation."
            on={true}
            locked
          />
        </div>
      </Panel>

      {/* Section 2 – Driver Allocation Rules (configurable) */}
      <Panel title="Driver Allocation Rules">
        <p className="mb-4 text-sm text-muted-foreground">
          Configure driver preferences that define trip assignment and availability.
        </p>
        <div className="flex flex-col gap-3">
          <RuleRow
            icon={Route}
            title="Maximum Weekly Trips"
            description="Specifies the maximum number of trips a driver can be allocated in a week based on the configured limit."
            on={maxWeeklyTrips}
            onChange={() => setMaxWeeklyTrips(p => !p)}
          />
          <RuleRow
            icon={UserClock}
            title="Driver Shift Preference Timing"
            description="Prioritizes drivers based on their preferred shift times."
            on={shiftPreference}
            onChange={() => setShiftPreference(p => !p)}
          />
          <RuleRow
            icon={CalendarCheck}
            title="Driver Preferred Rest Days"
            description="Considers driver's preferred rest days when scheduling."
            on={restDays}
            onChange={() => setRestDays(p => !p)}
          />
          <RuleRow
            icon={Truck}
            title="Driver Preferred Vehicle"
            description="Assigns drivers to their preferred vehicles if available."
            on={preferredVehicle}
            onChange={() => setPreferredVehicle(p => !p)}
          />
        </div>
      </Panel>
    </div>
  )
}
