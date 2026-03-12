"use client"
import * as React from "react"
import { Settings as SettingsIcon, Users, Bell, Building, Truck, Shield, Palette, Globe, Save } from "lucide-react"

function Section({ title, icon: Icon, children }: { title:string; icon:React.ElementType; children:React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="border-b bg-muted/40 px-5 py-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-indigo-500" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  )
}
function Field({ label, defaultVal, type="text", note }: { label:string; defaultVal?:string; type?:string; note?:string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <input type={type} defaultValue={defaultVal} className="h-9 w-full max-w-sm rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
      {note && <p className="mt-1 text-[10px] text-muted-foreground">{note}</p>}
    </div>
  )
}
function Toggle({ label, sub, defaultOn=true }: { label:string; sub?:string; defaultOn?:boolean }) {
  const [on, setOn] = React.useState(defaultOn)
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div><p className="text-sm font-medium">{label}</p>{sub&&<p className="text-xs text-muted-foreground">{sub}</p>}</div>
      <button onClick={()=>setOn(p=>!p)} className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${on?"bg-indigo-500":"bg-muted border"}`}>
        <span className={`inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform ${on?"translate-x-5":"translate-x-0.5"}`} />
      </button>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8 lg:p-10">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight md:text-3xl">Settings</h1><p className="mt-1 text-sm text-muted-foreground">Configure your FleetYes workspace, integrations, and preferences.</p></div>
        <button className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Save className="h-3.5 w-3.5" /> Save Changes</button>
      </div>

      <Section title="Company Profile" icon={Building}>
        <Field label="Company Name"      defaultVal="FleetYes Transport Ltd"              />
        <Field label="Operator's Licence Number" defaultVal="OF1012345" note="O-Licence issued by DVSA Traffic Commissioner" />
        <Field label="Primary Contact Email"     defaultVal="manager@fleetyes.co.uk" type="email" />
        <Field label="Contact Phone Number"      defaultVal="+44 1889 123456"   />
        <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Operating Centre Address</label><textarea defaultValue="Towers Business Park, Rugeley, WS15 1LX" rows={3} className="w-full max-w-sm rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
        <Field label="O-Licence Vehicle Limit"   defaultVal="8" type="number" note="Maximum number of authorised vehicles" />
      </Section>

      <Section title="User Management" icon={Users}>
        <div className="space-y-2 text-sm">
          {[
            { name:"Fleet Manager",   email:"manager@fleetyes.co.uk",  role:"Admin",      last:"2026-03-12" },
            { name:"Gareth Williams", email:"gareth@fleetyes.co.uk",   role:"Technician", last:"2026-03-11" },
            { name:"Sandra Okafor",  email:"sandra@fleetyes.co.uk",   role:"Technician", last:"2026-03-10" },
            { name:"DVSA Auditor",   email:"dvsa@example.gov.uk",     role:"Auditor",    last:"2026-02-15" },
          ].map(u=>(
            <div key={u.email} className="flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5">
              <div><p className="font-medium">{u.name}</p><p className="text-xs text-muted-foreground">{u.email} · Last login {u.last}</p></div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${u.role==="Admin"?"bg-indigo-100 text-indigo-700":u.role==="Auditor"?"bg-gray-100 text-gray-700":"bg-blue-100 text-blue-700"}`}>{u.role}</span>
                <button className="text-xs text-indigo-500 hover:underline">Edit</button>
              </div>
            </div>
          ))}
        </div>
        <button className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs hover:bg-muted"><Users className="h-3.5 w-3.5" /> Invite User</button>
      </Section>

      <Section title="Notifications" icon={Bell}>
        <Toggle label="PMI due alert"             sub="7 days before — Email + Push"            defaultOn={true}  />
        <Toggle label="PMI fail alert"            sub="Immediately — SMS + Email"               defaultOn={true}  />
        <Toggle label="VOR vehicle alert"         sub="Immediately — Push notification"         defaultOn={true}  />
        <Toggle label="Licence expiry (30/14/0d)" sub="Escalating alerts — Email + SMS"         defaultOn={true}  />
        <Toggle label="Visa / RTW expiry"         sub="90/60/30 day alerts — Email"             defaultOn={true}  />
        <Toggle label="Low stock (MRO)"           sub="Below reorder level — Email"             defaultOn={false} />
        <Toggle label="Rest period violation"     sub="Immediately — Dashboard + Email"         defaultOn={true}  />
        <Toggle label="Weekly digest summary"     sub="Monday 08:00 — Email"                    defaultOn={true}  />
      </Section>

      <Section title="Vehicle & PMI Defaults" icon={Truck}>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Default PMI Interval</label>
          <select className="h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
            <option>6 weeks</option><option>4 weeks</option><option>8 weeks</option><option>12 weeks</option>
          </select>
        </div>
        <Toggle label="Auto-schedule PMI from last inspection date" defaultOn={true} />
        <Toggle label="Require brake test result on every PMI"      defaultOn={true} />
        <Toggle label="Require e-signature to submit PMI"           defaultOn={true} />
        <Toggle label="Prompt for serial/batch on safety-critical parts" defaultOn={true} />
      </Section>

      <Section title="Compliance & Integrations" icon={Shield}>
        <Toggle label="DVLA Licence Checking (ADD API)"     sub="Auto-check twice yearly; monthly for 9+ pts" defaultOn={true}  />
        <Toggle label="DVSA Earned Recognition reporting"   sub="Auto-format compliance exports"              defaultOn={true}  />
        <Toggle label="Samsara telematics sync"             sub="Live mileage pull for PMI scheduling"        defaultOn={false} />
        <Toggle label="Webfleet integration"                sub="Trip data import"                            defaultOn={false} />
        <div><label className="mb-1 block text-xs font-medium text-muted-foreground">DVLA API Key</label><input type="password" placeholder="••••••••••••" className="h-9 w-full max-w-sm rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
      </Section>

      <Section title="Appearance" icon={Palette}>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Theme</label>
          <div className="flex gap-2">
            {["System","Light","Dark"].map(t=>(
              <button key={t} className={`rounded-lg border px-4 py-1.5 text-xs font-medium transition-colors ${t==="System"?"bg-primary text-primary-foreground":"bg-background hover:bg-muted"}`}>{t}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Date Format</label>
          <select className="h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"><option>DD/MM/YYYY (UK)</option><option>MM/DD/YYYY (US)</option></select>
        </div>
      </Section>

      <Section title="Locale & Region" icon={Globe}>
        <Field label="Country"       defaultVal="United Kingdom" />
        <Field label="Timezone"      defaultVal="Europe/London"  />
        <Field label="Currency"      defaultVal="GBP – British Pound Sterling" />
      </Section>

      <div className="flex justify-end pb-4">
        <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90"><Save className="h-4 w-4" /> Save All Changes</button>
      </div>
    </div>
  )
}
