import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Admin protected invite endpoint. Requires ADMIN_INVITE_SECRET header and SUPABASE_SERVICE_ROLE_KEY env.

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.ADMIN_INVITE_SECRET
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!secret || !serviceKey || !url) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

    const provided = req.headers.get('x-admin-invite-secret')
    if (!provided || provided !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const adminClient = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
    // Send invite (creates user and sends email)
    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(String(email).trim())
    if (error) return NextResponse.json({ error: 'Invite failed' }, { status: 400 })
    return NextResponse.json({ message: 'Invite sent', userId: data.user?.id })
  } catch {
    return NextResponse.json({ error: 'Invite failed' }, { status: 500 })
  }
}
