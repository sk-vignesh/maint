"use client"

import * as React from "react"
import {
  Search, RefreshCw, Plus, Upload, Download,
  MoreHorizontal, Map as MapIcon, List, MapPin,
  Globe, Copy, Check, ChevronLeft, ChevronRight,
} from "lucide-react"
import { listPlaces, type Place } from "@/lib/places-api"

// ─── Coordinate extraction ────────────────────────────────────────────────────
// Fleetbase returns either:
//   location: { type: "Point", coordinates: [lng, lat] }  ← GeoJSON order
//   OR top-level latitude / longitude fields

function extractCoords(p: Place): [number, number] | null {
  // GeoJSON location object
  if (p.location?.coordinates && p.location.coordinates.length === 2) {
    const [lng, lat] = p.location.coordinates
    if (lat && lng) return [lat, lng]
  }
  // Top-level fields
  if (p.latitude != null && p.longitude != null) {
    return [p.latitude, p.longitude]
  }
  // UK postcode region fallback
  return postcodeToLatLng(p.postal_code)
}

// ─── UK postcode prefix → approximate region ──────────────────────────────────
const UK_POSTCODE: Record<string, [number, number]> = {
  AB: [57.15, -2.11], AL: [51.75, -0.34], B: [52.48, -1.89], BA: [51.38, -2.36],
  BB: [53.75, -2.49], BD: [53.79, -1.75], BH: [50.72, -1.90], BL: [53.57, -2.42],
  BN: [50.83, -0.14], BR: [51.40, 0.02], BS: [51.45, -2.60], CA: [54.90, -2.94],
  CB: [52.20, 0.12], CF: [51.48, -3.18], CH: [53.20, -2.89], CM: [51.74, 0.47],
  CO: [51.89, 0.90], CR: [51.37, -0.10], CV: [52.41, -1.51], CW: [53.09, -2.44],
  DA: [51.44, 0.22], DD: [56.46, -2.97], DE: [52.92, -1.48], DG: [55.07, -3.61],
  DH: [54.78, -1.56], DL: [54.52, -1.55], DN: [53.52, -1.13], DT: [50.71, -2.44],
  DY: [52.51, -2.09], E: [51.52, -0.02], EC: [51.52, -0.10], EH: [55.95, -3.19],
  EN: [51.65, -0.08], EX: [50.72, -3.53], FK: [56.01, -3.78], FY: [53.82, -3.05],
  G: [55.86, -4.25], GL: [51.86, -2.24], GU: [51.24, -0.57], HA: [51.58, -0.33],
  HD: [53.65, -1.78], HG: [53.99, -1.54], HP: [51.75, -0.74], HR: [52.06, -2.72],
  HU: [53.74, -0.33], HX: [53.72, -1.86], IG: [51.55, 0.08], IP: [52.06, 1.16],
  IV: [57.48, -4.23], KA: [55.61, -4.50], KT: [51.39, -0.31], KW: [58.44, -3.10],
  KY: [56.17, -3.15], L: [53.41, -2.99], LA: [54.05, -2.80], LD: [52.24, -3.38],
  LE: [52.64, -1.13], LL: [53.20, -4.08], LN: [53.23, -0.54], LS: [53.80, -1.55],
  LU: [51.88, -0.42], M: [53.48, -2.24], ME: [51.40, 0.52], MK: [52.04, -0.76],
  ML: [55.78, -3.98], N: [51.56, -0.11], NE: [54.97, -1.61], NG: [52.96, -1.17],
  NN: [52.24, -0.90], NP: [51.59, -2.99], NR: [52.63, 1.30], NW: [51.55, -0.18],
  OL: [53.54, -2.11], OX: [51.75, -1.26], PA: [55.84, -4.43], PE: [52.57, -0.24],
  PH: [56.40, -3.47], PL: [50.37, -4.14], PO: [50.80, -1.09], PR: [53.76, -2.70],
  RG: [51.45, -1.00], RH: [51.24, -0.20], RM: [51.55, 0.19], S: [53.38, -1.47],
  SA: [51.62, -3.94], SE: [51.48, -0.09], SG: [51.91, -0.23], SK: [53.41, -2.16],
  SL: [51.51, -0.60], SM: [51.38, -0.19], SN: [51.55, -1.78], SO: [50.90, -1.40],
  SP: [51.07, -1.80], SR: [54.90, -1.38], SS: [51.54, 0.70], ST: [52.99, -2.11],
  SW: [51.47, -0.15], SY: [52.71, -2.76], TA: [51.02, -3.10], TD: [55.60, -2.43],
  TF: [52.70, -2.44], TN: [51.10, 0.27], TQ: [50.46, -3.53], TR: [50.26, -5.05],
  TS: [54.57, -1.24], TW: [51.45, -0.33], UB: [51.53, -0.48], W: [51.51, -0.21],
  WA: [53.39, -2.59], WC: [51.52, -0.12], WD: [51.65, -0.40], WF: [53.68, -1.50],
  WN: [53.54, -2.63], WR: [52.19, -2.22], WS: [52.58, -1.98], WV: [52.59, -2.13],
  YO: [53.96, -1.09], ZE: [60.15, -1.15],
}

