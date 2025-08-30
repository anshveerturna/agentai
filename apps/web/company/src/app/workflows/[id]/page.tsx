'use client';

import { useParams } from 'next/navigation';
import { WorkflowCanvas } from '@/components/workflows/WorkflowCanvas';

export default function WorkflowPage() {
  const params = useParams();
  const workflowId = params.id as string;

  const handleBack = () => {
    window.history.back();
  };

  return (
    <div className="h-screen bg-background">
      <WorkflowCanvas 
        onBack={handleBack}
        isCodeView={false}
        onToggleCodeView={() => {}}
      />
    </div>
  );
}
