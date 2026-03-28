"use client"

import * as React from "react"
import {
  Search, RefreshCw, Plus, Upload, Download,
  MoreHorizontal, Map as MapIcon, List, MapPin,
  Building2, Globe, Hash, Copy, Check,
  ChevronLeft, ChevronRight,
} from "lucide-react"
import { listPlaces, type Place } from "@/lib/places-api"

// ─── UK postcode → approximate lat/lng lookup (first 2–3 chars) ──────────────
// Used as a fallback since the places API doesn't return coordinates.
const UK_POSTCODE_REGIONS: Record<string, [number, number]> = {
  AB: [57.15, -2.11], AL: [51.75, -0.34], B:  [52.48, -1.89], BA: [51.38, -2.36],
  BB: [53.75, -2.49], BD: [53.79, -1.75], BH: [50.72, -1.90], BL: [53.57, -2.42],
  BN: [50.83, -0.14], BR: [51.40,  0.02], BS: [51.45, -2.60], CA: [54.90, -2.94],
  CB: [52.20,  0.12], CF: [51.48, -3.18], CH: [53.20, -2.89], CM: [51.74,  0.47],
  CO: [51.89,  0.90], CR: [51.37, -0.10], CV: [52.41, -1.51], CW: [53.09, -2.44],
  DA: [51.44,  0.22], DD: [56.46, -2.97], DE: [52.92, -1.48], DG: [55.07, -3.61],
  DH: [54.78, -1.56], DL: [54.52, -1.55], DN: [53.52, -1.13], DT: [50.71, -2.44],
  DY: [52.51, -2.09], E:  [51.52, -0.02], EC: [51.52, -0.10], EH: [55.95, -3.19],
  EN: [51.65, -0.08], EX: [50.72, -3.53], FK: [56.01, -3.78], FY: [53.82, -3.05],
  G:  [55.86, -4.25], GL: [51.86, -2.24], GU: [51.24, -0.57], HA: [51.58, -0.33],
  HD: [53.65, -1.78], HG: [53.99, -1.54], HP: [51.75, -0.74], HR: [52.06, -2.72],
  HS: [57.88, -6.80], HU: [53.74, -0.33], HX: [53.72, -1.86], IG: [51.55,  0.08],
  IP: [52.06,  1.16], IV: [57.48, -4.23], KA: [55.61, -4.50], KT: [51.39, -0.31],
  KW: [58.44, -3.10], KY: [56.17, -3.15], L:  [53.41, -2.99], LA: [54.05, -2.80],
  LD: [52.24, -3.38], LE: [52.64, -1.13], LL: [53.20, -4.08], LN: [53.23, -0.54],
  LS: [53.80, -1.55], LU: [51.88, -0.42], M:  [53.48, -2.24], ME: [51.40,  0.52],
  MK: [52.04, -0.76], ML: [55.78, -3.98], N:  [51.56, -0.11], NE: [54.97, -1.61],
  NG: [52.96, -1.17], NN: [52.24, -0.90], NP: [51.59, -2.99], NR: [52.63,  1.30],
  NW: [51.55, -0.18], OL: [53.54, -2.11], OX: [51.75, -1.26], PA: [55.84, -4.43],
  PE: [52.57, -0.24], PH: [56.40, -3.47], PL: [50.37, -4.14], PO: [50.80, -1.09],
  PR: [53.76, -2.70], RG: [51.45, -1.00], RH: [51.24, -0.20], RM: [51.55,  0.19],
  S:  [53.38, -1.47], SA: [51.62, -3.94], SE: [51.48, -0.09], SG: [51.91, -0.23],
  SK: [53.41, -2.16], SL: [51.51, -0.60], SM: [51.38, -0.19], SN: [51.55, -1.78],
  SO: [50.90, -1.40], SP: [51.07, -1.80], SR: [54.90, -1.38], SS: [51.54,  0.70],
  ST: [52.99, -2.11], SW: [51.47, -0.15], SY: [52.71, -2.76], TA: [51.02, -3.10],
  TD: [55.60, -2.43], TF: [52.70, -2.44], TN: [51.10,  0.27], TQ: [50.46, -3.53],
  TR: [50.26, -5.05], TS: [54.57, -1.24], TW: [51.45, -0.33], UB: [51.53, -0.48],
  W:  [51.51, -0.21], WA: [53.39, -2.59], WC: [51.52, -0.12], WD: [51.65, -0.40],
  WF: [53.68, -1.50], WN: [53.54, -2.63], WR: [52.19, -2.22], WS: [52.58, -1.98],
  WV: [52.59, -2.13], YO: [53.96, -1.09], ZE: [60.15, -1.15],
}

