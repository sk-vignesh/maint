"use client"

/**
 * DatePicker — consistent with app font, themed to match design system
 * ─────────────────────────────────────────────────────────────────────
 * • Trigger button styled exactly like other form inputs
 * • Popover calendar using react-day-picker v9
 * • Returns / accepts "YYYY-MM-DD" strings (ISO date, no time)
 * • Respects minDate / maxDate
 */

import * as React from "react"
import { DayPicker } from "react-day-picker"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import "react-day-picker/style.css"

// ─── Types ────────────────────────────────────────────────────────────────────

interface DatePickerProps {
  value:       string          // "YYYY-MM-DD" or ""
  onChange:    (v: string) => void
  placeholder?: string
  minDate?:    Date
  maxDate?:    Date
  disabled?:   boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseISO(s: string): Date | undefined {
  if (!s) return undefined
  const d = new Date(s + "T00:00:00")
  return isNaN(d.getTime()) ? undefined : d
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function fmt(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DatePicker({
  value, onChange, placeholder = "Pick a date",
  minDate, maxDate, disabled = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  // Close on outside click
  React.useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const selected = parseISO(value)

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(v => !v)}
        className={[
          "inline-flex h-8 w-full items-center gap-2 rounded-lg border bg-background px-3",
          "text-sm outline-none transition-all text-left",
          "hover:border-ring/60 focus:ring-2 focus:ring-ring",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          selected ? "text-foreground" : "text-muted-foreground",
        ].join(" ")}
      >
        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate">{selected ? fmt(selected) : placeholder}</span>
      </button>

      {/* Dropdown calendar */}
      {open && (
        <div className="absolute left-0 top-full z-[70] mt-1 rounded-xl border bg-background shadow-xl" style={{ minWidth: 280 }}>
          {/* Custom CSS for react-day-picker v9 — override its default styles */}
          <style>{`
            .rdp-root {
              --rdp-accent-color:          hsl(var(--primary));
              --rdp-accent-background-color: hsl(var(--primary));
              --rdp-day-height:            2rem;
              --rdp-day-width:             2rem;
              --rdp-day_button-height:     2rem;
              --rdp-day_button-width:      2rem;
              --rdp-day_button-border-radius: 0.5rem;
              --rdp-selected-border:       2px solid hsl(var(--primary));
              --rdp-outside-opacity:       0.35;
              --rdp-weeknumber-opacity:    0.35;
              --rdp-disabled-opacity:      0.25;
              --rdp-today-color:           hsl(var(--primary));
              background:                  transparent;
              font-family:                 var(--font-sans, 'Inter', 'Montserrat', system-ui, sans-serif);
              font-size:                   0.8125rem;
              padding: 0.75rem;
            }
            .rdp-root .rdp-month_caption {
              justify-content: space-between;
              padding-bottom: 0.5rem;
              font-weight: 600;
              font-size: 0.8125rem;
              color: hsl(var(--foreground));
            }
            .rdp-root .rdp-nav {
              gap: 0.25rem;
            }
            .rdp-root .rdp-button_previous,
            .rdp-root .rdp-button_next {
              border-radius: 0.5rem;
              border: 1px solid hsl(var(--border));
              background: hsl(var(--background));
              width: 1.75rem;
              height: 1.75rem;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              color: hsl(var(--muted-foreground));
            }
            .rdp-root .rdp-button_previous:hover,
            .rdp-root .rdp-button_next:hover {
              background: hsl(var(--muted));
              color: hsl(var(--foreground));
            }
            .rdp-root .rdp-weekday {
              font-size: 0.7rem;
              font-weight: 600;
              color: hsl(var(--muted-foreground));
              text-transform: uppercase;
              letter-spacing: 0.04em;
            }
            .rdp-root .rdp-day_button {
              font-size: 0.8125rem;
              font-family: inherit;
              color: hsl(var(--foreground));
              cursor: pointer;
              border-radius: 0.5rem;
              border: none;
              background: transparent;
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .rdp-root .rdp-day_button:hover {
              background: hsl(var(--muted));
            }
            .rdp-root .rdp-selected .rdp-day_button {
              background: hsl(var(--primary));
              color: hsl(var(--primary-foreground));
              font-weight: 600;
            }
            .rdp-root .rdp-today:not(.rdp-selected) .rdp-day_button {
              color: hsl(var(--primary));
              font-weight: 700;
            }
            .rdp-root .rdp-outside .rdp-day_button {
              color: hsl(var(--muted-foreground));
              opacity: 0.4;
            }
            .rdp-root .rdp-disabled .rdp-day_button {
              opacity: 0.25;
              cursor: not-allowed;
            }
          `}</style>

          <DayPicker
            mode="single"
            selected={selected}
            onSelect={(d) => {
              if (d) { onChange(toISO(d)); setOpen(false) }
            }}
            defaultMonth={selected ?? new Date()}
            disabled={[
              ...(minDate ? [{ before: minDate }] : []),
              ...(maxDate ? [{ after:  maxDate }] : []),
            ]}
            components={{
              Chevron: ({ orientation }) =>
                orientation === "left"
                  ? <ChevronLeft  className="h-3.5 w-3.5" />
                  : <ChevronRight className="h-3.5 w-3.5" />,
            }}
          />

          {/* Clear */}
          {value && (
            <div className="border-t px-3 pb-2.5 pt-2">
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false) }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              >
                Clear date
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