function postcodeToLatLng(postcode?: string): [number, number] | null {
  if (!postcode) return null
  const clean = postcode.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 2)
  return UK_POSTCODE[clean] ?? UK_POSTCODE[clean[0]] ?? null
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false)
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
      title="Copy ID"
    >
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      {text}
    </button>
  )
}

// ─── Place with resolved coords ───────────────────────────────────────────────

type PlaceEx = Place & { _lat?: number; _lng?: number }

// ─── Leaflet iframe map ────────────────────────────────────────────────────────

function OSMMap({ places, selectedId, onSelect }: {
  places: PlaceEx[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null)

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ""

  const buildHtml = (ps: PlaceEx[], selId: string | null) => {
    const mappable = ps.filter(p => p._lat != null && p._lng != null)

    const markersJs = mappable.map(p => {
      const isSel = p.uuid === selId
      const color = isSel ? "#4338ca" : "#6366f1"
      const shadow = isSel ? "rgba(67,56,202,0.35)" : "rgba(99,102,241,0.2)"
      const size = isSel ? 34 : 26
      const anchor = size / 2
      const label = (p.code ?? p.name ?? p.public_id).replace(/'/g, "\\'").substring(0, 24)
      const pc = (p.postal_code ?? "").replace(/'/g, "\\'")
      const addr = (p.address ?? "").replace(/'/g, "\\'").substring(0, 70)
      const iconSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${Math.round(size * 1.35)}' viewBox='0 0 30 40'><defs><filter id='s'><feDropShadow dx='0' dy='2' stdDeviation='2' flood-color='${shadow}'/></filter></defs><path d='M15 0 C7 0 1 6 1 14 C1 22 15 40 15 40 C15 40 29 22 29 14 C29 6 23 0 15 0Z' fill='${color}' filter='url(%23s)' stroke='white' stroke-width='2'/><circle cx='15' cy='14' r='5.5' fill='white'/></svg>`
      const tipHeight = Math.round(size * 1.35)
      return `
        (function(){
          var icon=L.icon({iconUrl:"data:image/svg+xml;charset=utf-8,${encodeURIComponent(iconSvg)}",iconSize:[${size},${tipHeight}],iconAnchor:[${anchor},${tipHeight}],popupAnchor:[0,-${tipHeight}]});
          var m=L.marker([${p._lat},${p._lng}],{icon:icon,zIndexOffset:${isSel ? 1000 : 0}}).addTo(map);
          m.bindPopup('<div style="font-family:system-ui;min-width:160px"><strong style="font-size:13px;display:block;margin-bottom:2px">${label}</strong><span style="font-size:11px;color:#6b7280;display:block">${pc}</span><span style="font-size:10px;color:#9ca3af;line-height:1.4;display:block;margin-top:3px">${addr}</span></div>',{maxWidth:220});
          m.on('click',function(){window.parent.postMessage({type:'place-click',id:'${p.uuid}'},'*');m.openPopup();});
          ${isSel ? "m.openPopup();" : ""}
          markers['${p.uuid}']=m;
        })();`
    }).join("\n")

    const sel = selId ? mappable.find(p => p.uuid === selId) : null
    const cLat = sel?._lat ?? 52.5
    const cLng = sel?._lng ?? -1.7
    const zoom = sel ? 12 : 6

    return `<!DOCTYPE html><html><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>*{margin:0;padding:0;box-sizing:border-box}html,body,#map{width:100%;height:100%}
.leaflet-popup-content-wrapper{border-radius:10px;box-shadow:0 4px 24px rgba(0,0,0,.13);border:1px solid #e5e7eb}
.leaflet-popup-content{margin:10px 12px}.leaflet-popup-tip{background:#fff}
</style></head>
<body><div id="map"></div><script>
var map=L.map('map',{zoomControl:true,attributionControl:true}).setView([${cLat},${cLng}],${zoom});
L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles/256/{z}/{x}/{y}@2x?access_token=${mapboxToken}',{maxZoom:22,tileSize:256,attribution:'\u00a9 <a href="https://www.mapbox.com/about/maps/">Mapbox</a> \u00a9 <a href="https://www.openstreetmap.org/copyright">OSM</a>'}).addTo(map);
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
    // srcdoc keeps the parent origin so Mapbox token requests include proper Referer
    iframe.srcdoc = newHtml
  })

  React.useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "place-click")
        onSelect(e.data.id === selectedId ? null : e.data.id)
    }
    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [selectedId, onSelect])

  const mappableCount = places.filter(p => p._lat != null).length

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border bg-card">
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-indigo-500" />
          <span className="text-sm font-semibold">Depot Map</span>
        </div>
        <span className="text-xs text-muted-foreground">{mappableCount} plotted</span>
      </div>
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

// ─── Page ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25

export default function PlacesPage() {
  const [places, setPlaces] = React.useState<PlaceEx[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState("")
  const [view, setView] = React.useState<"split" | "list" | "map">("split")
  const [selected, setSelected] = React.useState<string | null>(null)
  const [page, setPage] = React.useState(1)
  const [searchFocused, setSearchFocused] = React.useState(false)

  // ── Fetch ──
  const load = React.useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await listPlaces({ limit: 500 })
      const enriched: PlaceEx[] = (res.places ?? []).map(p => {
        const coords = extractCoords(p)
        return { ...p, _lat: coords?.[0] ?? undefined, _lng: coords?.[1] ?? undefined }
      })
      setPlaces(enriched)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load places")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  // ── Filter ──
  const filtered = React.useMemo(() => {
    const q = search.toLowerCase()
    return places.filter(p =>
      !q ||
      (p.name ?? "").toLowerCase().includes(q) ||
      (p.code ?? "").toLowerCase().includes(q) ||
      (p.address ?? "").toLowerCase().includes(q) ||
      (p.postal_code ?? "").toLowerCase().includes(q) ||
      (p.city ?? "").toLowerCase().includes(q) ||
      (p.public_id ?? "").toLowerCase().includes(q)
    )
  }, [places, search])

  // ── Pagination ──
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  React.useEffect(() => setPage(1), [search])

  const handleRowLocate = (uuid: string) => {
    setSelected(prev => prev === uuid ? null : uuid)
    if (view === "list") setView("split")
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden px-6 pt-3 pb-2 md:px-8 lg:px-10">

      {/* ── Toolbar — mirrors Trips page exactly ── */}
      <div className="flex items-center gap-2">

        {/* LEFT: View tabs */}
        <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-0.5">
          {(["split", "list", "map"] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${view === v ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
            >
              {v === "split" ? (
                <span className="flex items-center gap-1"><List className="h-3 w-3" /><MapIcon className="h-3 w-3" /></span>
              ) : v === "list" ? "List" : "Map"}
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search — expands on focus */}
        <div className={`relative transition-all duration-200 ${searchFocused ? "w-72" : "w-40"}`}>
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="h-8 w-full rounded-lg border bg-background pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Separator */}
        <span className="h-6 w-px bg-border" />

        {/* Utility icon buttons */}
        <button
          onClick={load}
          disabled={loading}
          title="Refresh"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
        <button
          title="Import CSV"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Upload className="h-3.5 w-3.5" />
        </button>
        <button
          title="Export CSV"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Download className="h-3.5 w-3.5" />
        </button>

        {/* Separator */}
        <span className="h-6 w-px bg-border" />

        {/* Primary CTA */}
        <button className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
          <Plus className="h-3.5 w-3.5" /> New Place
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error} — <button onClick={load} className="underline">retry</button>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="flex flex-1 min-h-0 gap-4">

        {/* List panel */}
        {view !== "map" && (
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-sm">
                  <tr className="border-b">
                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Code / Name</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Address</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">City</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Postal Code</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Country</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">ID</th>
                    <th className="w-10 px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-3 rounded bg-muted" style={{ width: `${50 + (i * 13 + j * 17) % 45}%` }} />
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
                        onClick={() => handleRowLocate(p.uuid)}
                        className={`cursor-pointer transition-colors hover:bg-muted/30 ${isSel ? "bg-indigo-50/60 dark:bg-indigo-900/10" : ""}`}
                      >
                        {/* Code / Name */}
                        <td className="whitespace-nowrap px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white ${isSel ? "bg-indigo-600" : "bg-indigo-500"}`}>
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

                        <td className="max-w-[200px] px-4 py-2.5">
                          <span className="line-clamp-1 text-xs text-muted-foreground">{p.address ?? "—"}</span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{p.city ?? "—"}</td>

                        <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs">{p.postal_code ?? "—"}</td>

                        <td className="whitespace-nowrap px-4 py-2.5">
                          {p.country ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
                              <Globe className="h-3 w-3 text-teal-500 shrink-0" />
                              {p.country}
                            </span>
                          ) : "—"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-2.5">
                          <CopyBtn text={p.public_id} />
                        </td>

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

            {/* Footer / pagination */}
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

        {/* Map panel */}
        {view !== "list" && (
          <div className={`${view === "map" ? "flex-1" : "w-[400px] shrink-0"} min-h-0`}>
            <OSMMap
              places={filtered}
              selectedId={selected}
              onSelect={setSelected}
            />
          </div>
        )}
      </div>
    </div>
  )
}
