"use client"
import * as React from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

type VehiclePin = {
  deviceId: string
  name: string
  lat: number
  lng: number
  speed: number
  heading: number
  status: "moving" | "idle" | "stopped"
}

// ─── Fix Leaflet's missing default icons in webpack/Next.js ──────────────────
const DefaultIcon = L.divIcon({
  html: `<div style="width:12px;height:12px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4);background:#3b82f6"></div>`,
  iconSize: [12, 12],
  className: "",
})

function vehicleIcon(pin: VehiclePin) {
  const bg = pin.status === "moving" ? "#22c55e" : pin.status === "idle" ? "#f59e0b" : "#6b7280"
  return L.divIcon({
    html: `
      <div style="
        position:relative;width:36px;height:36px;
        display:flex;align-items:center;justify-content:center;
        background:${bg};border-radius:50% 50% 50% 0;
        transform:rotate(-45deg) scale(1);
        border:2px solid white;
        box-shadow:0 2px 6px rgba(0,0,0,.35);
      ">
        <svg style="transform:rotate(45deg);fill:white;width:16px;height:16px;flex-shrink:0" viewBox="0 0 24 24">
          <path d="M1 3h15v13H1zm15 4 3 3v6h-3V7zM4 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0zm11 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0z"/>
        </svg>
      </div>
      <div style="
        position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);
        background:rgba(0,0,0,.75);color:white;padding:1px 5px;
        border-radius:4px;font-size:9px;font-family:monospace;white-space:nowrap;
      ">${pin.name}</div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -38],
    className: "",
  })
}

// Auto-fit bounds when pins change
function FitBounds({ pins }: { pins: VehiclePin[] }) {
  const map = useMap()
  React.useEffect(() => {
    if (!pins.length) return
    const bounds = L.latLngBounds(pins.map(p => [p.lat, p.lng]))
    map.fitBounds(bounds, { padding: [48, 48] })
  }, [pins, map])
  return null
}

export default function VehicleMap({ pins }: { pins: VehiclePin[] }) {
  const center: [number, number] = pins.length
    ? [pins.reduce((a, p) => a + p.lat, 0) / pins.length, pins.reduce((a, p) => a + p.lng, 0) / pins.length]
    : [52.489, -1.876]

  return (
    <MapContainer
      center={center}
      zoom={11}
      style={{ height: "100%", width: "100%", minHeight: 420 }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds pins={pins} />
      {pins.map(pin => (
        <Marker key={pin.deviceId} position={[pin.lat, pin.lng]} icon={vehicleIcon(pin)}>
          <Popup>
            <div className="min-w-[140px]">
              <p className="font-bold text-sm mb-1">{pin.name}</p>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={`h-2 w-2 rounded-full flex-shrink-0 ${
                  pin.status === "moving" ? "bg-green-500" :
                  pin.status === "idle"   ? "bg-amber-400" : "bg-gray-400"
                }`}/>
                <span className="capitalize text-xs text-foreground">{pin.status}</span>
              </div>
              <p className="text-xs text-foreground">Speed: <strong>{pin.speed} km/h</strong></p>
              <p className="text-xs text-foreground mt-1">
                {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
