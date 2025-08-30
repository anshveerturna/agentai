"use client"
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function ResetPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center p-4 bg-[#0D1117]"><div className="text-[#8B949E]">Loading…</div></div>}>
      <ResetInner />
    </Suspense>
  )
}

function ResetInner() {
  const router = useRouter()
  const search = useSearchParams()
  const mode = search.get('mode') // null or 'update'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null); setMsg(null); setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      const json = await res.json(); setMsg(json.message || 'If that email exists, a reset link was sent.')
    } catch { setMsg('If that email exists, a reset link was sent.') } finally { setLoading(false) }
  }

  const submitUpdate = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null); setMsg(null); if (password !== confirm) { setErr('Passwords do not match'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })
      const json = await res.json(); if (!res.ok) { setErr(json.error || 'Reset failed'); return }
      setMsg('Password updated. Redirecting to login...')
      setTimeout(()=> router.replace('/login'), 1500)
    } catch { setErr('Reset failed') } finally { setLoading(false) }
  }

  if (mode === 'update') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#0D1117]">
        <form onSubmit={submitUpdate} className="w-full max-w-sm bg-[#21262D] p-6 rounded-lg border border-[#30363D] space-y-4">
          <h1 className="text-lg font-semibold text-[#F0F6FC]">Set new password</h1>
          {err && <div className="text-sm text-red-400">{err}</div>}
          {msg && <div className="text-sm text-green-400">{msg}</div>}
          <input id="password" placeholder="New password" type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full h-10 px-3 rounded-md bg-[#0D1117] border border-[#30363D] text-[#F0F6FC] text-sm" />
          <input id="confirm" placeholder="Confirm password" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} className="w-full h-10 px-3 rounded-md bg-[#0D1117] border border-[#30363D] text-[#F0F6FC] text-sm" />
          <button disabled={loading} className="w-full h-10 bg-[#1F6FEB] hover:bg-[#0969DA] text-white rounded-md text-sm font-medium">Update</button>
        </form>
      </div>
    )
  }
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0D1117]">
      <form onSubmit={submitRequest} className="w-full max-w-sm bg-[#21262D] p-6 rounded-lg border border-[#30363D] space-y-4">
  <h1 className="text-lg font-semibold text-[#F0F6FC]">Reset password</h1>
  {err && <div className="text-sm text-red-400">{err}</div>}
  {msg && <div className="text-sm text-green-400">{msg}</div>}
  <input id="email" placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full h-10 px-3 rounded-md bg-[#0D1117] border border-[#30363D] text-[#F0F6FC] text-sm" />
  <button disabled={loading} className="w-full h-10 bg-[#1F6FEB] hover:bg-[#0969DA] text-white rounded-md text-sm font-medium">Send reset link</button>
      </form>
    </div>
  )
}
