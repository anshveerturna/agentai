// src/lib/workflows.client.ts
import { getSupabaseClient } from './supabase.client'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'
const isBrowser = typeof window !== 'undefined'
const BROWSER_PROXY_BASE = '/api/company'

export interface Workflow {
  id: string
  name: string
  description?: string | null
  status?: string | null
  graph?: unknown
  nodeOverrides?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

async function getAccessToken(): Promise<string | null> {
  if (!isBrowser) return null
  try {
    const client = getSupabaseClient()
    const { data: { session } } = await client.auth.getSession()
    return session?.access_token || null
  } catch {
    return null
  }
}

function getBase() { return isBrowser ? BROWSER_PROXY_BASE : API_BASE_URL }

export async function listWorkflows(): Promise<Workflow[]> {
  const token = await getAccessToken()
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  // Try proxy first in browser, then fall back to direct API on 404 or network errors
  const proxyUrl = `${BROWSER_PROXY_BASE}/workflows`
  const directUrl = `${API_BASE_URL}/workflows`
  try {
    const url = isBrowser ? proxyUrl : directUrl
    const res = await fetch(url, { headers, credentials: 'include', cache: 'no-store' })
    if (res.status === 404 && isBrowser) {
      // Fall back to direct URL
      const res2 = await fetch(directUrl, { headers, credentials: 'include', cache: 'no-store' })
      if (!res2.ok) {
        const txt2 = await res2.text().catch(() => '')
        throw new Error(`Failed to fetch workflows (fallback): ${txt2 || res2.statusText}`)
      }
      return res2.json()
    }
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      throw new Error(`Failed to fetch workflows: ${txt || res.statusText}`)
    }
    return res.json()
  } catch (e) {
    // Last resort: direct URL
    const res = await fetch(directUrl, { headers, credentials: 'include', cache: 'no-store' })
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      throw new Error(`Failed to fetch workflows (direct): ${txt || res.statusText}`)
    }
    return res.json()
  }
}

export async function createWorkflow(input: { name: string; description?: string; graph?: unknown }): Promise<Workflow> {
  const token = await getAccessToken()
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const body = JSON.stringify({
    name: input.name,
    description: input.description,
    graph: input.graph ?? { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
    nodeOverrides: {},
  })
  const proxyUrl = `${BROWSER_PROXY_BASE}/workflows`
  const directUrl = `${API_BASE_URL}/workflows`
  try {
    const url = isBrowser ? proxyUrl : directUrl
    const res = await fetch(url, { method: 'POST', headers, body, credentials: 'include', cache: 'no-store' })
    if (res.status === 404 && isBrowser) {
      const res2 = await fetch(directUrl, { method: 'POST', headers, body, credentials: 'include', cache: 'no-store' })
      if (!res2.ok) {
        const txt2 = await res2.text().catch(() => '')
        throw new Error(`Failed to create workflow (fallback): ${txt2 || res2.statusText}`)
      }
      return res2.json()
    }
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      throw new Error(`Failed to create workflow: ${txt || res.statusText}`)
    }
    return res.json()
  } catch (e) {
    const res = await fetch(directUrl, { method: 'POST', headers, body, credentials: 'include', cache: 'no-store' })
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      throw new Error(`Failed to create workflow (direct): ${txt || res.statusText}`)
    }
    return res.json()
  }
}

// --- Versions and single workflow helpers ---

export async function getWorkflow(id: string): Promise<Workflow> {
  const token = await getAccessToken()
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  const proxyUrl = `${BROWSER_PROXY_BASE}/workflows/${id}`
  const directUrl = `${API_BASE_URL}/workflows/${id}`
  const url = isBrowser ? proxyUrl : directUrl
  const res = await fetch(url, { headers, credentials: 'include', cache: 'no-store' })
  if (!res.ok) {
    // try direct
    const res2 = await fetch(directUrl, { headers, credentials: 'include', cache: 'no-store' })
    if (!res2.ok) throw new Error(`Failed to fetch workflow: ${res2.status} ${res2.statusText}`)
    return res2.json()
  }
  return res.json()
}

export interface WorkflowVersion {
  id: string
  workflowId: string
  label?: string | null
  name?: string | null
  description?: string | null
  snapshot?: string | null
  createdAt?: string
  createdBy?: string
  versionNumber?: number | null
  semanticHash?: string | null
}

export async function listVersions(workflowId: string): Promise<WorkflowVersion[]> {
  const token = await getAccessToken()
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  const proxyUrl = `${BROWSER_PROXY_BASE}/workflows/${workflowId}/versions`
  const directUrl = `${API_BASE_URL}/workflows/${workflowId}/versions`
  const url = isBrowser ? proxyUrl : directUrl
  const res = await fetch(url, { headers, credentials: 'include', cache: 'no-store' })
  if (!res.ok) {
    const res2 = await fetch(directUrl, { headers, credentials: 'include', cache: 'no-store' })
    if (!res2.ok) throw new Error(`Failed to list versions: ${res2.status} ${res2.statusText}`)
    return res2.json()
  }
  return res.json()
}

