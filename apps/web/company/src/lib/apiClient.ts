// src/lib/apiClient.ts
import { getSupabaseClient } from './supabase.client'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
const isBrowser = typeof window !== 'undefined';
// Prefer the Next.js proxy in the browser so it can attach Authorization from cookies.
const BROWSER_PROXY_BASE = '/api/company';

export interface Agent {
  id: string;
  name?: string;
  description?: string;
  [key: string]: unknown;
}

// Get access token from Supabase session
async function getAccessToken(): Promise<string | null> {
  if (!isBrowser) return null;
  try {
    const client = getSupabaseClient();
    const { data: { session } } = await client.auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
}

// Internal implementation allowing optional token getter.
async function fetchAgentsInternal(getToken?: () => Promise<string | null>): Promise<Agent[]> {
  let token: string | null = null;
  if (getToken) {
    try {
      token = await getToken();
    } catch {
      token = null;
    }
  } else {
    // Use Supabase session token
    token = await getAccessToken();
  }
  
  const base = isBrowser ? BROWSER_PROXY_BASE : API_BASE_URL;
  const headers: Record<string, string> = {};
  
  // Always add Authorization header if we have a token
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const res = await fetch(`${base}/agents`, {
    headers,
    credentials: 'include'
  });
  if (!res.ok) {
    let details = ''
    try { details = await res.text() } catch {}
    const msg = details || `${res.status} ${res.statusText}`
    throw new Error(`Failed to fetch agents: ${msg}`)
  }
  return res.json();
}

// Default export for React Query usage (no args) relying on cookie-based session.
export function fetchAgents(): Promise<Agent[]> {
  return fetchAgentsInternal();
}

// Optional helper if a token getter is available elsewhere.
export function fetchAgentsWithToken(getToken: () => Promise<string | null>): Promise<Agent[]> {
  return fetchAgentsInternal(getToken);
}