function postcodeToLatLng(postcode?: string): [number, number] | null {
  if (!postcode) return null
  const area = postcode.replace(/[^A-Z]/g, "").slice(0, 2).toUpperCase()
  // Try 2-letter, then 1-letter prefix
  return UK_POSTCODE_REGIONS[area] ?? UK_POSTCODE_REGIONS[area[0]] ?? null
}

// ─── Copy ID helper ───────────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
      title="Copy ID"
    >
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      {text}
    </button>
  )
}

// ─── Leaflet iframe map ────────────────────────────────────────────────────────

type PlaceWithCoords = Place & { lat?: number; lng?: number }

function OSMMap({ places, selectedId, onSelect }: {
  places: PlaceWithCoords[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null)

  const buildHtml = (ps: PlaceWithCoords[], selId: string | null) => {
    const mappable = ps.filter(p => p.lat != null && p.lng != null)
    const markersJs = mappable.map(p => {
      const isSel = p.uuid === selId
      // Custom SVG pin for each place
      const color = isSel ? "#4f46e5" : "#6366f1"
      const size  = isSel ? 14 : 10
      const iconSvg = `
        <svg xmlns='http://www.w3.org/2000/svg' width='${size * 3}' height='${size * 3}' viewBox='0 0 30 40'>
          <path d='M15 0 C7 0 1 6 1 14 C1 22 15 40 15 40 C15 40 29 22 29 14 C29 6 23 0 15 0Z' fill='${color}' stroke='white' stroke-width='2'/>
          <circle cx='15' cy='14' r='5' fill='white'/>
        </svg>`
      const iconUrl = `"data:image/svg+xml;charset=utf-8,${encodeURIComponent(iconSvg)}"`
      const label = (p.code ?? p.name ?? p.public_id).replace(/'/g, "\\'").substring(0, 20)
      const addr  = (p.address ?? "").replace(/'/g, "\\'").substring(0, 60)
      const pc    = (p.postal_code ?? "").replace(/'/g, "\\'")
      return `
        (function(){
          var icon = L.icon({ iconUrl: ${iconUrl}, iconSize: [${size * 3}, ${size * 3}], iconAnchor: [${size * 3 / 2}, ${size * 3}], popupAnchor: [0, -${size * 3}] });
          var m = L.marker([${p.lat}, ${p.lng}], { icon: icon }).addTo(map);
          m.bindPopup('<div style="font-family:system-ui;font-size:13px"><strong style="font-size:14px">${label}</strong><br/><span style="color:#555;font-size:11px">${pc}</span><br/><span style="color:#777;font-size:10px;line-height:1.4">${addr}</span></div>');
          m.on('click', function(){ window.parent.postMessage({type:'place-click',id:'${p.uuid}'},'*'); });
          ${isSel ? "m.openPopup();" : ""}
          markers['${p.uuid}'] = m;
        })();`
    }).join("\n")

    const sel = selId ? mappable.find(p => p.uuid === selId) : null
    const cLat = sel?.lat ?? 52.5
    const cLng = sel?.lng ?? -1.7
    const zoom = sel ? 12 : 6

    return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>*{margin:0;padding:0;box-sizing:border-box}html,body,#map{width:100%;height:100%}
.leaflet-popup-content-wrapper{border-radius:10px;box-shadow:0 4px 24px rgba(0,0,0,.15)}
</style></head>
<body><div id="map"></div><script>
  var map=L.map('map',{zoomControl:true,attributionControl:false}).setView([${cLat},${cLng}],${zoom});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
  var markers={};
  ${markersJs}
</script></body></html>`
  }

  const htmlRef = React.useRef<string>("")
  const newHtml = buildHtml(places, selectedId)

  React.useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe || newHtml === htmlRef.current) return
    htmlRef.current = newHtml
    const blob = new Blob([newHtml], { type: "text/html" })
    const url  = URL.createObjectURL(blob)
    iframe.src = url
    return () => URL.revokeObjectURL(url)
  })

  React.useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "place-click")
        onSelect(e.data.id === selectedId ? null : e.data.id)
    }
    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [selectedId, onSelect])

  const mappableCount = places.filter(p => p.lat != null).length

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border bg-card">
      {/* Map header */}
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex items-center gap-2">
          <MapIcon className="h-4 w-4 text-indigo-500" />
          <span className="text-sm font-semibold">Depot Map</span>
        </div>
        <span className="text-xs text-muted-foreground">{mappableCount} plotted</span>
      </div>
      {/* Leaflet iframe */}
      <div className="flex-1 overflow-hidden">
        <iframe
          ref={iframeRef}
          title="Places map"
          className="h-full w-full border-0"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number | string; icon: React.FC<{ className?: string }>; color: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-xl font-bold leading-none">{value}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25

export default function PlacesPage() {
  const [places,   setPlaces]   = React.useState<PlaceWithCoords[]>([])
  const [loading,  setLoading]  = React.useState(true)
  const [error,    setError]    = React.useState<string | null>(null)
  const [search,   setSearch]   = React.useState("")
  const [country,  setCountry]  = React.useState("All")
  const [view,     setView]     = React.useState<"split" | "list" | "map">("split")
  const [selected, setSelected] = React.useState<string | null>(null)
  const [page,     setPage]     = React.useState(1)

  // ── Load ──
  const load = React.useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await listPlaces({ limit: 500 })
      const enriched: PlaceWithCoords[] = (res.places ?? []).map(p => {
        const coords = postcodeToLatLng(p.postal_code)
        return { ...p, lat: coords?.[0], lng: coords?.[1] }
      })
      setPlaces(enriched)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load places")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  // ── Derived filters ──
  const countries = React.useMemo(() => {
    const set = new Set(places.map(p => p.country ?? "Unknown").filter(Boolean))
    return Array.from(set).sort()
  }, [places])

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase()
    return places.filter(p => {
      const matchSearch = !q ||
        (p.name ?? "").toLowerCase().includes(q) ||
        (p.code ?? "").toLowerCase().includes(q) ||
        (p.address ?? "").toLowerCase().includes(q) ||
        (p.postal_code ?? "").toLowerCase().includes(q) ||
        (p.city ?? "").toLowerCase().includes(q) ||
        (p.public_id ?? "").toLowerCase().includes(q)
      const matchCountry = country === "All" || (p.country ?? "Unknown") === country
      return matchSearch && matchCountry
    })
  }, [places, search, country])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const paged      = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // Reset page on filter change
  React.useEffect(() => setPage(1), [search, country])

  // Stats
  const uniqueCountries = new Set(places.map(p => p.country ?? "").filter(Boolean)).size
  const mapped          = places.filter(p => p.lat != null).length

  // Handle row click → select + switch to split/map
  const handleRowLocate = (uuid: string) => {
    setSelected(uuid)
    if (view === "list") setView("split")
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-5 overflow-hidden">

      {/* ── Header ── */}
      <div className="flex shrink-0 items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Places</h1>
          <p className="text-sm text-muted-foreground">Depots, delivery hubs and pickup locations.</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Add Place
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Places"  value={loading ? "…" : places.length}  icon={MapPin}    color="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400" />
        <StatCard label="Countries"     value={loading ? "…" : uniqueCountries} icon={Globe}     color="bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400" />
        <StatCard label="Mapped"        value={loading ? "…" : mapped}          icon={MapIcon}   color="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400" />
        <StatCard label="Showing"       value={loading ? "…" : filtered.length} icon={Building2} color="bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400" />
      </div>

      {/* ── Toolbar ── */}
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search places…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 sm:max-w-sm"
          />
        </div>

        {/* Country filter */}
        <select
          value={country}
          onChange={e => setCountry(e.target.value)}
          className="h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="All">All Countries</option>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* View toggle */}
        <div className="flex items-center gap-0.5 rounded-lg border bg-muted p-0.5">
          {(["split", "list", "map"] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium capitalize transition-colors ${view === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {v === "split" ? <><List className="h-3 w-3" /><MapIcon className="h-3 w-3" /></> : v === "list" ? <List className="h-3.5 w-3.5" /> : <MapIcon className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{v === "split" ? "Split" : v === "list" ? "List" : "Map"}</span>
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={load} title="Refresh" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-muted">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-muted">
            <Upload className="h-3.5 w-3.5" /> Import
          </button>
          <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-muted">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
        </div>
      </div>

      {/* ── Main content area ── */}
      {error ? (
        <div className="flex flex-1 items-center justify-center text-sm text-destructive">{error}</div>
      ) : (
        <div className={`flex flex-1 min-h-0 gap-4 ${view === "map" ? "" : ""}`}>

          {/* List panel — hidden in pure map view */}
          {view !== "map" && (
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden rounded-xl border bg-card shadow-sm">
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-sm">
                    <tr className="border-b">
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Code / Name</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Address</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">City</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Postal Code</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Country</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <Hash className="inline h-3 w-3 mb-0.5" /> ID
                      </th>
                      <th className="w-10 px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {loading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          {Array.from({ length: 7 }).map((_, j) => (
                            <td key={j} className="px-4 py-3">
                              <div className="h-3 rounded bg-muted" style={{ width: `${60 + (i * j * 7) % 40}%` }} />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : paged.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-16 text-center text-sm text-muted-foreground">
                          No places match your search.
                        </td>
                      </tr>
                    ) : paged.map(p => {
                      const isSel = p.uuid === selected
                      return (
                        <tr
                          key={p.uuid}
                          className={`transition-colors hover:bg-muted/30 cursor-pointer ${isSel ? "bg-indigo-50/60 dark:bg-indigo-900/10" : ""}`}
                          onClick={() => handleRowLocate(p.uuid)}
                        >
                          {/* Code/Name */}
                          <td className="whitespace-nowrap px-4 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white ${isSel ? "bg-indigo-600" : "bg-indigo-500"}`}>
                                <MapPin className="h-3.5 w-3.5" />
                              </span>
                              <div>
                                <p className="font-semibold leading-tight">{p.code ?? p.name}</p>
                                {p.code && p.name && p.code !== p.name && (
                                  <p className="text-[11px] text-muted-foreground leading-tight">{p.name}</p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Address */}
                          <td className="max-w-[220px] px-4 py-2.5">
                            <span className="line-clamp-1 text-muted-foreground text-xs">{p.address ?? "—"}</span>
                          </td>

                          {/* City */}
                          <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{p.city ?? "—"}</td>

                          {/* Postal code */}
                          <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs">{p.postal_code ?? "—"}</td>

                          {/* Country */}
                          <td className="whitespace-nowrap px-4 py-2.5">
                            {p.country ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
                                <Globe className="h-3 w-3 text-teal-500 shrink-0" />
                                {p.country}
                              </span>
                            ) : "—"}
                          </td>

                          {/* Public ID */}
                          <td className="whitespace-nowrap px-4 py-2.5">
                            <CopyBtn text={p.public_id} />
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-2.5">
                            <button
                              onClick={e => { e.stopPropagation(); handleRowLocate(p.uuid) }}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              title="Show on map"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination footer */}
              <div className="flex shrink-0 items-center justify-between border-t px-4 py-2.5">
                <span className="text-xs text-muted-foreground">
                  {loading ? "Loading…" : `${filtered.length} places · page ${safePage} of ${totalPages}`}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={safePage <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    disabled={safePage >= totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Map panel — hidden in pure list view */}
          {view !== "list" && (
            <div className={view === "map" ? "flex-1 min-h-0" : "w-[420px] shrink-0 min-h-0"}>
              <OSMMap
                places={filtered}
                selectedId={selected}
                onSelect={setSelected}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
