"use client";

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { WorkflowCanvas } from '@/components/workflows/WorkflowCanvas';

export default function WorkflowPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string | undefined;
  const [isCodeView, setIsCodeView] = useState(false);

  function handleBack() {
    router.push('/workflows');
  }

  return (
    <div className="h-screen bg-background">
      <WorkflowCanvas
        onBack={handleBack}
        isCodeView={isCodeView}
        onToggleCodeView={() => setIsCodeView(v => !v)}
      />
    </div>
  );
}
