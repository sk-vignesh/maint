"use client"

/**
 * ClockTimePicker — 12-hour with AM/PM
 * ─────────────────────────────────────
 * • Single-ring hour face (1–12) + 5-min minute face
 * • AM / PM pill toggle in the header
 * • Auto-advances hour → minute on selection
 * • Internally stores 12h + ampm; emits "HH:MM" in 24h for API compatibility
 * • value / onChange use "HH:MM" 24h strings
 */

import * as React from "react"
import { Clock } from "lucide-react"

// ─── Geometry ──────────────────────────────────────────────────────────────────

const SIZE    = 256
const CX      = SIZE / 2
const CY      = SIZE / 2
const RING_R  = 98    // single ring radius
const BUBBLE_R = 20
const FONT    = "'Inter', 'Montserrat', system-ui, sans-serif"

function polar(angleRad: number, r: number) {
  return { x: CX + r * Math.cos(angleRad), y: CY + r * Math.sin(angleRad) }
}

function idxToAngle(idx: number, total = 12) {
  return (idx / total) * 2 * Math.PI - Math.PI / 2
}

function coordToNorm(dx: number, dy: number) {
  const raw = Math.atan2(dy, dx) + Math.PI / 2
  return ((raw % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
}

// ─── Hours / minutes ──────────────────────────────────────────────────────────

const HOURS12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]    // clock positions 0–11
const MINUTES  = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

// ─── 12h ↔ 24h helpers ───────────────────────────────────────────────────────

function to24(h12: number, ampm: "AM" | "PM"): number {
  if (ampm === "AM") return h12 === 12 ? 0  : h12
  else               return h12 === 12 ? 12 : h12 + 12
}

function from24(h24: number): { h12: number; ampm: "AM" | "PM" } {
  if (h24 === 0)  return { h12: 12, ampm: "AM" }
  if (h24 < 12)   return { h12: h24,      ampm: "AM" }
  if (h24 === 12) return { h12: 12,       ampm: "PM" }
  return              { h12: h24 - 12, ampm: "PM" }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  value:    string                 // "HH:MM" 24h, or ""
  onChange: (v: string) => void
  disabled?: boolean
}

export function ClockTimePicker({ value, onChange, disabled = false }: Props) {
  const [open,   setOpen]   = React.useState(false)
  const [mode,   setMode]   = React.useState<"hour" | "minute">("hour")
  const [hour12, setHour12] = React.useState(8)
  const [ampm,   setAmpm]   = React.useState<"AM" | "PM">("AM")
  const [minute, setMinute] = React.useState(0)
  const svgRef = React.useRef<SVGSVGElement>(null)

  // ── Populate from prop when opening ──
  React.useEffect(() => {
    if (!open) return
    if (value) {
      const [h, m] = value.split(":").map(Number)
      const parsed = from24(isNaN(h) ? 8 : Math.max(0, Math.min(23, h)))
      setHour12(parsed.h12)
      setAmpm(parsed.ampm)
      setMinute(isNaN(m) ? 0 : Math.round(m / 5) * 5 % 60)
    } else {
      setHour12(8); setAmpm("AM"); setMinute(0)
    }
    setMode("hour")
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── SVG interaction ──
  const getCursor = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = svgRef.current!.getBoundingClientRect()
    const src  = "touches" in e ? e.touches[0] : (e as React.MouseEvent)
    const dx   = src.clientX - rect.left - CX
    const dy   = src.clientY - rect.top  - CY
    return { dx, dy }
  }

  const pick = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const { dx, dy } = getCursor(e)
    const norm = coordToNorm(dx, dy)
    const idx  = Math.round(norm / (2 * Math.PI) * 12) % 12   // 0–11, clockwise from top

    if (mode === "hour") {
      setHour12(HOURS12[idx])
      setTimeout(() => setMode("minute"), 160)
    } else {
      setMinute(idx * 5)
    }
  }

  // ── Hand position ──
  const handTarget = () => {
    if (mode === "hour") {
      const idx = HOURS12.indexOf(hour12)
      return polar(idxToAngle(idx < 0 ? 0 : idx), RING_R)
    } else {
      return polar(idxToAngle((minute / 5) % 12), RING_R)
    }
  }
  const hand = handTarget()

  // ── Display values ──
  const dH = String(hour12).padStart(2, "0")
  const dM = String(minute).padStart(2, "0")
  const displayLabel = value
    ? `${dH}:${dM} ${ampm}`
    : "--:-- --"

  const confirm = () => {
    const h24 = to24(hour12, ampm)
    onChange(`${String(h24).padStart(2, "0")}:${dM}`)
    setOpen(false)
  }

  return (
    <>
      {/* ── Trigger ── */}
      <button
        type="button"
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
        className={[
          "inline-flex h-8 items-center gap-1.5 rounded-lg border bg-background px-2.5",
          "text-sm outline-none transition-all",
          "hover:border-ring/60 hover:bg-muted/30 focus:ring-1 focus:ring-ring",
          "disabled:opacity-30 disabled:cursor-not-allowed",
          value ? "text-foreground" : "text-muted-foreground",
        ].join(" ")}
      >
        <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
        <span className="font-mono tabular-nums tracking-tight text-xs">{displayLabel}</span>
      </button>

      {/* ── Modal ── */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          <div className="fixed left-1/2 top-1/2 z-[100] -translate-x-1/2 -translate-y-1/2
                          w-72 overflow-hidden rounded-3xl border border-border bg-background shadow-2xl">

            {/* ── Header ── */}
            <div className="bg-primary/8 dark:bg-primary/15 px-6 pt-5 pb-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                {mode === "hour" ? "Select hour" : "Select minute"}
              </p>

              <div className="flex items-end gap-3">
                {/* HH : MM display */}
                <div className="flex items-end gap-0.5">
                  <button
                    onClick={() => setMode("hour")}
                    className={`text-5xl font-bold tabular-nums leading-none transition-colors ${
                      mode === "hour"
                        ? "text-primary"
                        : "text-foreground/30 hover:text-foreground/60"
                    }`}
                  >
                    {dH}
                  </button>
                  <span className="mb-0.5 text-4xl font-bold text-foreground/20 select-none">:</span>
                  <button
                    onClick={() => setMode("minute")}
                    className={`text-5xl font-bold tabular-nums leading-none transition-colors ${
                      mode === "minute"
                        ? "text-primary"
                        : "text-foreground/30 hover:text-foreground/60"
                    }`}
                  >
                    {dM}
                  </button>
                </div>

                {/* AM / PM pill */}
                <div className="mb-1 flex flex-col gap-0.5">
                  {(["AM", "PM"] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setAmpm(p)}
                      className={`h-7 w-12 rounded-lg border text-xs font-bold transition-all ${
                        ampm === p
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border hover:bg-muted"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Clock face ── */}
            <div className="flex justify-center bg-muted/20 py-3">
              <svg
                ref={svgRef}
                width={SIZE}
                height={SIZE}
                onClick={pick}
                onTouchStart={pick}
                style={{ touchAction: "none", cursor: "pointer", userSelect: "none" }}
              >
                {/* Track */}
                <circle
                  cx={CX} cy={CY} r={RING_R + 22}
                  fill="var(--color-card, white)"
                  stroke="var(--color-border)"
                  strokeWidth={1}
                />

                {/* Hand */}
                <line
                  x1={CX} y1={CY} x2={hand.x} y2={hand.y}
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  strokeLinecap="round"
                />

                {/* Centre dot */}
                <circle cx={CX} cy={CY} r={4} fill="var(--color-primary)" />

                {/* Selection bubble */}
                <circle cx={hand.x} cy={hand.y} r={BUBBLE_R} fill="var(--color-primary)" />

                {/* Hour numbers */}
                {mode === "hour" && HOURS12.map((h, i) => {
                  const p   = polar(idxToAngle(i), RING_R)
                  const sel = hour12 === h
                  return (
                    <text key={h} x={p.x} y={p.y}
                      textAnchor="middle" dominantBaseline="central"
                      fontSize={13} fontWeight={sel ? 700 : 500}
                      fontFamily={FONT}
                      fill={sel ? "white" : "var(--color-foreground)"}>
                      {h}
                    </text>
                  )
                })}

                {/* Minute numbers */}
                {mode === "minute" && MINUTES.map((m, i) => {
                  const p   = polar(idxToAngle(i), RING_R)
                  const sel = minute === m
                  return (
                    <text key={m} x={p.x} y={p.y}
                      textAnchor="middle" dominantBaseline="central"
                      fontSize={13} fontWeight={sel ? 700 : 500}
                      fontFamily={FONT}
                      fill={sel ? "white" : "var(--color-foreground)"}>
                      {String(m).padStart(2, "0")}
                    </text>
                  )
                })}
              </svg>
            </div>

            {/* ── Footer ── */}
            <div className="flex items-center justify-between border-t px-5 py-3">
              <button
                onClick={() => { onChange(""); setOpen(false) }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setOpen(false)}
                  className="h-8 rounded-lg px-4 text-sm text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirm}
                  className="h-8 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