export async function createVersion(workflowId: string, label?: string): Promise<WorkflowVersion> {
  const token = await getAccessToken()
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const body = JSON.stringify({ label })
  const proxyUrl = `${BROWSER_PROXY_BASE}/workflows/${workflowId}/versions`
  const directUrl = `${API_BASE_URL}/workflows/${workflowId}/versions`
  const url = isBrowser ? proxyUrl : directUrl
  const res = await fetch(url, { method: 'POST', headers, body, credentials: 'include', cache: 'no-store' })
  if (!res.ok) {
    const res2 = await fetch(directUrl, { method: 'POST', headers, body, credentials: 'include', cache: 'no-store' })
    if (!res2.ok) throw new Error(`Failed to create version: ${res2.status} ${res2.statusText}`)
    return res2.json()
  }
  return res.json()
}

export async function restoreVersion(workflowId: string, versionId: string): Promise<{ ok: boolean }> {
  const token = await getAccessToken()
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const proxyUrl = `${BROWSER_PROXY_BASE}/workflows/${workflowId}/versions/${versionId}/restore`
  const directUrl = `${API_BASE_URL}/workflows/${workflowId}/versions/${versionId}/restore`
  const url = isBrowser ? proxyUrl : directUrl
  const res = await fetch(url, { method: 'POST', headers, credentials: 'include', cache: 'no-store' })
  if (!res.ok) {
    const res2 = await fetch(directUrl, { method: 'POST', headers, credentials: 'include', cache: 'no-store' })
    if (!res2.ok) throw new Error(`Failed to restore version: ${res2.status} ${res2.statusText}`)
    return res2.json()
  }
  return res.json()
}

export async function deleteVersion(workflowId: string, versionId: string): Promise<{ deleted: boolean }>{
  const token = await getAccessToken()
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  const proxyUrl = `${BROWSER_PROXY_BASE}/workflows/${workflowId}/versions/${versionId}`
  const directUrl = `${API_BASE_URL}/workflows/${workflowId}/versions/${versionId}`
  const url = isBrowser ? proxyUrl : directUrl
  const res = await fetch(url, { method: 'DELETE', headers, credentials: 'include', cache: 'no-store' })
  if (!res.ok) {
    const res2 = await fetch(directUrl, { method: 'DELETE', headers, credentials: 'include', cache: 'no-store' })
    if (!res2.ok) throw new Error(`Failed to delete version: ${res2.status} ${res2.statusText}`)
    return res2.json()
  }
  return res.json()
}

export async function updateWorkflow(id: string, patch: Partial<Workflow>): Promise<Workflow> {
  const token = await getAccessToken()
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const body = JSON.stringify(patch)
  const proxyUrl = `${BROWSER_PROXY_BASE}/workflows/${id}`
  const directUrl = `${API_BASE_URL}/workflows/${id}`
  const url = isBrowser ? proxyUrl : directUrl
  const res = await fetch(url, { method: 'PUT', headers, body, credentials: 'include', cache: 'no-store' })
  if (!res.ok) {
    const res2 = await fetch(directUrl, { method: 'PUT', headers, body, credentials: 'include', cache: 'no-store' })
    if (!res2.ok) throw new Error(`Failed to update workflow: ${res2.status} ${res2.statusText}`)
    return res2.json()
  }
  return res.json()
}

export async function deleteWorkflow(id: string): Promise<{ deleted: boolean }> {
  const token = await getAccessToken()
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const proxyUrl = `${BROWSER_PROXY_BASE}/workflows/${id}`
  const directUrl = `${API_BASE_URL}/workflows/${id}`
  const url = isBrowser ? proxyUrl : directUrl
  const res = await fetch(url, { method: 'DELETE', headers, credentials: 'include', cache: 'no-store' })
  if (!res.ok) {
    const res2 = await fetch(directUrl, { method: 'DELETE', headers, credentials: 'include', cache: 'no-store' })
    if (!res2.ok) throw new Error(`Failed to delete workflow: ${res2.status} ${res2.statusText}`)
    return res2.json()
  }
  return res.json()
}

// --- New helpers ---
export async function duplicateWorkflow(id: string): Promise<Workflow> {
  const token = await getAccessToken();
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const proxyUrl = `${BROWSER_PROXY_BASE}/workflows/${id}/duplicate`;
  const directUrl = `${API_BASE_URL}/workflows/${id}/duplicate`;
  const url = isBrowser ? proxyUrl : directUrl;
  const res = await fetch(url, { method: 'POST', headers, credentials: 'include', cache: 'no-store' });
  if (!res.ok) {
    const res2 = await fetch(directUrl, { method: 'POST', headers, credentials: 'include', cache: 'no-store' });
    if (!res2.ok) throw new Error(`Failed to duplicate workflow: ${res2.status} ${res2.statusText}`);
    return res2.json();
  }
  return res.json();
}

