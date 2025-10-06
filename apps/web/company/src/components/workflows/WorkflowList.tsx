import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, MoreHorizontal, Copy, Edit, Clock, RefreshCw, AlertTriangle } from 'lucide-react';
import { listWorkflows, type Workflow } from '@/lib/workflows.client';

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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listWorkflows()
      .then(data => { if (!cancelled) { setItems(data); } })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshIndex]);

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
                  <h3 className="font-semibold text-lg">{workflow.name}</h3>
                  <Badge variant="secondary" className="mt-1">
                    {statusLabels[workflow.status || 'draft'] || 'Draft'}
                  </Badge>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
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
                  <Button size="sm" variant="outline">
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
                <div className="font-medium">{workflow.name}</div>
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
              <Button size="sm" variant="ghost" onClick={() => onEditWorkflow(workflow.id)}>
                <Edit className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="ghost">
                <Copy className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="ghost">
                <MoreHorizontal className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
