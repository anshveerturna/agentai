'use client';

import { useParams } from 'next/navigation';
import { WorkflowCanvas } from '@/components/workflows/WorkflowCanvas';
import { Sidebar } from '@/components/layout/Sidebar';

export default function WorkflowPage() {
  const params = useParams();
  const workflowId = params.id as string;

  const handleBack = () => {
    window.history.back();
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* Builder canvas replaces global header */}
        <div className="flex-1 min-h-0">
          <WorkflowCanvas 
            workflowId={workflowId}
            onBack={handleBack}
            isCodeView={false}
            onToggleCodeView={() => {}}
          />
        </div>
      </div>
    </div>
  );
}
