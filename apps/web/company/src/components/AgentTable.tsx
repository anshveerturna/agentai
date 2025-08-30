'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAgents, Agent } from '../lib/apiClient';
import { ChevronDown } from 'lucide-react';

interface AgentTableProps {
  search?: string;
}

// Agent type imported from apiClient

function timeAgo(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  const mins = Math.floor(sec / 60);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
  if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (mins > 0) return `${mins} minute${mins > 1 ? 's' : ''} ago`;
  return 'just now';
}

export default function AgentTable({ search = '' }: AgentTableProps) {
  const { data, error, isLoading, refetch } = useQuery<Agent[]>({ queryKey: ['agents'], queryFn: fetchAgents, refetchOnWindowFocus: true, retry: 1 });

  if (isLoading) return <p className="text-slate-500">Loading agents...</p>;
  if (error) {
    const message = (error && typeof error === 'object' && 'message' in error ? (error as { message?: string }).message : undefined) || 'Unknown error';
    return (
      <div className="rounded-md border border-red-200 bg-red-50 text-red-700 p-4 flex items-center justify-between">
        <span>Error loading agents: {message}</span>
        <button onClick={() => refetch()} className="px-3 py-1 rounded bg-red-600 text-white text-sm">Retry</button>
      </div>
    );
  }

  const items: Agent[] = Array.isArray(data) ? data : [];
  const filtered = items.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (typeof a.name === 'string' && a.name.toLowerCase().includes(q)) ||
      (typeof a.description === 'string' && a.description.toLowerCase().includes(q)) ||
      (typeof a.type === 'string' && a.type.toLowerCase().includes(q)) ||
  (typeof (a.owner || a.ownerName) === 'string' && String(a.owner || a.ownerName).toLowerCase().includes(q))
    );
  });

  if (!filtered.length) {
    return <p className="text-slate-500">No agents match your search.</p>;
  }

  return (
    <div className="w-full max-w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
            <th className="text-left font-semibold py-3 pr-4">Name</th>
            <th className="text-left font-semibold py-3 pr-4">Type</th>
            <th className="text-left font-semibold py-3 pr-4">
              <div className="inline-flex items-center gap-1">
                Last modified <ChevronDown className="w-4 h-4 text-slate-400" />
              </div>
            </th>
            <th className="text-left font-semibold py-3 pr-4">Last published</th>
            <th className="text-left font-semibold py-3 pr-4">Owner</th>
            <th className="text-left font-semibold py-3 pr-4">Protection status</th>
            <th className="text-left font-semibold py-3">Engaged sessions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((a) => (
            <tr key={a.id} className="border-b last:border-b-0 border-slate-100 dark:border-slate-800 hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
              <td className="py-4 pr-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex-none" />
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 dark:text-white truncate">{a.name}</div>
                  </div>
                </div>
              </td>
              <td className="py-4 pr-4 text-slate-700 dark:text-slate-300">{typeof a.type === 'string' ? a.type : '—'}</td>
              <td className="py-4 pr-4 text-slate-700 dark:text-slate-300">{timeAgo(typeof (a.updatedAt || a.updated_at) === 'string' ? (a.updatedAt || a.updated_at) as string : undefined)}</td>
              <td className="py-4 pr-4 text-slate-700 dark:text-slate-300">{typeof a.lastPublishedAt === 'string' ? timeAgo(a.lastPublishedAt) : 'Never'}</td>
              <td className="py-4 pr-4 text-slate-700 dark:text-slate-300">{typeof (a.owner || a.ownerName) === 'string' ? String(a.owner || a.ownerName) : '—'}</td>
              <td className="py-4 pr-4 text-slate-500">{typeof a.protectionStatus === 'string' ? a.protectionStatus : '—'}</td>
              <td className="py-4 text-slate-500">{typeof a.engagedSessions === 'number' ? a.engagedSessions : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
