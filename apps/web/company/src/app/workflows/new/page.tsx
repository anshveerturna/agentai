"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createWorkflow } from '@/lib/workflows.client';

export default function NewWorkflowRedirect() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const wf = await createWorkflow({ name: 'Untitled Workflow' });
        if (!cancelled) router.replace(`/workflows/${wf.id}`);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { cancelled = true; };
  }, [router]);
  if (error) {
    return <div className="p-6 text-sm text-destructive">Failed to create workflow: {error}</div>;
  }
  return <div className="p-6 text-sm text-muted-foreground">Creating workflow...</div>;
}
