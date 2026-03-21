"use client"
import * as React from "react"
import { useRouter } from "next/navigation"
import { login, getToken } from "@/lib/ontrack-api"
import { ShieldCheck, Loader2, AlertTriangle, Eye, EyeOff, LogIn } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPw, setShowPw]     = React.useState(false)
  const [loading, setLoading]   = React.useState(false)
  const [error, setError]       = React.useState<string | null>(null)

  // If already logged in, go straight to the dashboard
  React.useEffect(() => {
    if (getToken()) router.replace("/compliance")
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    setError(null)
    setLoading(true)
    try {
      await login({ identity: email, password, remember: false })
      router.push("/compliance")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 px-4">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute right-1/4 bottom-1/4 h-[400px] w-[400px] rounded-full bg-violet-600/8 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-white">FleetYes</h1>
            <p className="text-sm text-indigo-300/70">Compliance & Fleet Management</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl">
          <h2 className="mb-1 text-lg font-semibold text-white">Sign in</h2>
          <p className="mb-6 text-sm text-white/50">Enter your credentials to access the platform</p>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-xs font-medium text-white/60 uppercase tracking-wide">Email address</label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                autoFocus
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-xs font-medium text-white/60 uppercase tracking-wide">Password</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 pr-10 text-sm text-white placeholder:text-white/30 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="mt-2 flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {loading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</>
                : <><LogIn className="h-4 w-4" /> Sign In</>
              }
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-white/20">
          Powered by OnTrack · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
