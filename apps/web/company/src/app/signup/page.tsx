"use client"

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabaseClient } from '../../lib/supabase.client'
import Link from 'next/link'
import { Loader2, Sparkles } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const search = useSearchParams()
  const next = search.get('next') || '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [touchedPassword, setTouchedPassword] = useState(false)

  const passwordChecks = useMemo(() => {
    const length = password.length >= 12
    const upper = /[A-Z]/.test(password)
    const lower = /[a-z]/.test(password)
    const digit = /[0-9]/.test(password)
    const symbol = /[^A-Za-z0-9]/.test(password)
    return { length, upper, lower, digit, symbol, all: length && upper && lower && digit && symbol }
  }, [password])

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
    } catch (e: any) {
      setError(e.message || 'Signup failed')
    } finally {
      setLoading(false)
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
        <form onSubmit={handleSubmit} className="bg-[#21262D] rounded-xl border border-[#30363D] p-6 space-y-4">
          {error && <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 px-3 py-2 rounded">{error}</div>}
          {message && <div className="text-sm text-green-300 bg-green-950/40 border border-green-900 px-3 py-2 rounded">{message}</div>}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#F0F6FC]">Email</label>
            <input value={email} onChange={e=>setEmail(e.target.value)} type="email" required className="w-full h-10 px-3 rounded-md bg-[#0D1117] border border-[#30363D] text-[#F0F6FC] text-sm focus:border-[#1F6FEB] focus:ring-[#1F6FEB] focus:outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#F0F6FC] flex items-center justify-between">Password <span className="text-[10px] font-normal text-[#8B949E]">Min 12 chars incl. upper, lower, digit, symbol</span></label>
            <input value={password} onChange={e=>setPassword(e.target.value)} onBlur={()=>setTouchedPassword(true)} type="password" required className={`w-full h-10 px-3 rounded-md bg-[#0D1117] border text-[#F0F6FC] text-sm focus:border-[#1F6FEB] focus:ring-[#1F6FEB] focus:outline-none ${password && !passwordChecks.all ? 'border-red-500/60' : 'border-[#30363D]'}`} aria-describedby="pw-help" aria-invalid={password ? !passwordChecks.all : false} />
            {(touchedPassword || password.length>0) && (
              <ul id="pw-help" className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] tracking-tight text-[#8B949E]">
                <PasswordRule ok={passwordChecks.length} label="≥ 12 chars" />
                <PasswordRule ok={passwordChecks.upper} label="Uppercase" />
                <PasswordRule ok={passwordChecks.lower} label="Lowercase" />
                <PasswordRule ok={passwordChecks.digit} label="Digit" />
                <PasswordRule ok={passwordChecks.symbol} label="Symbol" />
              </ul>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#F0F6FC]">Confirm Password</label>
            <input value={confirm} onChange={e=>setConfirm(e.target.value)} type="password" required className="w-full h-10 px-3 rounded-md bg-[#0D1117] border border-[#30363D] text-[#F0F6FC] text-sm focus:border-[#1F6FEB] focus:ring-[#1F6FEB] focus:outline-none" />
          </div>
          <button disabled={loading || !passwordChecks.all} className="w-full h-10 bg-[#1F6FEB] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#0969DA] text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center">
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2"/>}
            Sign up
          </button>
          <p className="text-xs text-center text-[#8B949E]">Already have an account? <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-[#1F6FEB] hover:text-[#0969DA] font-medium">Sign in</Link></p>
        </form>
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
