"use client"
import { useLang } from "@/components/lang-context"
import type { Translations } from "@/components/lang-context"

type PageKey = keyof Translations["pages"]

interface PageHeaderProps {
  pageKey: PageKey
  hideSubtitle?: boolean
  children?: React.ReactNode
}

/**
 * Renders the standard page <h1> + subtitle, fully translated.
 * Usage: <PageHeader pageKey="calendar" />
 */
export function PageHeader({ pageKey, hideSubtitle, children }: PageHeaderProps) {
  const { t } = useLang()
  const page = t.pages[pageKey]
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{page.title}</h1>
        {!hideSubtitle && <p className="mt-1 text-sm text-muted-foreground">{page.subtitle}</p>}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  )
}
