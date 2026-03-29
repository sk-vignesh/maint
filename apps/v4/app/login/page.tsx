"use client"
import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { login, getToken } from "@/lib/ontrack-api"
import { Loader2, AlertTriangle, Eye, EyeOff, LogIn, Mail, CheckCircle2 } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()

  // ── Form state ──────────────────────────────────────────────────────────────
  const [email, setEmail]         = React.useState("")
  const [password, setPassword]   = React.useState("")
  const [showPw, setShowPw]       = React.useState(false)
  const [remember, setRemember]   = React.useState(false)
  const [loading, setLoading]     = React.useState(false)
  const [error, setError]         = React.useState<string | null>(null)

  // ── Forgot password state ────────────────────────────────────────────────────
  const [mode, setMode]                 = React.useState<"login" | "forgot">("login")
  const [forgotEmail, setForgotEmail]   = React.useState("")
  const [forgotSent, setForgotSent]     = React.useState(false)
  const [forgotLoading, setForgotLoading] = React.useState(false)

  // Redirect if already logged in
  React.useEffect(() => {
    if (getToken()) router.replace("/")
  }, [router])

  // Pre-fill forgot email from login email
  React.useEffect(() => {
    if (mode === "forgot" && email) setForgotEmail(email)
  }, [mode, email])

  // ── Handlers ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    setError(null)
    setLoading(true)
    try {
      await login({ identity: email, password, remember })
      router.push("/")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed. Check your credentials and try again.")
    } finally {
      setLoading(false)
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    // Simulate sending reset email (real endpoint can be wired here)
    setForgotLoading(true)
    await new Promise(r => setTimeout(r, 1200))
    setForgotLoading(false)
    setForgotSent(true)
  }

  // ── Shared input class ───────────────────────────────────────────────────────
  const inputCls = "h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-[#496453] focus:ring-2 focus:ring-[#496453]/20 transition-colors"

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted px-4 overflow-hidden">
      {/* Ambient glow — adapts to theme */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-[#496453]/8 dark:bg-[#496453]/12 blur-[120px]" />
        <div className="absolute right-1/4 bottom-1/4 h-[300px] w-[300px] rounded-full bg-[#496453]/5 dark:bg-[#496453]/8 blur-[80px]" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo + Brand */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl overflow-hidden border border-border shadow-lg shadow-[#496453]/10 bg-white">
            <Image
              src="/logo.svg"
              alt="FleetYes"
              width={64}
              height={64}
              className="h-14 w-14 object-contain"
              priority
            />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">FleetYes</h1>
            <p className="text-sm text-muted-foreground">Compliance &amp; Fleet Management</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-8 shadow-xl shadow-black/5 dark:shadow-black/20">
          {/* ── Login form ─────────────────────────────────────────────────── */}
          {mode === "login" && (
            <>
              <h2 className="mb-1 text-lg font-semibold text-foreground">Sign in</h2>
              <p className="mb-6 text-sm text-muted-foreground">Enter your credentials to access the platform</p>

              {error && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Email */}
                <div>
                  <label htmlFor="login-email" className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Email address
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className={inputCls}
                  />
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="login-password" className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPw ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={inputCls + " pr-10"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember me + Forgot password */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none group">
                    <div className="relative flex h-4 w-4 shrink-0">
                      <input
                        type="checkbox"
                        id="remember-me"
                        checked={remember}
                        onChange={e => setRemember(e.target.checked)}
                        className="h-4 w-4 cursor-pointer rounded border border-border bg-background accent-[#496453] focus:ring-2 focus:ring-[#496453]/30"
                      />
                    </div>
                    <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                      Remember me
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => { setMode("forgot"); setError(null) }}
                    className="text-xs text-[#496453] hover:text-[#496453]/80 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || !email || !password}
                  className="mt-1 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#496453] text-sm font-semibold text-white shadow-md shadow-[#496453]/20 hover:bg-[#3a5244] disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                >
                  {loading
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</>
                    : <><LogIn className="h-4 w-4" /> Sign In</>
                  }
                </button>
              </form>
            </>
          )}

          {/* ── Forgot password ──────────────────────────────────────────────── */}
          {mode === "forgot" && !forgotSent && (
            <>
              <button
                onClick={() => setMode("login")}
                className="mb-4 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                ← Back to sign in
              </button>
              <h2 className="mb-1 text-lg font-semibold text-foreground">Reset password</h2>
              <p className="mb-6 text-sm text-muted-foreground">
                Enter your account email and we&apos;ll send you a reset link.
              </p>
              <form onSubmit={handleForgot} className="flex flex-col gap-4">
                <div>
                  <label htmlFor="forgot-email" className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Email address
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    required
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="you@company.com"
                    className={inputCls}
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading || !forgotEmail}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#496453] text-sm font-semibold text-white shadow-md shadow-[#496453]/20 hover:bg-[#3a5244] disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                >
                  {forgotLoading
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
                    : <><Mail className="h-4 w-4" /> Send reset link</>
                  }
                </button>
              </form>
            </>
          )}

          {/* ── Reset sent confirmation ──────────────────────────────────────── */}
          {mode === "forgot" && forgotSent && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <CheckCircle2 className="h-12 w-12 text-[#496453]" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">Check your inbox</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  If <strong>{forgotEmail}</strong> is registered, you&apos;ll receive a reset link shortly.
                </p>
              </div>
              <button
                onClick={() => { setMode("login"); setForgotSent(false) }}
                className="text-sm text-[#496453] font-medium hover:underline dark:text-emerald-400"
              >
                Back to sign in
              </button>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground/40">
          Powered by OnTrack · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
