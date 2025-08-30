"use client"

import { useEffect, useMemo, useState } from 'react'
import type { Provider } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Sparkles, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Separator } from '../../components/ui/separator'
import { getSupabaseClient } from '../../lib/supabase.client'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Alert, AlertDescription } from '../../components/ui/alert'

export default function SignupPage() {
  const router = useRouter()
  const [next, setNext] = useState<string>('/')
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search)
      setNext(sp.get('next') || '/')
    }
  }, [])

  // Dark mode handled globally by ThemeProvider
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'microsoft' | 'apple' | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [touchedPassword, setTouchedPassword] = useState(false)
  const [isValidEmail, setIsValidEmail] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const passwordChecks = useMemo(() => {
    const length = password.length >= 12
    const upper = /[A-Z]/.test(password)
    const lower = /[a-z]/.test(password)
    const digit = /[0-9]/.test(password)
    const symbol = /[^A-Za-z0-9]/.test(password)
    return { length, upper, lower, digit, symbol, all: length && upper && lower && digit && symbol }
  }, [password])

  // Email validation and handlers copied from login for consistency
  const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)
    setError(null)
    if (value) setIsValidEmail(validateEmail(value))
    else setIsValidEmail(true)
  }
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null); setMessage(null)
  if (!email || !password) { setError('Email and password required'); return }
  if (!passwordChecks.all) { setError('Password does not meet complexity requirements'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    try {
      // Use internal API for server-side policy + potential future instrumentation
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Signup failed'); return }
      if (json.message?.toLowerCase().includes('confirm')) { setMessage(json.message); return }
      router.replace(next)
    } catch (e: unknown) {
      const msg = (e && typeof e === 'object' && 'message' in e) ? (e as { message?: string }).message : undefined
      setError(msg || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  // OAuth signup/login (same flow via Supabase OAuth)
  const handleOAuth = async (provider: 'google' | 'microsoft' | 'apple') => {
    setOauthLoading(provider)
    setError(null)
    try {
      const client = getSupabaseClient()
      const providerMap: Record<'google' | 'microsoft' | 'apple', Provider> = {
        google: 'google',
        microsoft: 'azure',
        apple: 'apple',
      }
      const { error } = await client.auth.signInWithOAuth({
        provider: providerMap[provider],
        options: { redirectTo: `${window.location.origin}/auth/callback` }
      })
      if (error) setError(error.message || 'OAuth error')
    } catch {
      setError('OAuth error')
    } finally {
      setOauthLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#0D1117] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#1F6FEB] to-[#0969DA] rounded-lg flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#F0F6FC] tracking-tight">Create account</h1>
          </div>
          <p className="text-sm text-[#8B949E]">Start building your agents</p>
        </div>
  <div className="bg-[#21262D] rounded-xl border border-[#30363D] p-6 space-y-5">
          {/* OAuth Buttons (consistent with login) */}
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full h-10 gap-3 font-medium text-[#F0F6FC] bg-[#21262D] border-[#30363D] hover:bg-[#30363D] hover:border-[#1F6FEB] transition-all duration-200 hover-lift"
              onClick={() => handleOAuth('google')}
              disabled={loading || !!oauthLoading}
            >
              {oauthLoading === 'google' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Continue with Google
            </Button>

            <Button
              variant="outline"
              className="w-full h-10 gap-3 font-medium text-[#F0F6FC] bg-[#21262D] border-[#30363D] hover:bg-[#30363D] hover:border-[#1F6FEB] transition-all duration-200 hover-lift"
              onClick={() => handleOAuth('apple')}
              disabled={loading || !!oauthLoading}
            >
              {oauthLoading === 'apple' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
              )}
              Continue with Apple
            </Button>

            <Button
              variant="outline"
              className="w-full h-10 gap-3 font-medium text-[#F0F6FC] bg-[#21262D] border-[#30363D] hover:bg-[#30363D] hover:border-[#1F6FEB] transition-all duration-200 hover-lift"
              onClick={() => handleOAuth('microsoft')}
              disabled={loading || !!oauthLoading}
            >
              {oauthLoading === 'microsoft' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#F25022" d="M1 1h10v10H1z"/>
                  <path fill="#00A4EF" d="M13 1h10v10H13z"/>
                  <path fill="#7FBA00" d="M1 13h10v10H1z"/>
                  <path fill="#FFB900" d="M13 13h10v10H13z"/>
                </svg>
              )}
              Continue with Microsoft
            </Button>
          </div>

          <div className="relative my-4">
            <Separator />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-[#21262D] px-3 text-sm font-medium text-[#8B949E]">OR</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {(error || message) && (
              <Alert variant={error ? 'destructive' : 'default'}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error || message}</AlertDescription>
              </Alert>
            )}

            {/* Email (match login) */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#F0F6FC] text-sm font-semibold">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#8B949E]" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={handleEmailChange}
                  className={`pl-10 h-10 bg-[#0D1117] border-[#30363D] text-[#F0F6FC] placeholder-[#6E7681] focus:border-[#1F6FEB] focus:ring-[#1F6FEB] rounded-lg transition-all duration-200 ${!isValidEmail && email ? 'border-[#F85149] focus:border-[#F85149] focus:ring-[#F85149]' : ''}`}
                  disabled={loading || !!oauthLoading}
                  required
                />
              </div>
              {!isValidEmail && email && (
                <p className="text-xs text-[#F85149] font-medium">Please enter a valid email address</p>
              )}
            </div>

            {/* Password (match login incl. toggle) */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#F0F6FC] text-sm font-semibold">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#8B949E]" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={handlePasswordChange}
                  onBlur={() => setTouchedPassword(true)}
                  className="pl-10 pr-10 h-10 bg-[#0D1117] border-[#30363D] text-[#F0F6FC] placeholder-[#6E7681] focus:border-[#1F6FEB] focus:ring-[#1F6FEB] rounded-lg transition-all duration-200"
                  disabled={loading || !!oauthLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#8B949E] hover:text-[#F0F6FC] transition-colors duration-200 p-1"
                  disabled={loading || !!oauthLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Optional: keep minimal guidance under password */}
            {(touchedPassword || password.length>0) && (
              <ul id="pw-help" className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] tracking-tight text-[#8B949E]">
                <PasswordRule ok={passwordChecks.length} label="≥ 12 chars" />
                <PasswordRule ok={passwordChecks.upper} label="Uppercase" />
                <PasswordRule ok={passwordChecks.lower} label="Lowercase" />
                <PasswordRule ok={passwordChecks.digit} label="Digit" />
                <PasswordRule ok={passwordChecks.symbol} label="Symbol" />
              </ul>
            )}
            {/* Confirm password (match password field styling) */}
            <div className="space-y-2">
              <Label htmlFor="confirm" className="text-[#F0F6FC] text-sm font-semibold">Confirm password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#8B949E]" />
                <Input
                  id="confirm"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="pl-10 pr-10 h-10 bg-[#0D1117] border-[#30363D] text-[#F0F6FC] placeholder-[#6E7681] focus:border-[#1F6FEB] focus:ring-[#1F6FEB] rounded-lg transition-all duration-200"
                  disabled={loading || !!oauthLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#8B949E] hover:text-[#F0F6FC] transition-colors duration-200 p-1"
                  disabled={loading || !!oauthLoading}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          <Button
            type="submit"
            className="w-full h-10 bg-[#1F6FEB] hover:bg-[#0969DA] text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover-lift"
            disabled={loading || !!oauthLoading || !email || !password || !isValidEmail}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Creating account...
              </>
            ) : (
              'Create account'
            )}
          </Button>
          <p className="text-xs text-center text-[#8B949E]">Already have an account? <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-[#1F6FEB] hover:text-[#0969DA] font-medium">Sign in</Link></p>
          </form>
        </div>
      </div>
    </div>
  )
}

function PasswordRule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-1 ${ok ? 'text-green-400' : ''}`}> 
      <span className={`inline-block w-2 h-2 rounded-full ${ok ? 'bg-green-500' : 'bg-[#30363D]'}`} aria-hidden />
      <span>{label}</span>
    </li>
  )
}
