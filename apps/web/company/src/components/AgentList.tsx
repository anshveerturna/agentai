'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAgents, Agent } from '../lib/apiClient';

interface AgentListProps {
  search?: string;
}

export default function AgentList({ search = '' }: AgentListProps) {
  const { data, error, isLoading, refetch } = useQuery<Agent[]>({ queryKey: ['agents'], queryFn: fetchAgents, refetchOnWindowFocus: true, retry: 1 });

  if (isLoading) return <p className="text-slate-500 theme-transition">Loading agents...</p>;
  if (error) {
    const message = (error as any)?.message || 'Unknown error';
    return (
      <div className="rounded-md border border-red-200 bg-red-50 text-red-700 p-4 flex items-center justify-between">
        <span>Error loading agents: {message}</span>
        <button onClick={() => refetch()} className="px-3 py-1 rounded bg-red-600 text-white text-sm">Retry</button>
      </div>
    );
  }

  const agentsArray: Agent[] = Array.isArray(data) ? data : [];
  const filtered = agentsArray.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (a.name || '').toLowerCase().includes(q) ||
      (a.description || '').toLowerCase().includes(q)
    );
  });

  if (!filtered.length) {
  return <p className="text-slate-500 theme-transition">No agents match your search.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-3 mt-2">
      {filtered.map((agent) => (
        <div key={agent.id} className="border border-slate-200/80 dark:border-slate-800/80 rounded-lg p-4 bg-white dark:bg-slate-900 hover:shadow-sm hover:border-blue-300/70 dark:hover:border-blue-600/70 theme-transition">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white leading-6">{agent.name}</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{agent.description || 'No description'}</p>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Updated just now</span>
          </div>
        </div>
      ))}
    </div>
  );
}
