// src/lib/apiClient.ts

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

export async function fetchAgents() {
  const res = await fetch(`${API_BASE_URL}/agents`);
  if (!res.ok) throw new Error('Failed to fetch agents');
  return res.json();
}
