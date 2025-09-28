import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, MoreHorizontal, Copy, Edit, Trash2, Calendar, Clock, Loader2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listWorkflows } from '@/lib/workflows.client';

interface WorkflowListProps {
  searchQuery: string;
  viewMode: 'grid' | 'list';
  onEditWorkflow: () => void;
}
// Shape adapter: map API workflows to the UI's expected fields while preserving UI appearance.
function toUiWorkflows(api: any[]): Array<{
  id: string; name: string; description?: string; status: 'active'|'paused'|'error'|'draft'; lastRun: string; created?: string; runs: number; success_rate: number; tags: string[];
}> {
  return (api || []).map((w) => ({
    id: String(w.id),
    name: w.name || 'Untitled Workflow',
    description: w.description || '',
    status: (w.status as any) || 'draft',
    lastRun: w.updatedAt ? new Date(w.updatedAt).toLocaleString() : '—',
    created: w.createdAt,
    runs: (w.runsCount as number) || 0,
    success_rate: (w.successRate as number) || 100,
    tags: Array.isArray((w.tags as any)) ? (w.tags as string[]) : [],
  }))
}

const statusColors = {
  active: 'bg-green-500',
  paused: 'bg-yellow-500',
  error: 'bg-red-500',
  draft: 'bg-gray-500',
};

const statusLabels = {
  active: 'Active',
  paused: 'Paused',
  error: 'Error',
  draft: 'Draft',
};

export function WorkflowList({ searchQuery, viewMode, onEditWorkflow }: WorkflowListProps) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['workflows'],
    queryFn: listWorkflows,
    staleTime: 5_000,
    refetchOnWindowFocus: false,
  })

  const uiWorkflows = toUiWorkflows(data || [])
  const filteredWorkflows = uiWorkflows.filter(workflow =>
    workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    workflow.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    workflow.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading workflows…
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-between p-4 rounded-md border border-destructive/40 bg-destructive/5 text-destructive">
        <div>Error loading workflows: {(error as Error).message}</div>
        <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
      </div>
    )
  }

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredWorkflows.map((workflow) => (
          <div key={workflow.id} className="group bg-card rounded-xl border border-border/50 p-6 hover:border-border hover:shadow-lg transition-all duration-200">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${statusColors[workflow.status as keyof typeof statusColors]}`} />
                <div>
                  <h3 className="font-semibold text-lg">{workflow.name}</h3>
                  <Badge variant="secondary" className="mt-1">
                    {statusLabels[workflow.status as keyof typeof statusLabels]}
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

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-2xl font-bold">{workflow.runs}</div>
                <div className="text-xs text-muted-foreground">Total Runs</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{workflow.success_rate}%</div>
                <div className="text-xs text-muted-foreground">Success Rate</div>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1 mb-4">
              {workflow.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {workflow.lastRun}
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
                <Button size="sm" onClick={onEditWorkflow}>
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
        <div className="col-span-2">Last Run</div>
        <div className="col-span-2">Success Rate</div>
        <div className="col-span-1">Runs</div>
        <div className="col-span-1">Actions</div>
      </div>

      {/* Table Rows */}
      {filteredWorkflows.map((workflow) => (
        <div key={workflow.id} className="grid grid-cols-12 gap-4 p-4 border-b border-border/50 hover:bg-muted/30 transition-colors">
          <div className="col-span-4">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${statusColors[workflow.status as keyof typeof statusColors]}`} />
              <div>
                <div className="font-medium">{workflow.name}</div>
                <div className="text-sm text-muted-foreground">{workflow.description}</div>
              </div>
            </div>
          </div>
          <div className="col-span-2">
            <Badge variant="secondary">
              {statusLabels[workflow.status as keyof typeof statusLabels]}
            </Badge>
          </div>
          <div className="col-span-2 text-sm">{workflow.lastRun}</div>
          <div className="col-span-2">
            <span className="text-green-600 font-medium">{workflow.success_rate}%</span>
          </div>
          <div className="col-span-1 font-medium">{workflow.runs}</div>
          <div className="col-span-1">
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={onEditWorkflow}>
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
