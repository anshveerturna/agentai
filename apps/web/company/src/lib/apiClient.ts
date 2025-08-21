// src/lib/apiClient.ts

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

export interface Agent {
  id: string;
  name?: string;
  description?: string;
  [key: string]: unknown;
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
  }
  const res = await fetch(`${API_BASE_URL}/agents`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch agents');
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
