"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { TopBar } from "@/components/top-bar"
import { LangProvider } from "@/components/lang-context"
import { getToken } from "@/lib/ontrack-api"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [authed, setAuthed] = React.useState(false)

  React.useEffect(() => {
    if (!getToken()) {
      router.replace("/login")
    } else {
      setAuthed(true)
    }
  }, [router])

  // Don't render anything until we've confirmed the token exists
  if (!authed) return null

  return (
    <LangProvider>
      <div className="flex min-h-svh">
        <AppSidebar />
        <main className="flex flex-1 flex-col min-w-0">
          <TopBar />
          {children}
        </main>
      </div>
    </LangProvider>
  )
}
