"use client";
import useSWR from 'swr';
import { useCallback, useMemo, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, RefreshCw, AlertTriangle, MoreHorizontal, Play, Pause, Copy, Edit, Clock } from 'lucide-react';
import { listWorkflows, createWorkflow, duplicateWorkflow, updateWorkflowStatus, validateWorkflow, type Workflow } from '@/lib/workflows.client';

const statusColors: Record<string, string> = { active: 'bg-green-500', paused: 'bg-yellow-500', error: 'bg-red-500', draft: 'bg-gray-500' };
const statusLabels: Record<string, string> = { active: 'Active', paused: 'Paused', error: 'Error', draft: 'Draft' };

// Deterministic date formatting (UTC, fixed layout) to avoid hydration mismatch
function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}Z`;
}

const fetcher = () => listWorkflows();

interface Props {
  initialWorkflows: Workflow[];
  searchQuery: string;
  viewMode: 'grid' | 'list';
  onEditWorkflow: (id: string) => void;
}

export default function WorkflowListClient({ initialWorkflows, searchQuery, viewMode, onEditWorkflow }: Props) {
  const { data, error, isLoading, mutate } = useSWR<Workflow[]>('/workflows', fetcher, { fallbackData: initialWorkflows });
  const [creating, setCreating] = useState(false);
  const [optimisticIds, setOptimisticIds] = useState<Set<string>>(new Set());
  // validation state: per workflow id
  const [validationMap, setValidationMap] = useState<Record<string, { errors: number; warnings: number; loading: boolean; ts: number }>>({});
  const hoverTimers = useRef<Record<string, number>>({});

  const fetchValidation = useCallback(async (id: string) => {
    setValidationMap(m => {
      const existing = m[id];
      // if already loading or fetched under 30s ago, skip
      if (existing && (existing.loading || (Date.now() - existing.ts) < 30000)) return m;
      return { ...m, [id]: { errors: existing?.errors || 0, warnings: existing?.warnings || 0, loading: true, ts: existing?.ts || 0 } };
    });
    try {
      const res = await validateWorkflow(id);
      const issues = res.issues || [];
      let errors = 0; let warnings = 0;
      for (const i of issues) {
        if ((i.severity||'').toLowerCase() === 'error') errors++; else warnings++;
      }
      setValidationMap(m => ({ ...m, [id]: { errors, warnings, loading: false, ts: Date.now() } }));
    } catch (e) {
      // mark as failed (treat as 0/0 but not loading, short ttl so retry possible)
      setValidationMap(m => ({ ...m, [id]: { errors: -1, warnings: 0, loading: false, ts: Date.now() } }));
    }
  }, []);

  const scheduleValidation = useCallback((id: string) => {
    // schedule with small delay to avoid spamming while user just moves cursor
    if (hoverTimers.current[id]) window.clearTimeout(hoverTimers.current[id]);
    hoverTimers.current[id] = window.setTimeout(() => fetchValidation(id), 250);
  }, [fetchValidation]);

  const getValidationBadge = useCallback((wfId: string) => {
    const state = validationMap[wfId];
    if (!state) return <Badge variant="outline" className="cursor-pointer" title="Hover to validate">Validate</Badge>;
    if (state.loading) return <Badge variant="outline" className="animate-pulse" title="Validating...">Checking…</Badge>;
    if (state.errors === -1) return <Badge variant="destructive" className="cursor-pointer" title="Validation failed. Hover to retry">Error</Badge>;
    const { errors, warnings } = state;
    let color = 'bg-emerald-600 text-white';
    if (errors > 0) color = 'bg-red-600 text-white';
    else if (warnings > 0) color = 'bg-amber-500 text-black';
    const label = errors === 0 && warnings === 0 ? 'Clean' : `${errors}E/${warnings}W`;
    const title = errors === 0 && warnings === 0 ? 'No issues' : `${errors} error(s), ${warnings} warning(s)`;
    return <Badge className={`${color} font-normal`} title={title}>{label}</Badge>;
  }, [validationMap]);

  const createNew = useCallback(async () => {
    setCreating(true);
    const tempId = 'tmp-' + crypto.randomUUID();
    const optimistic: Workflow = { id: tempId, name: 'New Workflow', description: 'Draft', status: 'draft', graph: { nodes: [], edges: [] }, nodeOverrides: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    setOptimisticIds(s => new Set(s).add(tempId));
    await mutate(async (current?: Workflow[]) => {
      const base: Workflow[] = current || [];
      try {
        const created = await createWorkflow({ name: 'New Workflow', description: 'Draft', graph: { nodes: [], edges: [], viewport: { x:0,y:0,zoom:1 } } });
        setOptimisticIds(s => { const n = new Set(s); n.delete(tempId); return n; });
        return [created, ...base];
      } catch (e) {
        // rollback
        setOptimisticIds(s => { const n = new Set(s); n.delete(tempId); return n; });
        return base.filter((w: Workflow) => w.id !== tempId);
      }
    }, { optimisticData: [optimistic, ...(data||[])], rollbackOnError: true, revalidate: true });
    setCreating(false);
  }, [data, mutate]);

  const duplicate = useCallback(async (id: string) => {
    await mutate(async (current?: Workflow[]) => {
      const base: Workflow[] = current || [];
      try {
        const dup = await duplicateWorkflow(id);
        return [dup, ...base];
      } catch { return base; }
    }, { revalidate: false });
  }, [mutate]);

  const toggleStatus = useCallback(async (wf: Workflow) => {
    const next = wf.status === 'active' ? 'paused' : 'active';
    await mutate(async (current?: Workflow[]) => {
      const base: Workflow[] = current || [];
      try {
        await updateWorkflowStatus(wf.id, next!);
        return base.map((w: Workflow) => w.id === wf.id ? { ...w, status: next } : w);
      } catch { return base; }
    }, { optimisticData: (current?: Workflow[]) => (current||[]).map(w => w.id === wf.id ? { ...w, status: next } : w), rollbackOnError: true, revalidate: false });
  }, [mutate]);

  const filtered = useMemo(() => (data || []).filter((w: Workflow) => {
    const q = searchQuery.toLowerCase();
    return w.name.toLowerCase().includes(q) || (w.description||'').toLowerCase().includes(q);
  }), [data, searchQuery]);

  if (isLoading && !data?.length) {
    return <div className="flex items-center gap-3 text-sm text-muted-foreground p-4"><RefreshCw className="w-4 h-4 animate-spin"/> Loading workflows...</div>;
  }
  if (error) {
    return <div className="p-4 border rounded-md border-destructive/30 bg-destructive/5 text-sm"><div className="flex items-center gap-2 text-destructive mb-2"><AlertTriangle className="w-4 h-4"/> Failed to load workflows</div><Button size="sm" variant="outline" onClick={() => mutate()}>Retry</Button></div>;
  }
  if (!filtered.length) {
    return <div className="p-8 border border-dashed rounded-lg text-center text-sm text-muted-foreground">No workflows{searchQuery? ' matching search.':'.'}<div className="mt-4 flex justify-center gap-2"><Button size="sm" onClick={() => mutate()}>Refresh</Button><Button size="sm" onClick={createNew} disabled={creating}>{creating?'Creating...':'Create New'}</Button></div></div>;
  }

  if (viewMode === 'grid') {
    return (
      <div className="space-y-4">
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => mutate()}>Refresh</Button>
          <Button size="sm" onClick={createNew} disabled={creating}><Plus className="w-3 h-3 mr-1" />New</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map(wf => {
            const optimistic = optimisticIds.has(wf.id);
            return (
              <div
                key={wf.id}
                className="group bg-card rounded-xl border border-border/50 p-6 hover:border-border hover:shadow-lg transition-all duration-200"
                onMouseEnter={() => scheduleValidation(wf.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${statusColors[wf.status||'draft']||'bg-gray-500'} ${optimistic?'animate-pulse':''}`} />
                    <div>
                      <h3 className="font-semibold text-lg break-all">{wf.name}{optimistic && ' (saving...)'}</h3>
                      <div className="flex gap-2 mt-1 items-center">
                        <Badge variant="secondary">{statusLabels[wf.status||'draft']||'Draft'}</Badge>
                        {getValidationBadge(wf.id)}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => duplicate(wf.id)} title="Duplicate"><Copy className="w-4 h-4" /></Button>
                </div>
                <p className="text-muted-foreground text-sm mb-4 line-clamp-3 min-h-[3rem]">{wf.description}</p>
                <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                  <div>Created: {wf.createdAt?.slice(0,10) || '—'}</div>
                  <div>Updated: {formatDateTime(wf.updatedAt)}</div>
                </div>
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/50">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="w-3 h-3" /> {formatDateTime(wf.updatedAt).split(' ')[1] || '—'}</div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => toggleStatus(wf)}>
                      {wf.status === 'active' ? <Pause className="w-3 h-3 mr-1"/> : <Play className="w-3 h-3 mr-1"/>}
                      {wf.status === 'active' ? 'Pause' : 'Run'}
                    </Button>
                    <Button size="sm" onClick={() => onEditWorkflow(wf.id)}><Edit className="w-3 h-3 mr-1"/>Edit</Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => mutate()}>Refresh</Button>
        <Button size="sm" onClick={createNew} disabled={creating}><Plus className="w-3 h-3 mr-1" />New</Button>
      </div>
      <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-border/50 bg-muted/30 text-sm font-medium">
          <div className="col-span-4">Workflow</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Created</div>
            <div className="col-span-2">Updated</div>
          <div className="col-span-2">Actions</div>
        </div>
        {filtered.map(wf => {
          const optimistic = optimisticIds.has(wf.id);
          return (
            <div
              key={wf.id}
              className="grid grid-cols-12 gap-4 p-4 border-b border-border/50 hover:bg-muted/30 transition-colors"
              onMouseEnter={() => scheduleValidation(wf.id)}
            >
              <div className="col-span-4">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${statusColors[wf.status||'draft']||'bg-gray-500'} ${optimistic?'animate-pulse':''}`} />
                  <div>
                    <div className="font-medium break-all">{wf.name}{optimistic && ' (saving...)'}</div>
                    <div className="text-sm text-muted-foreground line-clamp-2">{wf.description}</div>
                  </div>
                </div>
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <Badge variant="secondary" className="w-fit">{statusLabels[wf.status||'draft']||'Draft'}</Badge>
                <div className="w-fit">{getValidationBadge(wf.id)}</div>
              </div>
              <div className="col-span-2 text-sm">{wf.createdAt?.slice(0,10) || '—'}</div>
              <div className="col-span-2 text-sm">{formatDateTime(wf.updatedAt)}</div>
              <div className="col-span-2 flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => onEditWorkflow(wf.id)} title="Edit"><Edit className="w-3 h-3"/></Button>
                <Button size="sm" variant="ghost" onClick={() => duplicate(wf.id)} title="Duplicate"><Copy className="w-3 h-3"/></Button>
                <Button size="sm" variant="ghost" onClick={() => toggleStatus(wf)} title={wf.status==='active'?'Pause':'Run'}>
                  {wf.status==='active'? <Pause className="w-3 h-3"/> : <Play className="w-3 h-3"/>}
                </Button>
                <Button size="sm" variant="ghost" title="More"><MoreHorizontal className="w-3 h-3"/></Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
