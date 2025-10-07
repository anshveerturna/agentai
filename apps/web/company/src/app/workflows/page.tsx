import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { WorkflowTemplates } from '@/components/workflows/WorkflowTemplates';
import { Suspense } from 'react';
import WorkflowsClientShell from '@/components/workflows/WorkflowsClientShell';
import { listWorkflows } from '@/lib/workflows.client';

export const dynamic = 'force-dynamic';

export default async function WorkflowsPage() {
  // Prefetch workflows on server for faster first paint
  let initialWorkflows = [] as any[];
  try {
    initialWorkflows = await listWorkflows();
  } catch {
    // swallow; client will revalidate
  }
  return (
    <DashboardLayout>
      <Suspense>
        <WorkflowsClientShell initialWorkflows={initialWorkflows} />
      </Suspense>
    </DashboardLayout>
  );
}
