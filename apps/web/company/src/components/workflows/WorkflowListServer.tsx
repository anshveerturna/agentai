import { listWorkflows, type Workflow } from '@/lib/workflows.client';
import WorkflowListClient from './WorkflowListClient';

// Server Component: fetch initial workflows (no caching to always show fresh on navigation)
export default async function WorkflowListServer({
  searchQuery,
  viewMode,
  onEditWorkflow,
}: {
  searchQuery: string;
  viewMode: 'grid' | 'list';
  onEditWorkflow: (id: string) => void;
}) {
  let initial: Workflow[] = [];
  try {
    // server environment - listWorkflows falls back to direct API host
    initial = await listWorkflows();
  } catch {
    // swallow; client will retry via SWR
  }
  return (
    <WorkflowListClient
      initialWorkflows={initial}
      searchQuery={searchQuery}
      viewMode={viewMode}
      onEditWorkflow={onEditWorkflow}
    />
  );
}
