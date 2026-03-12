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
  ShieldCheck,
  UserX,
  CalendarOff,
  Wrench,
  Settings2,
} from "lucide-react"

const quickLinks = [
  { title: "Trips", href: "/trips", icon: Map, description: "Manage trip routes and schedules" },
  { title: "Vehicles", href: "/vehicles", icon: Truck, description: "Fleet vehicle inventory" },
  { title: "Drivers", href: "/drivers", icon: TableProperties, description: "Driver profiles and assignments" },
  { title: "Maintenance", href: "/maintenance", icon: Wrench, description: "Service schedules and repairs" },
  { title: "Fuel Tracking", href: "/fuel-tracking", icon: Fuel, description: "Monitor fuel consumption" },
  { title: "Compliance", href: "/compliance", icon: ShieldCheck, description: "DVSA compliance & driver checks" },
]

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8 lg:p-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome to FleetYes — your fleet management control center.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Active Vehicles", value: "—", change: "" },
          { label: "Active Drivers", value: "—", change: "" },
          { label: "Trips Today", value: "—", change: "" },
          { label: "Compliance Alerts", value: "3", change: "" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border bg-card p-5 shadow-sm"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-2 text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Quick Access</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="group flex items-start gap-4 rounded-xl border bg-card p-5 shadow-sm transition-all hover:border-primary/20 hover:shadow-md"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