export async function updateWorkflowStatus(id: string, status: string): Promise<{ id: string; status: string }> {
  const token = await getAccessToken();
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const body = JSON.stringify({ status });
  const proxyUrl = `${BROWSER_PROXY_BASE}/workflows/${id}/status`;
  const directUrl = `${API_BASE_URL}/workflows/${id}/status`;
  const url = isBrowser ? proxyUrl : directUrl;
  const res = await fetch(url, { method: 'POST', headers, body, credentials: 'include', cache: 'no-store' });
  if (!res.ok) {
    const res2 = await fetch(directUrl, { method: 'POST', headers, body, credentials: 'include', cache: 'no-store' });
    if (!res2.ok) throw new Error(`Failed to update workflow status: ${res2.status} ${res2.statusText}`);
    return res2.json();
  }
  return res.json();
}

export async function validateWorkflow(id: string): Promise<{ issues: Array<{ code: string; message: string; severity: string }> }> {
  const token = await getAccessToken();
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const proxyUrl = `${BROWSER_PROXY_BASE}/workflows/${id}/validate`;
  const directUrl = `${API_BASE_URL}/workflows/${id}/validate`;
  const url = isBrowser ? proxyUrl : directUrl;
  const res = await fetch(url, { method: 'POST', headers, credentials: 'include', cache: 'no-store' });
  if (!res.ok) {
    const res2 = await fetch(directUrl, { method: 'POST', headers, credentials: 'include', cache: 'no-store' });
    if (!res2.ok) throw new Error(`Failed to validate workflow: ${res2.status} ${res2.statusText}`);
    return res2.json();
  }
  return res.json();
}

// Working copy + semantic commit helpers
export async function getWorkingCopy(workflowId: string): Promise<{ workflowId: string; graph: any; updatedAt?: string } | null> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const proxyUrl = `${BROWSER_PROXY_BASE}/workflows/${workflowId}/working-copy`;
  const directUrl = `${API_BASE_URL}/workflows/${workflowId}/working-copy`;
  const url = isBrowser ? proxyUrl : directUrl;
  const res = await fetch(url, { headers, credentials: 'include', cache: 'no-store' });
  if (!res.ok) {
    const res2 = await fetch(directUrl, { headers, credentials: 'include', cache: 'no-store' });
    if (!res2.ok) return null;
    return res2.json();
  }
  return res.json();
}

export async function updateWorkingCopy(workflowId: string, graph: any): Promise<{ ok: boolean; updatedAt?: string }> {
  const token = await getAccessToken();
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const body = JSON.stringify({ graph });
  const proxyUrl = `${BROWSER_PROXY_BASE}/workflows/${workflowId}/working-copy`;
  const directUrl = `${API_BASE_URL}/workflows/${workflowId}/working-copy`;
  const url = isBrowser ? proxyUrl : directUrl;
  const res = await fetch(url, { method: 'POST', headers, body, credentials: 'include', cache: 'no-store' });
  if (!res.ok) {
    const res2 = await fetch(directUrl, { method: 'POST', headers, body, credentials: 'include', cache: 'no-store' });
    if (!res2.ok) throw new Error(`Failed to update working copy: ${res2.status} ${res2.statusText}`);
    return res2.json();
  }
  return res.json();
}

export async function maybeCommit(workflowId: string, opts?: { minIntervalSec?: number; threshold?: number }): Promise<{ committed: boolean; versionId?: string; versionNumber?: number }>{
  const token = await getAccessToken();
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const body = JSON.stringify(opts || {});
  const proxyUrl = `${BROWSER_PROXY_BASE}/workflows/${workflowId}/maybe-commit`;
  const directUrl = `${API_BASE_URL}/workflows/${workflowId}/maybe-commit`;
  const url = isBrowser ? proxyUrl : directUrl;
  const res = await fetch(url, { method: 'POST', headers, body, credentials: 'include', cache: 'no-store' });
  if (!res.ok) {
    const res2 = await fetch(directUrl, { method: 'POST', headers, body, credentials: 'include', cache: 'no-store' });
    if (!res2.ok) throw new Error(`Failed to maybe-commit: ${res2.status} ${res2.statusText}`);
    return res2.json();
  }
  return res.json();
}

export async function commit(workflowId: string, name?: string, description?: string): Promise<{ id: string; versionNumber?: number }>{
  const token = await getAccessToken();
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const body = JSON.stringify({ name, description });
  const proxyUrl = `${BROWSER_PROXY_BASE}/workflows/${workflowId}/commit`;
  const directUrl = `${API_BASE_URL}/workflows/${workflowId}/commit`;
  const url = isBrowser ? proxyUrl : directUrl;
  const res = await fetch(url, { method: 'POST', headers, body, credentials: 'include', cache: 'no-store' });
  if (!res.ok) {
    const res2 = await fetch(directUrl, { method: 'POST', headers, body, credentials: 'include', cache: 'no-store' });
    if (!res2.ok) throw new Error(`Failed to commit: ${res2.status} ${res2.statusText}`);
    return res2.json();
  }
  return res.json();
}

