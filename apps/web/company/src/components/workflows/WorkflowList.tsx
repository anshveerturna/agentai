import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, MoreHorizontal, Copy, Edit, Clock, RefreshCw, AlertTriangle, Trash2, Pencil } from 'lucide-react';
import { listWorkflows, deleteWorkflow, updateWorkflow, type Workflow } from '@/lib/workflows.client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';

interface WorkflowListProps {
  searchQuery: string;
  viewMode: 'grid' | 'list';
  onEditWorkflow: (id: string) => void;
}

// Utility to format timestamps safely
function fmt(ts?: string) { if (!ts) return '—'; try { return new Date(ts).toLocaleString(); } catch { return ts; } }
function fmtDate(ts?: string) { if (!ts) return '—'; try { return new Date(ts).toISOString().split('T')[0]; } catch { return ts; } }

const statusColors: Record<string, string> = {
  active: 'bg-green-500',
  paused: 'bg-yellow-500',
  error: 'bg-red-500',
  draft: 'bg-gray-500',
};

const statusLabels: Record<string, string> = {
  active: 'Active',
  paused: 'Paused',
  error: 'Error',
  draft: 'Draft',
};

export function WorkflowList({ searchQuery, viewMode, onEditWorkflow }: WorkflowListProps) {
  const [items, setItems] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);
  // Inline rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement | null>(null);

  // Ensure the input focuses automatically when entering edit mode
  useEffect(() => {
    if (editingId) {
      const t = setTimeout(() => {
        editInputRef.current?.focus();
        editInputRef.current?.select();
      }, 0);
      return () => clearTimeout(t);
    }
  }, [editingId]);

  useEffect(() => {
    let cancelled = false;
    console.log('[WorkflowList] mount/refetch index', refreshIndex);
    setLoading(true);
    setError(null);
    listWorkflows()
      .then(data => { 
        console.log('[WorkflowList] fetched', data?.length, 'items');
        if (!cancelled) { setItems(data); }
      })
      .catch(e => { 
        console.warn('[WorkflowList] fetch error', e);
        if (!cancelled) setError(e instanceof Error ? e.message : String(e)); 
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshIndex]);

  // Enter inline rename mode, defer to allow the dropdown to fully close before focusing the input
  const startInlineRename = (workflow: Workflow) => {
    const doStart = () => {
      setEditingId(workflow.id)
      setEditingName(workflow.name || '')
    }
    // Use a small timeout to ensure Radix dropdown completes close + focus restore
    if (typeof window !== 'undefined') {
      setTimeout(doStart, 120)
    } else {
      doStart()
    }
  };

  const commitInlineRename = async () => {
    if (!editingId) return;
    const newName = editingName.trim();
    if (!newName) { cancelInlineRename(); return; }
    setSavingId(editingId);
    // Optimistic update
    const prev = items;
    setItems(prev.map(w => w.id === editingId ? { ...w, name: newName } : w));
    try {
      await updateWorkflow(editingId, { name: newName });
    } catch (e) {
      console.error('Failed to rename workflow:', e);
      // Revert on error
      setItems(prev);
    } finally {
      setSavingId(null);
      setEditingId(null);
      setEditingName('');
    }
  };

  const cancelInlineRename = () => {
    setEditingId(null);
    setEditingName('');
  };

  const deleteNow = async (workflowId: string) => {
    setDeletingId(workflowId);
    // Optimistic remove
    const prev = items;
    setItems(prev.filter(w => w.id !== workflowId));
    try {
      await deleteWorkflow(workflowId);
    } catch (e) {
      console.error('Failed to delete workflow:', e);
      // Revert on error
      setItems(prev);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredWorkflows = items.filter(workflow => {
    const q = searchQuery.toLowerCase();
    return (
      workflow.name?.toLowerCase().includes(q) ||
      (workflow.description?.toLowerCase() || '').includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground p-4">
        <RefreshCw className="w-4 h-4 animate-spin" /> Loading workflows...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border rounded-md border-destructive/30 bg-destructive/5 text-sm">
        <div className="flex items-center gap-2 text-destructive mb-2">
          <AlertTriangle className="w-4 h-4" /> Failed to load workflows
        </div>
        <code className="text-xs break-all block mb-3 opacity-80">{error}</code>
        <Button size="sm" variant="outline" onClick={() => setRefreshIndex(i => i + 1)}>
          Retry
        </Button>
      </div>
    );
  }

  if (!filteredWorkflows.length) {
    console.log('[WorkflowList] no workflows after filter. total', items.length, 'searchQuery', searchQuery);
    return (
      <div className="p-8 border border-dashed rounded-lg text-center text-sm text-muted-foreground">
        No workflows found{searchQuery ? ' matching your search.' : '.'}
        <div className="mt-4">
          <Button size="sm" onClick={() => setRefreshIndex(i => i + 1)}>Refresh</Button>
        </div>
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredWorkflows.map((workflow) => (
          <div key={workflow.id} className="group bg-card rounded-xl border border-border/50 p-6 hover:border-border hover:shadow-lg transition-all duration-200">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${statusColors[workflow.status || 'draft'] || 'bg-gray-500'}`} />
                <div>
                  {editingId === workflow.id ? (
                    <Input
                      ref={(el) => { editInputRef.current = el; }}
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitInlineRename();
                        if (e.key === 'Escape') cancelInlineRename();
                      }}
                      onBlur={commitInlineRename}
                      autoFocus
                      disabled={savingId === workflow.id}
                      className="w-full bg-transparent !border-0 focus:!border-0 focus-visible:!ring-0 focus-visible:!ring-offset-0 !p-0 !m-0 !h-auto text-lg font-semibold leading-tight truncate"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => startInlineRename(workflow)}
                      className="font-semibold text-lg text-left hover:underline underline-offset-2 decoration-dotted focus:outline-none"
                      title="Rename workflow"
                    >
                      {workflow.name}
                    </button>
                  )}
                  <Badge variant="secondary" className="mt-1">
                    {statusLabels[workflow.status || 'draft'] || 'Draft'}
                  </Badge>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => startInlineRename(workflow)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onSelect={() => deleteNow(workflow.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Description */}
            <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
              {workflow.description}
            </p>

            {/* Meta */}
            <div className="mt-4 space-y-1 text-xs text-muted-foreground">
              <div>Created: {fmtDate(workflow.createdAt)}</div>
              <div>Updated: {fmt(workflow.updatedAt)}</div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/50">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" /> {fmt(workflow.updatedAt)}
              </div>
              <div className="flex gap-2">
                {workflow.status === 'active' ? (
                  <Button size="sm" variant="outline">
                    <Pause className="w-3 h-3 mr-1" />
                    Pause
                  </Button>
                ) : (
                  <Button size="sm" className="bg-emerald-500/80 hover:bg-emerald-500 text-white border-transparent">
                    <Play className="w-3 h-3 mr-1" />
                    Run
                  </Button>
                )}
                <Button size="sm" onClick={() => onEditWorkflow(workflow.id)}>
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // List View
  return (
    <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-4 p-4 border-b border-border/50 bg-muted/30 text-sm font-medium">
        <div className="col-span-4">Workflow</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2">Created</div>
        <div className="col-span-2">Updated</div>
        <div className="col-span-2">Actions</div>
      </div>

      {/* Table Rows */}
      {filteredWorkflows.map((workflow) => (
        <div key={workflow.id} className="grid grid-cols-12 gap-4 p-4 border-b border-border/50 hover:bg-muted/30 transition-colors">
          <div className="col-span-4">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${statusColors[workflow.status || 'draft'] || 'bg-gray-500'}`} />
              <div>
                <div className="font-medium">
                  {editingId === workflow.id ? (
                    <Input
                      ref={(el) => { editInputRef.current = el; }}
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitInlineRename();
                        if (e.key === 'Escape') cancelInlineRename();
                      }}
                      onBlur={commitInlineRename}
                      autoFocus
                      disabled={savingId === workflow.id}
                      className="w-full bg-transparent !border-0 focus:!border-0 focus-visible:!ring-0 focus-visible:!ring-offset-0 !p-0 !m-0 !h-auto text-base font-medium leading-tight truncate"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => startInlineRename(workflow)}
                      className="text-left hover:underline underline-offset-2 decoration-dotted focus:outline-none"
                      title="Rename workflow"
                    >
                      {workflow.name}
                    </button>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">{workflow.description}</div>
              </div>
            </div>
          </div>
          <div className="col-span-2">
            <Badge variant="secondary">
              {statusLabels[workflow.status || 'draft'] || 'Draft'}
            </Badge>
          </div>
          <div className="col-span-2 text-sm">{fmtDate(workflow.createdAt)}</div>
          <div className="col-span-2 text-sm">{fmt(workflow.updatedAt)}</div>
          <div className="col-span-2">
            <div className="flex gap-1">
              {workflow.status === 'active' ? (
                <Button size="sm" variant="outline">
                  <Pause className="w-3 h-3" />
                </Button>
              ) : (
                <Button size="sm" className="bg-emerald-500/80 hover:bg-emerald-500 text-white border-transparent">
                  <Play className="w-3 h-3" />
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => onEditWorkflow(workflow.id)}>
                <Edit className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="ghost">
                <Copy className="w-3 h-3" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost">
                    <MoreHorizontal className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => startInlineRename(workflow)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onSelect={() => deleteNow(workflow.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      ))}

    </div>
  );
}
